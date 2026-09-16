import type {
  Expense,
  ExpenseItem,
  ExpenseParticipant,
  ExpensePayer,
  Group,
  Member,
  Settlement,
} from '../types'
import { getSupabase } from '../supabase/client'
import { colorForIndex } from '../format'
import { randomGroupEmoji } from '../groupFactory'
import { ConflictError } from './errors'
import type { GroupRepository } from './repository'

// ── Row types ───────────────────────────────────────────────────────────
type GroupRow = {
  id: string
  owner_id: string
  name: string
  emoji: string | null
  base_currency: string
  settlement_method: 'smart_settle' | 'maximize_reduction'
  created_at: string
  updated_at: string
}
type MemberRow = {
  id: string
  group_id: string
  user_id: string | null
  name: string
  color: string | null
  role: 'owner' | 'member'
  bank_code: string | null
  bank_account_number: string | null
  bank_account_name: string | null
}
type ExpenseRow = {
  id: string
  group_id: string
  title: string
  note: string | null
  paid_at: string
  split_mode: Expense['splitMode']
  amount_base: number | string
  currency: string | null
  amount_original: number | string | null
  exchange_rate: number | string | null
  created_by: string | null
  version: number
}

const GROUP_COLS = 'id,owner_id,name,emoji,base_currency,settlement_method,created_at,updated_at'
const MEMBER_COLS = 'id,group_id,user_id,name,color,role,bank_code,bank_account_number,bank_account_name'
const EXPENSE_COLS = 'id,group_id,title,note,paid_at,split_mode,amount_base,currency,amount_original,exchange_rate,created_by,version'
const SETTLEMENT_COLS_V2 =
  'id,group_id,from_member_id,to_member_id,amount,status,payment_method,created_at,confirmed_at,proof_storage_path,proof_mime_type,proof_file_name,proof_size_bytes'
const SETTLEMENT_COLS_V1 = 'id,group_id,from_member_id,to_member_id,amount,status,created_at,confirmed_at'
const LEGACY_SETTLEMENT_COLUMNS = [
  'payment_method',
  'proof_storage_path',
  'proof_mime_type',
  'proof_file_name',
  'proof_size_bytes',
]

function mapMember(r: MemberRow, avatars: Map<string, string>): Member {
  return {
    id: r.id,
    name: r.name,
    color: r.color ?? undefined,
    bankCode: r.bank_code ?? undefined,
    bankAccountNumber: r.bank_account_number ?? undefined,
    bankAccountName: r.bank_account_name ?? undefined,
    userId: r.user_id,
    role: r.role,
    avatarUrl: r.user_id ? avatars.get(r.user_id) : undefined,
  }
}

function assembleGroup(
  g: GroupRow,
  members: MemberRow[],
  avatars: Map<string, string>,
  expensesByGroup: Map<string, Expense[]>,
  settlementsByGroup: Map<string, Settlement[]>,
): Group {
  return {
    id: g.id,
    name: g.name,
    emoji: g.emoji ?? undefined,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    settlementMethod: g.settlement_method,
    ownerId: g.owner_id,
    baseCurrency: g.base_currency,
    members: members.filter((m) => m.group_id === g.id).map((m) => mapMember(m, avatars)),
    expenses: expensesByGroup.get(g.id) ?? [],
    settlements: settlementsByGroup.get(g.id) ?? [],
  }
}

function isPersistedId(id: string): boolean {
  return !id.startsWith('mem_')
}

async function fetchAvatars(userIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((x): x is string => Boolean(x)))]
  const map = new Map<string, string>()
  if (ids.length === 0) return map
  const { data, error } = await getSupabase().from('profiles').select('id,avatar_url').in('id', ids)
  if (error) return map
  for (const row of data ?? []) {
    const r = row as { id: string; avatar_url: string | null }
    if (r.avatar_url) map.set(r.id, r.avatar_url)
  }
  return map
}

/** Tải toàn bộ khoản chi (+ payers/participants/items) cho các nhóm, gom theo group_id. */
async function loadExpensesByGroup(groupIds: string[]): Promise<Map<string, Expense[]>> {
  const map = new Map<string, Expense[]>()
  if (groupIds.length === 0) return map
  const sb = getSupabase()

  const { data: exData, error } = await sb
    .from('expenses')
    .select(EXPENSE_COLS)
    .in('group_id', groupIds)
    .order('paid_at', { ascending: false })
  if (error) throw error
  const expenses = (exData ?? []) as ExpenseRow[]
  if (expenses.length === 0) return map
  const exIds = expenses.map((e) => e.id)

  const [payersRes, partsRes, itemsRes] = await Promise.all([
    sb.from('expense_payers').select('expense_id,member_id,amount').in('expense_id', exIds),
    sb.from('expense_participants').select('expense_id,member_id,split_value').in('expense_id', exIds),
    sb.from('expense_items').select('id,expense_id,title,amount').in('expense_id', exIds),
  ])
  if (payersRes.error) throw payersRes.error
  if (partsRes.error) throw partsRes.error
  if (itemsRes.error) throw itemsRes.error

  const itemRows = (itemsRes.data ?? []) as { id: string; expense_id: string; title: string; amount: number | string }[]
  const itemIds = itemRows.map((i) => i.id)
  const itemPartsRes = itemIds.length
    ? await sb.from('expense_item_participants').select('item_id,member_id').in('item_id', itemIds)
    : { data: [], error: null }
  if (itemPartsRes.error) throw itemPartsRes.error

  // Gom dòng con theo expense / item.
  const payersByEx = new Map<string, ExpensePayer[]>()
  for (const r of (payersRes.data ?? []) as { expense_id: string; member_id: string; amount: number | string }[]) {
    const list = payersByEx.get(r.expense_id) ?? []
    list.push({ memberId: r.member_id, amount: Number(r.amount) })
    payersByEx.set(r.expense_id, list)
  }
  const partsByEx = new Map<string, ExpenseParticipant[]>()
  for (const r of (partsRes.data ?? []) as { expense_id: string; member_id: string; split_value: number | string | null }[]) {
    const list = partsByEx.get(r.expense_id) ?? []
    list.push({ memberId: r.member_id, splitValue: r.split_value == null ? undefined : Number(r.split_value) })
    partsByEx.set(r.expense_id, list)
  }
  const itemPartsByItem = new Map<string, string[]>()
  for (const r of (itemPartsRes.data ?? []) as { item_id: string; member_id: string }[]) {
    const list = itemPartsByItem.get(r.item_id) ?? []
    list.push(r.member_id)
    itemPartsByItem.set(r.item_id, list)
  }
  const itemsByEx = new Map<string, ExpenseItem[]>()
  for (const it of itemRows) {
    const list = itemsByEx.get(it.expense_id) ?? []
    list.push({
      id: it.id,
      title: it.title,
      amount: Number(it.amount),
      participants: (itemPartsByItem.get(it.id) ?? []).map((memberId) => ({ memberId })),
    })
    itemsByEx.set(it.expense_id, list)
  }

  for (const e of expenses) {
    const expense: Expense = {
      id: e.id,
      groupId: e.group_id,
      title: e.title,
      amount: Number(e.amount_base),
      note: e.note ?? undefined,
      paidAt: e.paid_at,
      splitMode: e.split_mode,
      payers: payersByEx.get(e.id) ?? [],
      participants: partsByEx.get(e.id) ?? [],
      items: itemsByEx.get(e.id),
      version: e.version,
      createdByMemberId: e.created_by,
      currency: e.currency ?? 'VND',
      amountOriginal: e.amount_original == null ? undefined : Number(e.amount_original),
      exchangeRate: e.exchange_rate == null ? undefined : Number(e.exchange_rate),
    }
    const list = map.get(e.group_id) ?? []
    list.push(expense)
    map.set(e.group_id, list)
  }
  return map
}

type SettlementRow = {
  id: string
  group_id: string
  from_member_id: string
  to_member_id: string
  amount: number | string
  status: Settlement['status']
  payment_method: 'bank_transfer' | 'other' | null
  created_at: string
  confirmed_at: string | null
  proof_storage_path: string | null
  proof_mime_type: string | null
  proof_file_name: string | null
  proof_size_bytes: number | null
}

async function loadSettlementsByGroup(groupIds: string[]): Promise<Map<string, Settlement[]>> {
  const map = new Map<string, Settlement[]>()
  if (groupIds.length === 0) return map
  const sb = getSupabase()
  const primary = await sb
    .from('settlements')
    .select(SETTLEMENT_COLS_V2)
    .in('group_id', groupIds)
    .neq('status', 'cancelled')
  const fallback =
    primary.error && isLegacySettlementSchemaError(primary.error)
      ? await sb.from('settlements').select(SETTLEMENT_COLS_V1).in('group_id', groupIds).neq('status', 'cancelled')
      : null
  const data = fallback ? fallback.data : primary.data
  const error = fallback ? fallback.error : primary.error
  if (error) throw error
  for (const r of (data ?? []) as SettlementRow[]) {
    const st: Settlement = {
      id: r.id,
      groupId: r.group_id,
      fromMemberId: r.from_member_id,
      toMemberId: r.to_member_id,
      amount: Number(r.amount),
      status: r.status,
      paymentMethod: r.payment_method ?? 'bank_transfer',
      createdAt: r.created_at,
      confirmedAt: r.confirmed_at ?? undefined,
      proofStoragePath: r.proof_storage_path ?? undefined,
      proofMimeType: r.proof_mime_type ?? undefined,
      proofFileName: r.proof_file_name ?? undefined,
      proofSizeBytes: r.proof_size_bytes ?? undefined,
    }
    const list = map.get(r.group_id) ?? []
    list.push(st)
    map.set(r.group_id, list)
  }
  return map
}

async function loadSettlementsByGroupSafe(groupIds: string[]): Promise<Map<string, Settlement[]>> {
  try {
    return await loadSettlementsByGroup(groupIds)
  } catch {
    // Không để một lỗi phụ ở settlements làm rơi toàn bộ danh sách nhóm.
    return new Map<string, Settlement[]>()
  }
}

function isLegacySettlementSchemaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { message?: unknown; details?: unknown; hint?: unknown }
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()
  return LEGACY_SETTLEMENT_COLUMNS.some((column) => text.includes(column))
}

export class SupabaseGroupRepository implements GroupRepository {
  readonly mode = 'cloud' as const

  async list(): Promise<Group[]> {
    const sb = getSupabase()
    const { data: groups, error } = await sb
      .from('groups')
      .select(GROUP_COLS)
      .order('updated_at', { ascending: false })
    if (error) throw error
    const rows = (groups ?? []) as GroupRow[]
    if (rows.length === 0) return []

    const ids = rows.map((g) => g.id)
    const { data: members, error: mErr } = await sb
      .from('group_members')
      .select(MEMBER_COLS)
      .in('group_id', ids)
    if (mErr) throw mErr
    const memberRows = (members ?? []) as MemberRow[]
    const [avatars, expensesByGroup, settlementsByGroup] = await Promise.all([
      fetchAvatars(memberRows.map((m) => m.user_id)),
      loadExpensesByGroup(ids),
      loadSettlementsByGroupSafe(ids),
    ])
    return rows.map((g) => assembleGroup(g, memberRows, avatars, expensesByGroup, settlementsByGroup))
  }

  async get(id: string): Promise<Group | null> {
    const sb = getSupabase()
    const { data: g, error } = await sb.from('groups').select(GROUP_COLS).eq('id', id).maybeSingle()
    if (error) throw error
    if (!g) return null
    const { data: members, error: mErr } = await sb
      .from('group_members')
      .select(MEMBER_COLS)
      .eq('group_id', id)
    if (mErr) throw mErr
    const memberRows = (members ?? []) as MemberRow[]
    const [avatars, expensesByGroup, settlementsByGroup] = await Promise.all([
      fetchAvatars(memberRows.map((m) => m.user_id)),
      loadExpensesByGroup([id]),
      loadSettlementsByGroupSafe([id]),
    ])
    return assembleGroup(g as GroupRow, memberRows, avatars, expensesByGroup, settlementsByGroup)
  }

  async createGroup(name: string, memberNames: string[]): Promise<Group> {
    const sb = getSupabase()
    const { data: groupId, error } = await sb.rpc('create_group', {
      p_name: name,
      p_emoji: randomGroupEmoji(),
    })
    if (error) throw error
    const id = groupId as string

    const names = memberNames.map((n) => n.trim()).filter(Boolean)
    if (names.length) {
      const rows = names.map((n, i) => ({
        group_id: id,
        name: n,
        color: colorForIndex(i + 1),
        role: 'member' as const,
      }))
      const { error: insErr } = await sb.from('group_members').insert(rows)
      if (insErr) throw insErr
    }

    const created = await this.get(id)
    if (!created) throw new Error('Không tải được nhóm vừa tạo.')
    return created
  }

  async save(group: Group, removedMemberIds: string[] = []): Promise<void> {
    const sb = getSupabase()
    const { error: gErr } = await sb
      .from('groups')
      .update({
        name: group.name,
        emoji: group.emoji ?? null,
        settlement_method: group.settlementMethod,
        base_currency: group.baseCurrency ?? 'VND',
      })
      .eq('id', group.id)
    if (gErr) throw gErr

    // Thêm thành viên mới (id chưa lưu).
    const toInsert = group.members.filter((m) => !isPersistedId(m.id))
    if (toInsert.length) {
      const rows = toInsert.map((m) => ({
        group_id: group.id,
        name: m.name,
        color: m.color ?? null,
        role: 'member' as const,
        bank_code: m.bankCode ?? null,
        bank_account_number: m.bankAccountNumber ?? null,
        bank_account_name: m.bankAccountName ?? null,
      }))
      const { error } = await sb.from('group_members').insert(rows)
      if (error) throw error
    }

    // Cập nhật thành viên đã có.
    for (const m of group.members.filter((m) => isPersistedId(m.id))) {
      const { error } = await sb
        .from('group_members')
        .update({
          name: m.name,
          color: m.color ?? null,
          bank_code: m.bankCode ?? null,
          bank_account_number: m.bankAccountNumber ?? null,
          bank_account_name: m.bankAccountName ?? null,
        })
        .eq('id', m.id)
      if (error) throw error
    }

    // Xoá ĐÚNG các thành viên người dùng chủ động bỏ (không suy từ diff DB → tránh
    // xoá nhầm member người khác vừa thêm đồng thời). Chỉ id đã lưu (uuid).
    const toDelete = removedMemberIds.filter(isPersistedId)
    if (toDelete.length) {
      const { error } = await sb.from('group_members').delete().in('id', toDelete)
      if (error) throw error
    }
  }

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase().from('groups').delete().eq('id', id)
    if (error) throw error
  }

  async saveExpense(groupId: string, expense: Expense): Promise<{ id: string; version: number }> {
    const sb = getSupabase()
    const existing = expense.version != null
    const { data, error } = await sb.rpc('upsert_expense', {
      p_group_id: groupId,
      p_expense_id: existing ? expense.id : null,
      p_title: expense.title,
      p_note: expense.note ?? null,
      p_paid_at: expense.paidAt,
      p_split_mode: expense.splitMode,
      p_amount: expense.amount,
      p_currency: expense.currency ?? 'VND',
      p_amount_original: expense.amountOriginal ?? null,
      p_exchange_rate: expense.exchangeRate ?? null,
      p_category: null,
      p_payers: expense.payers.map((p) => ({ member_id: p.memberId, amount: p.amount })),
      p_participants: expense.participants.map((p) => ({
        member_id: p.memberId,
        split_value: p.splitValue ?? null,
      })),
      p_items: (expense.items ?? []).map((it) => ({
        title: it.title,
        amount: it.amount,
        members: it.participants.map((pp) => pp.memberId),
      })),
      p_expected_version: expense.version ?? null,
    })
    if (error) {
      if (error.message?.includes('CONFLICT')) throw new ConflictError()
      throw error
    }
    const row = (Array.isArray(data) ? data[0] : data) as { expense_id: string; version: number }
    return { id: row.expense_id, version: row.version }
  }

  async removeExpense(_groupId: string, expenseId: string, version?: number): Promise<void> {
    let q = getSupabase().from('expenses').delete().eq('id', expenseId)
    if (version != null) q = q.eq('version', version)
    const { data, error } = await q.select('id')
    if (error) throw error
    // version != null mà không xoá được row nào = đã bị sửa/xoá nơi khác → báo tải lại.
    if (version != null && (data ?? []).length === 0) throw new ConflictError()
  }

  async createSettlement(
    groupId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number,
  ): Promise<string> {
    const { data, error } = await getSupabase().rpc('create_settlement', {
      p_group_id: groupId,
      p_from_member: fromMemberId,
      p_to_member: toMemberId,
      p_amount: amount,
    })
    if (error) throw error
    if (typeof data !== 'string' || !data) throw new Error('Không lấy được mã quyết toán vừa tạo.')
    return data
  }

  async confirmSettlement(_groupId: string, settlementId: string): Promise<void> {
    const { error } = await getSupabase().rpc('confirm_settlement', { p_id: settlementId })
    if (error) throw error
  }

  async cancelSettlement(_groupId: string, settlementId: string): Promise<void> {
    const { error } = await getSupabase().rpc('cancel_settlement', { p_id: settlementId })
    if (error) throw error
  }
}
