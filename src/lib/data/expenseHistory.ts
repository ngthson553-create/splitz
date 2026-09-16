import { getSupabase } from '../supabase/client'
import {
  parseExpenseHistoryEntry,
  type ExpenseHistoryAction,
  type ExpenseHistoryEntry,
} from '../expenseHistory'

const LOCAL_KEY = 'splitz.expenseHistory.v1'
const MAX_LOCAL_ITEMS = 500

type Mode = 'local' | 'cloud'

type ActivityRow = {
  id: string
  group_id: string
  actor_user_id: string | null
  action: string
  target_id: string | null
  snapshot: unknown
  created_at: string
}

function readLocal(): ExpenseHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(parseExpenseHistoryEntry).filter((x): x is ExpenseHistoryEntry => Boolean(x))
  } catch {
    return []
  }
}

function writeLocal(items: ExpenseHistoryEntry[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, MAX_LOCAL_ITEMS)))
}

function action(value: string): ExpenseHistoryAction {
  if (value === 'expense.create' || value === 'expense.update' || value === 'expense.delete') return value
  return 'expense.update'
}

function fromActivityRow(row: ActivityRow): ExpenseHistoryEntry | null {
  const snapshot = row.snapshot as { entry?: unknown } | null
  const parsed = parseExpenseHistoryEntry(snapshot?.entry)
  if (parsed) {
    return {
      ...parsed,
      id: row.id,
      createdAt: row.created_at,
      actorUserId: row.actor_user_id ?? parsed.actorUserId,
    }
  }
  if (!row.target_id) return null
  return {
    id: row.id,
    groupId: row.group_id,
    expenseId: row.target_id,
    action: action(row.action),
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
    summary: 'Đã cập nhật khoản chi',
    changes: [],
  }
}

export async function recordExpenseHistory(mode: Mode, entry: ExpenseHistoryEntry): Promise<void> {
  try {
    if (mode === 'local') {
      writeLocal([entry, ...readLocal()])
      return
    }
    await getSupabase().from('activity_log').insert({
      group_id: entry.groupId,
      actor_user_id: entry.actorUserId ?? null,
      action: entry.action,
      target_type: 'expense',
      target_id: entry.expenseId,
      snapshot: { entry },
    })
  } catch {
    // Lịch sử là lớp minh bạch phụ trợ; không làm hỏng thao tác chính nếu ghi log lỗi.
  }
}

export async function listExpenseHistory(
  mode: Mode,
  groupId: string,
  expenseId: string,
): Promise<ExpenseHistoryEntry[]> {
  if (mode === 'local') {
    return readLocal()
      .filter((item) => item.groupId === groupId && item.expenseId === expenseId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  const { data, error } = await getSupabase()
    .from('activity_log')
    .select('id,group_id,actor_user_id,action,target_id,snapshot,created_at')
    .eq('group_id', groupId)
    .eq('target_type', 'expense')
    .eq('target_id', expenseId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as ActivityRow[])
    .map(fromActivityRow)
    .filter((x): x is ExpenseHistoryEntry => Boolean(x))
}
