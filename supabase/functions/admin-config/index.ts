// Console Admin System Config (verify_jwt=true).
// Reads/writes non-secret operational config via service role after checking
// admin_users. Every write requires owner role and writes admin_audit_logs.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'snapshot' | 'save_flags' | 'save_limits' | 'save_maintenance' | 'save_disclaimer'
type FlagKey = 'ai_parse_expense' | 'ai_ocr_receipt' | 'ai_insight' | 'payments' | 'redeem' | 'debt_reminder' | 'zalo_login'

type RequestBody = {
  action?: Action
  flags?: Record<string, unknown>
  limits?: Record<string, unknown>
  maintenance?: Record<string, unknown>
  disclaimer?: Record<string, unknown>
  reason?: string | null
}

type Actor = {
  userId: string
  email: string | null
  role: string
}

type FlagMeta = {
  key: FlagKey
  label: string
  description: string
  category: 'ai' | 'growth' | 'ops' | 'auth'
  dangerous: boolean
  defaultEnabled: boolean
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const FLAGS: FlagMeta[] = [
  { key: 'ai_parse_expense', label: 'Nhập chi tự nhiên', description: 'Bật/tắt LLM parser cho khoản chi tự nhiên.', category: 'ai', dangerous: true, defaultEnabled: true },
  { key: 'ai_ocr_receipt', label: 'OCR hoá đơn', description: 'Bật/tắt vision OCR để đọc hoá đơn/biên lai.', category: 'ai', dangerous: true, defaultEnabled: true },
  { key: 'ai_insight', label: 'Insight chi tiêu', description: 'Bật/tắt nhận xét chi tiêu bằng AI.', category: 'ai', dangerous: true, defaultEnabled: true },
  { key: 'payments', label: 'Thanh toán PayOS', description: 'Bật/tắt luồng tạo đơn thanh toán PayOS.', category: 'growth', dangerous: true, defaultEnabled: true },
  { key: 'redeem', label: 'Redeem code', description: 'Bật/tắt luồng redeem code premium.', category: 'growth', dangerous: true, defaultEnabled: true },
  { key: 'debt_reminder', label: 'Nhắc nợ', description: 'Bật/tắt nhắc nợ một chạm và liên quan.', category: 'ops', dangerous: true, defaultEnabled: true },
  { key: 'zalo_login', label: 'Đăng nhập Zalo', description: 'Bật/tắt luồng đăng nhập/liên kết Zalo.', category: 'auth', dangerous: false, defaultEnabled: true },
]

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function sanitizeError(value: unknown): string {
  const text = value instanceof Error ? value.message : cleanText(value) ?? 'unknown_error'
  return text.replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]').slice(0, 2000)
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return value === true ? true : value === false ? false : fallback
}

function intValue(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.trunc(n), min), max)
}

function nullableInt(value: unknown, fallback: number | null, min: number, max: number): number | null {
  if (value == null) return null
  return intValue(value, fallback ?? min, min, max)
}

function reasonText(value: unknown): string {
  const reason = cleanText(value)
  if (!reason) throw new HttpError(400, 'Reason required')
  return reason.slice(0, 300)
}

function featureKey(value: string): value is FlagKey {
  return FLAGS.some((flag) => flag.key === value)
}

function severity(value: unknown): 'info' | 'warning' | 'critical' {
  return value === 'warning' || value === 'critical' ? value : 'info'
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

function requireOwner(actor: Actor) {
  if (actor.role !== 'owner') throw new HttpError(403, 'Owner role required')
}

async function writeAudit(
  actor: Actor,
  action: string,
  status: 'success' | 'failed',
  payload: Record<string, unknown>,
  errorMessage?: string | null,
) {
  await admin.from('admin_audit_logs').insert({
    actor_user_id: actor.userId,
    actor_email: actor.email,
    actor_role: actor.role,
    action,
    target_type: 'system_config',
    target_id: cleanText(payload.section) ?? 'config',
    payload_summary: payload,
    status,
    error_message: errorMessage ? sanitizeError(errorMessage) : null,
  })
}

async function appConfigMap(keys: string[]) {
  const { data } = await admin.from('app_config').select('key,value,updated_at').in('key', keys)
  return new Map((data ?? []).map((row) => [String(row.key), row as Record<string, unknown>]))
}

async function featureRows() {
  const { data } = await admin.from('feature_flags').select('key,label,description,enabled,updated_at')
  const rows = new Map((data ?? []).map((row) => [String(row.key), row as Record<string, unknown>]))
  return FLAGS.map((meta) => {
    const row = rows.get(meta.key)
    return {
      key: meta.key,
      label: cleanText(row?.label) ?? meta.label,
      description: cleanText(row?.description) ?? meta.description,
      enabled: row?.enabled === false ? false : row?.enabled === true ? true : meta.defaultEnabled,
      category: meta.category,
      dangerous: meta.dangerous,
      updated_at: cleanText(row?.updated_at),
    }
  })
}

function objectValue(row: Record<string, unknown> | undefined): Record<string, unknown> {
  const value = row?.value
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

async function limitsPayload() {
  const config = await appConfigMap(['plan_limits', 'ai_quota', 'operation_limits'])
  const plan = objectValue(config.get('plan_limits'))
  const ai = objectValue(config.get('ai_quota'))
  const ops = objectValue(config.get('operation_limits'))
  return {
    free_max_groups: intValue(plan.free_max_groups, 3, 1, 999),
    free_max_members: intValue(plan.free_max_members, 8, 1, 999),
    premium_max_groups: nullableInt(plan.premium_max_groups, null, 1, 9999),
    premium_max_members: intValue(plan.premium_max_members, 25, 1, 999),
    parse_free: intValue(ai.parse_free, 15, 0, 9999),
    ocr_free: intValue(ai.ocr_free, 3, 0, 9999),
    insight_free: intValue(ai.insight_free, 3, 0, 9999),
    debt_cooldown_hours: intValue(ops.debt_cooldown_hours, 24, 1, 720),
    redeem_duration_days: intValue(ops.redeem_duration_days, 30, 1, 3650),
    redeem_max_uses: intValue(ops.redeem_max_uses, 1, 1, 100000),
  }
}

async function maintenancePayload() {
  const { data } = await admin
    .from('maintenance_banners')
    .select('enabled,title,message,severity,starts_at,ends_at,updated_at')
    .eq('key', 'global')
    .maybeSingle()
  return {
    enabled: data?.enabled === true,
    title: cleanText(data?.title) ?? 'Bảo trì hệ thống',
    message: cleanText(data?.message) ?? '',
    severity: severity(data?.severity),
    starts_at: cleanText(data?.starts_at),
    ends_at: cleanText(data?.ends_at),
    updated_at: cleanText(data?.updated_at),
  }
}

async function disclaimerPayload() {
  const config = await appConfigMap(['legal_disclaimer'])
  const row = config.get('legal_disclaimer')
  const value = objectValue(row)
  return {
    payment: cleanText(value.payment) ?? 'Thanh toán xử lý qua PayOS.',
    legal: cleanText(value.legal) ?? 'Splitz hỗ trợ chia tiền, không phải ví điện tử.',
    updated_at: cleanText(row?.updated_at),
  }
}

async function recentChanges() {
  const { data } = await admin
    .from('admin_audit_logs')
    .select('id,action,actor_email,created_at')
    .ilike('action', 'config.%')
    .order('created_at', { ascending: false })
    .limit(8)
  return (data ?? []).flatMap((row) => {
    const id = cleanText(row.id)
    const action = cleanText(row.action)
    const createdAt = cleanText(row.created_at)
    if (!id || !action || !createdAt) return []
    return [{ id, action, actor_email: cleanText(row.actor_email), created_at: createdAt }]
  })
}

async function buildSnapshot() {
  const [flags, limits, maintenance, disclaimer, changes] = await Promise.all([
    featureRows(),
    limitsPayload(),
    maintenancePayload(),
    disclaimerPayload(),
    recentChanges(),
  ])
  return {
    checked_at: new Date().toISOString(),
    summary_status: flags.length > 0 ? 'configured' : 'missing',
    flags,
    limits,
    maintenance,
    disclaimer,
    recent_changes: changes,
  }
}

async function saveFlags(actor: Actor, body: RequestBody) {
  requireOwner(actor)
  const reason = reasonText(body.reason)
  const now = new Date().toISOString()
  const input = body.flags ?? {}
  const current = new Map((await featureRows()).map((flag) => [flag.key, flag.enabled]))
  const rows = FLAGS.map((meta) => ({
    key: meta.key,
    label: meta.label,
    description: meta.description,
    enabled: featureKey(meta.key) && input[meta.key] !== undefined ? boolValue(input[meta.key], meta.defaultEnabled) : current.get(meta.key) ?? meta.defaultEnabled,
    updated_by: actor.userId,
    updated_at: now,
  }))
  const { error } = await admin.from('feature_flags').upsert(rows, { onConflict: 'key' })
  if (error) throw new Error(error.message)
  await writeAudit(actor, 'config.flags.save', 'success', { section: 'flags', flags: rows.map(({ key, enabled }) => ({ key, enabled })), reason })
  return { saved: true }
}

async function saveLimits(actor: Actor, body: RequestBody) {
  requireOwner(actor)
  const reason = reasonText(body.reason)
  const source = body.limits ?? {}
  const now = new Date().toISOString()
  const planLimits = {
    free_max_groups: intValue(source.free_max_groups, 3, 1, 999),
    free_max_members: intValue(source.free_max_members, 8, 1, 999),
    premium_max_groups: nullableInt(source.premium_max_groups, null, 1, 9999),
    premium_max_members: intValue(source.premium_max_members, 25, 1, 999),
  }
  const aiQuota = {
    parse_free: intValue(source.parse_free, 15, 0, 9999),
    ocr_free: intValue(source.ocr_free, 3, 0, 9999),
    insight_free: intValue(source.insight_free, 3, 0, 9999),
  }
  const operationLimits = {
    debt_cooldown_hours: intValue(source.debt_cooldown_hours, 24, 1, 720),
    redeem_duration_days: intValue(source.redeem_duration_days, 30, 1, 3650),
    redeem_max_uses: intValue(source.redeem_max_uses, 1, 1, 100000),
  }
  const { error } = await admin.from('app_config').upsert([
    { key: 'plan_limits', category: 'limits', value: planLimits, updated_by: actor.userId, updated_at: now },
    { key: 'ai_quota', category: 'ai', value: aiQuota, updated_by: actor.userId, updated_at: now },
    { key: 'operation_limits', category: 'limits', value: operationLimits, updated_by: actor.userId, updated_at: now },
  ], { onConflict: 'key' })
  if (error) throw new Error(error.message)
  await writeAudit(actor, 'config.limits.save', 'success', { section: 'limits', plan_limits: planLimits, ai_quota: aiQuota, operation_limits: operationLimits, reason })
  return { saved: true }
}

async function saveMaintenance(actor: Actor, body: RequestBody) {
  requireOwner(actor)
  const reason = reasonText(body.reason)
  const source = body.maintenance ?? {}
  const payload = {
    key: 'global',
    enabled: boolValue(source.enabled, false),
    title: cleanText(source.title) ?? 'Bảo trì hệ thống',
    message: cleanText(source.message) ?? '',
    severity: severity(source.severity),
    starts_at: cleanText(source.starts_at),
    ends_at: cleanText(source.ends_at),
    updated_by: actor.userId,
    updated_at: new Date().toISOString(),
  }
  const { error } = await admin.from('maintenance_banners').upsert(payload, { onConflict: 'key' })
  if (error) throw new Error(error.message)
  await writeAudit(actor, 'config.maintenance.save', 'success', { section: 'maintenance', ...payload, reason })
  return { saved: true }
}

async function saveDisclaimer(actor: Actor, body: RequestBody) {
  requireOwner(actor)
  const reason = reasonText(body.reason)
  const source = body.disclaimer ?? {}
  const payload = {
    payment: cleanText(source.payment) ?? '',
    legal: cleanText(source.legal) ?? '',
  }
  const { error } = await admin.from('app_config').upsert({
    key: 'legal_disclaimer',
    category: 'system',
    value: payload,
    updated_by: actor.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
  await writeAudit(actor, 'config.disclaimer.save', 'success', { section: 'disclaimer', ...payload, reason })
  return { saved: true }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let actor: Actor | null = null
  let action: Action | null = null

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    actor = await getActor(jwt)
    const body = (await req.json().catch(() => ({}))) as RequestBody
    action = body.action ?? null
    if (action === 'snapshot') return json(await buildSnapshot(), 200, origin)
    if (action === 'save_flags') return json(await saveFlags(actor, body), 200, origin)
    if (action === 'save_limits') return json(await saveLimits(actor, body), 200, origin)
    if (action === 'save_maintenance') return json(await saveMaintenance(actor, body), 200, origin)
    if (action === 'save_disclaimer') return json(await saveDisclaimer(actor, body), 200, origin)
    return json({ error: 'Invalid action' }, 400, origin)
  } catch (error) {
    const message = sanitizeError(error)
    if (actor && action && action !== 'snapshot') {
      await writeAudit(actor, `config.${action}.failed`, 'failed', { section: action }, message)
    }
    return json({ error: message }, error instanceof HttpError ? error.status : 500, origin)
  }
})
