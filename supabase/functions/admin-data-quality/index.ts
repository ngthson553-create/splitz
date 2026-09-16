// Console Admin Data Quality scanner (verify_jwt=true).
// Reads business tables with service role after checking admin_users, stores
// scan metadata, and never performs cleanup/mutation on business data.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_GROUPS = 500
const MAX_EXPENSES = 500
const MAX_REDEEM_CODES = 500
const MAX_DELIVERIES = 1000
const SCANNERS_RUN = 6

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'snapshot'
type Severity = 'critical' | 'warning' | 'info'

type RequestBody = {
  action?: Action
}

type Actor = {
  userId: string
  email: string | null
  role: string
}

type Issue = {
  id: string
  scanner: string
  severity: Severity
  title: string
  detail: string | null
  target_type: string | null
  target_id: string | null
  detected_at: string
  metadata: Record<string, unknown>
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function cleanText(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(n) ? n : 0
}

function sanitizeError(value: unknown): string {
  const text = value instanceof Error ? value.message : cleanText(value) ?? 'unknown_error'
  return text.replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]').slice(0, 2000)
}

function issueKey(issue: Omit<Issue, 'id'>): string {
  return [issue.scanner, issue.target_type ?? 'system', issue.target_id ?? 'global'].join(':')
}

function makeIssue(input: Omit<Issue, 'id'>): Issue {
  return { ...input, id: issueKey(input) }
}

function scannerError(scanner: string, error: unknown, checkedAt: string): Issue {
  return makeIssue({
    scanner: 'scanner_error',
    severity: 'warning',
    title: `Scanner ${scanner} không chạy trọn vẹn`,
    detail: sanitizeError(error),
    target_type: 'scanner',
    target_id: scanner,
    detected_at: checkedAt,
    metadata: { scanner },
  })
}

function countBy(rows: Record<string, unknown>[], key: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const value = cleanText(row[key])
    if (!value) continue
    map.set(value, (map.get(value) ?? 0) + 1)
  }
  return map
}

async function getActor(jwt: string): Promise<Actor> {
  const { data: u, error } = await admin.auth.getUser(jwt)
  if (error || !u.user) throw new HttpError(401, 'Unauthorized')

  const { data: row } = await admin
    .from('admin_users')
    .select('role,status')
    .eq('user_id', u.user.id)
    .maybeSingle()
  if (!row || row.status !== 'active') throw new HttpError(403, 'Forbidden')
  return { userId: u.user.id, email: u.user.email ?? null, role: row.role as string }
}

async function writeAudit(
  actor: Actor,
  status: 'success' | 'failed',
  payload: Record<string, unknown>,
  errorMessage?: string | null,
) {
  await admin.from('admin_audit_logs').insert({
    actor_user_id: actor.userId,
    actor_email: actor.email,
    actor_role: actor.role,
    action: 'data_quality.scan',
    target_type: 'data_quality',
    target_id: cleanText(payload.scan_id) ?? 'scan',
    payload_summary: payload,
    status,
    error_message: errorMessage ? sanitizeError(errorMessage) : null,
  })
}

async function scanGroupsWithoutOwner(checkedAt: string): Promise<Issue[]> {
  const { data: groups, error } = await admin
    .from('groups')
    .select('id,owner_id,name,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(MAX_GROUPS)
  if (error) return [scannerError('groups_without_owner', error.message, checkedAt)]

  const rows = (groups ?? []) as Record<string, unknown>[]
  const groupIds = rows.map((row) => cleanText(row.id)).filter((id): id is string => Boolean(id))
  if (groupIds.length === 0) return []

  const { data: members, error: membersError } = await admin
    .from('group_members')
    .select('group_id,user_id,role')
    .in('group_id', groupIds)
    .limit(MAX_GROUPS * 20)
  if (membersError) return [scannerError('groups_without_owner', membersError.message, checkedAt)]

  const memberRows = (members ?? []) as Record<string, unknown>[]
  return rows.flatMap((group) => {
    const groupId = cleanText(group.id)
    const ownerId = cleanText(group.owner_id)
    if (!groupId || !ownerId) return []
    const groupMembers = memberRows.filter((member) => cleanText(member.group_id) === groupId)
    const hasOwnerMember = groupMembers.some((member) => cleanText(member.role) === 'owner' && cleanText(member.user_id) === ownerId)
    const hasAnyOwnerRole = groupMembers.some((member) => cleanText(member.role) === 'owner')
    if (hasOwnerMember && hasAnyOwnerRole) return []
    return [makeIssue({
      scanner: 'groups_without_owner',
      severity: 'critical',
      title: 'Group không có owner member hợp lệ',
      detail: `Nhóm ${cleanText(group.name) ?? groupId} có owner_id nhưng thiếu member role owner khớp user.`,
      target_type: 'group',
      target_id: groupId,
      detected_at: checkedAt,
      metadata: { owner_id: ownerId, has_any_owner_role: hasAnyOwnerRole, member_count: groupMembers.length },
    })]
  })
}

async function scanExpensesMissingParty(checkedAt: string): Promise<Issue[]> {
  const { data: expenses, error } = await admin
    .from('expenses')
    .select('id,group_id,title,amount_base,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(MAX_EXPENSES)
  if (error) return [scannerError('expenses_missing_party', error.message, checkedAt)]

  const rows = (expenses ?? []) as Record<string, unknown>[]
  const expenseIds = rows.map((row) => cleanText(row.id)).filter((id): id is string => Boolean(id))
  if (expenseIds.length === 0) return []

  const [payers, participants] = await Promise.all([
    admin.from('expense_payers').select('expense_id').in('expense_id', expenseIds).limit(MAX_EXPENSES * 10),
    admin.from('expense_participants').select('expense_id').in('expense_id', expenseIds).limit(MAX_EXPENSES * 20),
  ])
  if (payers.error) return [scannerError('expenses_missing_party', payers.error.message, checkedAt)]
  if (participants.error) return [scannerError('expenses_missing_party', participants.error.message, checkedAt)]

  const payerCount = countBy((payers.data ?? []) as Record<string, unknown>[], 'expense_id')
  const participantCount = countBy((participants.data ?? []) as Record<string, unknown>[], 'expense_id')

  return rows.flatMap((expense) => {
    const expenseId = cleanText(expense.id)
    if (!expenseId) return []
    const missingPayer = (payerCount.get(expenseId) ?? 0) === 0
    const missingParticipant = (participantCount.get(expenseId) ?? 0) === 0
    if (!missingPayer && !missingParticipant) return []
    const title = cleanText(expense.title) ?? expenseId
    return [makeIssue({
      scanner: 'expenses_missing_party',
      severity: 'critical',
      title: missingPayer && missingParticipant ? 'Expense thiếu payer và participant' : missingPayer ? 'Expense thiếu payer' : 'Expense thiếu participant',
      detail: `Khoản chi ${title} không đủ dữ liệu để tính công nợ chính xác.`,
      target_type: 'expense',
      target_id: expenseId,
      detected_at: checkedAt,
      metadata: {
        group_id: cleanText(expense.group_id),
        amount_base: numberValue(expense.amount_base),
        payer_count: payerCount.get(expenseId) ?? 0,
        participant_count: participantCount.get(expenseId) ?? 0,
      },
    })]
  })
}

async function scanExpiredActiveSubscriptions(checkedAt: string): Promise<Issue[]> {
  const { data, error } = await admin
    .from('subscriptions')
    .select('user_id,plan,status,period_end,source,updated_at')
    .eq('status', 'active')
    .lt('period_end', checkedAt)
    .limit(100)
  if (error) return [scannerError('expired_active_subscription', error.message, checkedAt)]

  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const userId = cleanText(row.user_id)
    if (!userId) return []
    return [makeIssue({
      scanner: 'expired_active_subscription',
      severity: 'critical',
      title: 'Subscription hết hạn nhưng vẫn active',
      detail: `User ${userId} có period_end trong quá khứ nhưng status vẫn active.`,
      target_type: 'subscription',
      target_id: userId,
      detected_at: checkedAt,
      metadata: { plan: cleanText(row.plan), period_end: cleanText(row.period_end), source: cleanText(row.source) },
    })]
  })
}

async function scanStalePendingPayments(checkedAt: string): Promise<Issue[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
  const { data, error } = await admin
    .from('payment_orders')
    .select('order_code,user_id,plan,cycle,amount,status,created_at')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) return [scannerError('stale_pending_payment', error.message, checkedAt)]

  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const orderCode = cleanText(row.order_code)
    if (!orderCode) return []
    return [makeIssue({
      scanner: 'stale_pending_payment',
      severity: 'warning',
      title: 'Payment order pending quá 24 giờ',
      detail: `Đơn PayOS ${orderCode} vẫn pending quá 24 giờ, cần kiểm webhook hoặc trạng thái thanh toán.`,
      target_type: 'payment_order',
      target_id: orderCode,
      detected_at: checkedAt,
      metadata: {
        user_id: cleanText(row.user_id),
        plan: cleanText(row.plan),
        cycle: cleanText(row.cycle),
        amount: numberValue(row.amount),
        created_at: cleanText(row.created_at),
      },
    })]
  })
}

async function scanRedeemCountMismatch(checkedAt: string): Promise<Issue[]> {
  const { data: codes, error } = await admin
    .from('redemption_codes')
    .select('code,used_count,max_uses,expires_at,created_at')
    .order('created_at', { ascending: false })
    .limit(MAX_REDEEM_CODES)
  if (error) return [scannerError('redeem_count_mismatch', error.message, checkedAt)]

  const codeRows = (codes ?? []) as Record<string, unknown>[]
  const values = codeRows.map((row) => cleanText(row.code)).filter((code): code is string => Boolean(code))
  if (values.length === 0) return []

  const { data: uses, error: usesError } = await admin
    .from('redemption_uses')
    .select('code')
    .in('code', values)
    .limit(MAX_REDEEM_CODES * 20)
  if (usesError) return [scannerError('redeem_count_mismatch', usesError.message, checkedAt)]

  const useCount = countBy((uses ?? []) as Record<string, unknown>[], 'code')
  return codeRows.flatMap((row) => {
    const code = cleanText(row.code)
    if (!code) return []
    const stored = numberValue(row.used_count)
    const actual = useCount.get(code) ?? 0
    const maxUses = numberValue(row.max_uses)
    if (stored === actual && stored <= maxUses) return []
    const overLimit = stored > maxUses || actual > maxUses
    return [makeIssue({
      scanner: 'redeem_count_mismatch',
      severity: overLimit ? 'critical' : 'warning',
      title: overLimit ? 'Redeem vượt max uses' : 'Redeem used_count lệch lịch sử',
      detail: `Code ${code} có used_count ${stored}, lịch sử sử dụng ${actual}, max ${maxUses}.`,
      target_type: 'redemption_code',
      target_id: code,
      detected_at: checkedAt,
      metadata: { used_count: stored, actual_uses: actual, max_uses: maxUses, expires_at: cleanText(row.expires_at) },
    })]
  })
}

async function scanPushFailureRate(checkedAt: string): Promise<Issue[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString()
  const { data, error } = await admin
    .from('notification_deliveries')
    .select('status,created_at')
    .eq('channel', 'web_push')
    .gte('created_at', cutoff)
    .limit(MAX_DELIVERIES)
  if (error) return [scannerError('push_failure_rate', error.message, checkedAt)]

  const rows = (data ?? []) as Record<string, unknown>[]
  const total = rows.filter((row) => ['sent', 'failed'].includes(cleanText(row.status) ?? '')).length
  const failed = rows.filter((row) => cleanText(row.status) === 'failed').length
  if (total < 5) return []
  const rate = failed / total
  if (rate < 0.3) return []
  return [makeIssue({
    scanner: 'push_failure_rate',
    severity: rate >= 0.5 ? 'critical' : 'warning',
    title: 'Tỷ lệ web push lỗi cao',
    detail: `Web push lỗi ${Math.round(rate * 100)}% trong 30 ngày gần nhất.`,
    target_type: 'notification_delivery',
    target_id: 'web_push_30d',
    detected_at: checkedAt,
    metadata: { failed, total, failure_rate: Number(rate.toFixed(4)), window_days: 30 },
  })]
}

async function runScanners(checkedAt: string): Promise<Issue[]> {
  const results = await Promise.allSettled([
    scanGroupsWithoutOwner(checkedAt),
    scanExpensesMissingParty(checkedAt),
    scanExpiredActiveSubscriptions(checkedAt),
    scanStalePendingPayments(checkedAt),
    scanRedeemCountMismatch(checkedAt),
    scanPushFailureRate(checkedAt),
  ])
  return results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return result.value
    return [scannerError(`scanner_${index + 1}`, result.reason, checkedAt)]
  })
}

function summaryFor(issues: Issue[]) {
  return {
    total_issues: issues.length,
    critical: issues.filter((issue) => issue.severity === 'critical').length,
    warning: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length,
    scanners_run: SCANNERS_RUN,
  }
}

async function persistScan(actor: Actor, checkedAt: string, issues: Issue[]) {
  const summary = summaryFor(issues)
  const { data: scan, error } = await admin
    .from('admin_data_quality_scans')
    .insert({
      checked_at: checkedAt,
      ...summary,
      actor_user_id: actor.userId,
      actor_email: actor.email,
      actor_role: actor.role,
    })
    .select('id')
    .single()
  if (error || !scan) {
    return { scanId: null, issues: [...issues, scannerError('persist_scan', error?.message ?? 'scan_insert_failed', checkedAt)] }
  }

  const scanId = scan.id as string
  if (issues.length === 0) return { scanId, issues }

  const { data: persisted, error: issuesError } = await admin
    .from('admin_data_quality_issues')
    .insert(issues.map((issue) => ({
      scan_id: scanId,
      issue_key: issueKey(issue),
      scanner: issue.scanner,
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      target_type: issue.target_type,
      target_id: issue.target_id,
      detected_at: issue.detected_at,
      metadata: issue.metadata,
    })))
    .select('id,scanner,severity,title,detail,target_type,target_id,detected_at,metadata')
  if (issuesError) {
    return { scanId, issues: [...issues, scannerError('persist_issues', issuesError.message, checkedAt)] }
  }
  return {
    scanId,
    issues: ((persisted ?? []) as Record<string, unknown>[]).map((row) => makeIssue({
      scanner: cleanText(row.scanner) ?? 'unknown',
      severity: row.severity === 'critical' || row.severity === 'warning' || row.severity === 'info' ? row.severity : 'info',
      title: cleanText(row.title) ?? 'Data quality issue',
      detail: cleanText(row.detail),
      target_type: cleanText(row.target_type),
      target_id: cleanText(row.target_id),
      detected_at: cleanText(row.detected_at) ?? checkedAt,
      metadata: row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata) ? row.metadata as Record<string, unknown> : {},
    })).map((issue, index) => ({ ...issue, id: cleanText((persisted?.[index] as Record<string, unknown> | undefined)?.id) ?? issue.id })),
  }
}

async function recentScans() {
  const { data } = await admin
    .from('admin_data_quality_scans')
    .select('id,checked_at,total_issues,critical,warning,info')
    .order('checked_at', { ascending: false })
    .limit(8)
  return (data ?? [])
}

async function snapshot(actor: Actor) {
  const checkedAt = new Date().toISOString()
  const liveIssues = await runScanners(checkedAt)
  const persisted = await persistScan(actor, checkedAt, liveIssues)
  const summary = summaryFor(persisted.issues)
  await writeAudit(actor, 'success', { scan_id: persisted.scanId, ...summary }, null)
  return {
    scan_id: persisted.scanId,
    checked_at: checkedAt,
    summary,
    issues: persisted.issues,
    recent_scans: await recentScans(),
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let actor: Actor | null = null
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    actor = await getActor(jwt)
    const body = (await req.json().catch(() => ({}))) as RequestBody
    if (body.action === 'snapshot') return json(await snapshot(actor), 200, origin)
    return json({ error: 'Invalid action' }, 400, origin)
  } catch (error) {
    const message = sanitizeError(error)
    if (actor) {
      await writeAudit(actor, 'failed', { error: message }, message).catch(() => null)
    }
    return json({ error: message }, error instanceof HttpError ? error.status : 500, origin)
  }
})
