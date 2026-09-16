// Console Admin Billing / Premium operations (verify_jwt=true).
// Reads billing state through service role after checking admin_users, and
// performs manual premium grants via grant_subscription with audit logging.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PAYOS_CLIENT_ID = Deno.env.get('PAYOS_CLIENT_ID')
const PAYOS_API_KEY = Deno.env.get('PAYOS_API_KEY')
const PAYOS_CHECKSUM_KEY = Deno.env.get('PAYOS_CHECKSUM_KEY')
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'snapshot' | 'lookup_user' | 'manual_grant'
type Plan = 'personal' | 'team'

type RequestBody = {
  action?: Action
  search?: string | null
  subscription_status?: 'active' | 'expired' | null
  payment_status?: 'pending' | 'paid' | 'cancelled' | null
  limit?: number | string | null
  query?: string | null
  user_email?: string | null
  user_id?: string | null
  plan?: Plan | null
  days?: number | string | null
  note?: string | null
}

type Actor = {
  userId: string
  email: string | null
  role: string
}

type ProfileRow = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
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
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function sanitizeError(value: unknown): string {
  const text = value instanceof Error ? value.message : cleanText(value) ?? 'unknown_error'
  return text.replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]').slice(0, 2000)
}

function limitedInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.trunc(n), min), max)
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function profileFromJoin(row: Record<string, unknown>): { email: string | null; displayName: string | null; avatarUrl: string | null } {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  if (!profile || typeof profile !== 'object') return { email: null, displayName: null, avatarUrl: null }
  const p = profile as Record<string, unknown>
  return { email: cleanText(p.email), displayName: cleanText(p.display_name), avatarUrl: cleanText(p.avatar_url) }
}

function daysLeft(periodEnd: unknown): number | null {
  const value = cleanText(periodEnd)
  if (!value) return null
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.ceil((ms - Date.now()) / 86_400_000)
}

function subscriptionPayload(row: Record<string, unknown> | null | undefined) {
  if (!row) return null
  const profile = profileFromJoin(row)
  return {
    user_id: cleanText(row.user_id),
    user_email: profile.email,
    display_name: profile.displayName,
    plan: cleanText(row.plan),
    status: cleanText(row.status),
    period_end: cleanText(row.period_end),
    source: cleanText(row.source),
    team_id: cleanText(row.team_id),
    days_left: daysLeft(row.period_end),
    created_at: cleanText(row.created_at),
    updated_at: cleanText(row.updated_at),
  }
}

function paymentPayload(row: Record<string, unknown>) {
  const profile = profileFromJoin(row)
  return {
    order_code: String(row.order_code ?? ''),
    user_id: cleanText(row.user_id),
    user_email: profile.email,
    display_name: profile.displayName,
    plan: cleanText(row.plan),
    cycle: cleanText(row.cycle),
    amount: Number(row.amount ?? 0),
    status: cleanText(row.status),
    created_at: cleanText(row.created_at),
    paid_at: cleanText(row.paid_at),
  }
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

function requireOperator(actor: Actor) {
  if (!['owner', 'operator'].includes(actor.role)) throw new HttpError(403, 'Operator role required')
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
    target_type: 'billing_subscription',
    target_id: cleanText(payload.user_id) ?? cleanText(payload.user_email) ?? 'billing',
    payload_summary: payload,
    status,
    error_message: errorMessage ? sanitizeError(errorMessage) : null,
  })
}

async function countRows(table: string, build?: (query: any) => any): Promise<{ count: number; error: string | null }> {
  try {
    const query = build ? build(admin.from(table).select('*', { count: 'exact', head: true })) : admin.from(table).select('*', { count: 'exact', head: true })
    const { count, error } = await query
    return { count: count ?? 0, error: error ? sanitizeError(error.message) : null }
  } catch (error) {
    return { count: 0, error: sanitizeError(error) }
  }
}

function uniqueProfiles(rows: ProfileRow[]): ProfileRow[] {
  const map = new Map<string, ProfileRow>()
  for (const row of rows) if (row?.id && !map.has(row.id)) map.set(row.id, row)
  return [...map.values()]
}

async function searchProfiles(rawSearch: string | null, limit = MAX_LIMIT): Promise<ProfileRow[]> {
  const search = cleanText(rawSearch)
  if (!search) return []
  if (isUuid(search)) {
    const { data } = await admin
      .from('profiles')
      .select('id,email,display_name,avatar_url')
      .eq('id', search)
      .limit(1)
    return (data ?? []) as ProfileRow[]
  }

  const pattern = `%${search}%`
  const [byEmail, byName] = await Promise.all([
    admin.from('profiles').select('id,email,display_name,avatar_url').ilike('email', pattern).limit(limit),
    admin.from('profiles').select('id,email,display_name,avatar_url').ilike('display_name', pattern).limit(limit),
  ])
  return uniqueProfiles([...(byEmail.data ?? []), ...(byName.data ?? [])] as ProfileRow[]).slice(0, limit)
}

async function findProfile(query: string): Promise<ProfileRow | null> {
  const search = cleanText(query)
  if (!search) return null
  if (isUuid(search)) {
    const { data } = await admin
      .from('profiles')
      .select('id,email,display_name,avatar_url')
      .eq('id', search)
      .maybeSingle()
    return (data as ProfileRow | null) ?? null
  }

  const exact = await admin
    .from('profiles')
    .select('id,email,display_name,avatar_url')
    .eq('email', search.toLowerCase())
    .maybeSingle()
  if (exact.data) return exact.data as ProfileRow

  const rows = await searchProfiles(search, 5)
  return rows[0] ?? null
}

async function listSubscriptions(search: string | null, status: string | null, limit: number) {
  const profiles = search ? await searchProfiles(search, limit) : []
  if (search && profiles.length === 0) return { rows: [], error: null }

  let query = admin
    .from('subscriptions')
    .select('user_id,plan,status,period_end,source,team_id,created_at,updated_at,profiles(email,display_name,avatar_url)')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (status === 'active' || status === 'expired') query = query.eq('status', status)
  if (profiles.length > 0) query = query.in('user_id', profiles.map((profile) => profile.id))

  const { data, error } = await query
  return {
    rows: (data ?? []).map((row) => subscriptionPayload(row as Record<string, unknown>)).filter(Boolean),
    error: error ? sanitizeError(error.message) : null,
  }
}

async function listPayments(search: string | null, status: string | null, limit: number) {
  const profiles = search ? await searchProfiles(search, limit) : []
  if (search && profiles.length === 0) return { rows: [], error: null }

  let query = admin
    .from('payment_orders')
    .select('order_code,user_id,plan,cycle,amount,status,created_at,paid_at,profiles(email,display_name,avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (status === 'pending' || status === 'paid' || status === 'cancelled') query = query.eq('status', status)
  if (profiles.length > 0) query = query.in('user_id', profiles.map((profile) => profile.id))

  const { data, error } = await query
  return {
    rows: (data ?? []).map((row) => paymentPayload(row as Record<string, unknown>)).filter((row) => row.order_code),
    error: error ? sanitizeError(error.message) : null,
  }
}

async function recentBillingErrors() {
  const { data } = await admin
    .from('admin_audit_logs')
    .select('id,action,error_message,created_at')
    .eq('status', 'failed')
    .ilike('action', 'billing.%')
    .order('created_at', { ascending: false })
    .limit(5)
  return (data ?? []).flatMap((row) => {
    const id = cleanText(row.id)
    const createdAt = cleanText(row.created_at)
    if (!id || !createdAt) return []
    return [{ id, source: 'admin_audit_logs', action: cleanText(row.action), message: cleanText(row.error_message), created_at: createdAt }]
  })
}

async function subscriptionForUser(userId: string) {
  const { data } = await admin
    .from('subscriptions')
    .select('user_id,plan,status,period_end,source,team_id,created_at,updated_at,profiles(email,display_name,avatar_url)')
    .eq('user_id', userId)
    .maybeSingle()
  return subscriptionPayload(data as Record<string, unknown> | null)
}

async function paymentsForUser(userId: string, limit = 10) {
  const { data } = await admin
    .from('payment_orders')
    .select('order_code,user_id,plan,cycle,amount,status,created_at,paid_at,profiles(email,display_name,avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).map((row) => paymentPayload(row as Record<string, unknown>)).filter((row) => row.order_code)
}

async function redemptionsForUser(userId: string) {
  const { data } = await admin
    .from('redemption_uses')
    .select('id,code,used_at,redemption_codes(plan,duration_days)')
    .eq('used_by', userId)
    .order('used_at', { ascending: false })
    .limit(10)
  return (data ?? []).flatMap((row) => {
    const id = cleanText(row.id)
    const code = cleanText(row.code)
    const usedAt = cleanText(row.used_at)
    if (!id || !code || !usedAt) return []
    const codeRow = Array.isArray(row.redemption_codes) ? row.redemption_codes[0] : row.redemption_codes
    const plan = codeRow && typeof codeRow === 'object' ? cleanText((codeRow as Record<string, unknown>).plan) : null
    const durationDays = codeRow && typeof codeRow === 'object' ? Number((codeRow as Record<string, unknown>).duration_days ?? 0) : null
    return [{ id, code, used_at: usedAt, plan, duration_days: durationDays }]
  })
}

async function buildSnapshot(body: RequestBody) {
  const checkedAt = new Date().toISOString()
  const search = cleanText(body.search)
  const subscriptionStatus = body.subscription_status === 'active' || body.subscription_status === 'expired' ? body.subscription_status : null
  const paymentStatus = body.payment_status === 'pending' || body.payment_status === 'paid' || body.payment_status === 'cancelled' ? body.payment_status : null
  const limit = limitedInt(body.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const monthStart = `${checkedAt.slice(0, 7)}-01T00:00:00.000Z`
  const staleCutoff = new Date(Date.now() - 30 * 60_000).toISOString()

  const [
    activePremium,
    expiredSubs,
    pendingOrders,
    stalePendingOrders,
    paidOrders30d,
    manualGrants30d,
    subscriptions,
    payments,
    errors,
  ] = await Promise.all([
    countRows('subscriptions', (query) => query.eq('status', 'active').in('plan', ['personal', 'team']).or(`period_end.is.null,period_end.gte.${checkedAt}`)),
    countRows('subscriptions', (query) => query.eq('status', 'expired')),
    countRows('payment_orders', (query) => query.eq('status', 'pending')),
    countRows('payment_orders', (query) => query.eq('status', 'pending').lt('created_at', staleCutoff)),
    countRows('payment_orders', (query) => query.eq('status', 'paid').gte('paid_at', monthStart)),
    countRows('subscriptions', (query) => query.eq('source', 'manual').gte('updated_at', monthStart)),
    listSubscriptions(search, subscriptionStatus, limit),
    listPayments(search, paymentStatus, limit),
    recentBillingErrors(),
  ])

  const queryErrors = [
    activePremium.error,
    expiredSubs.error,
    pendingOrders.error,
    stalePendingOrders.error,
    paidOrders30d.error,
    manualGrants30d.error,
    subscriptions.error,
    payments.error,
  ].filter(Boolean)
  const payosConfigured = Boolean(PAYOS_CLIENT_ID && PAYOS_API_KEY && PAYOS_CHECKSUM_KEY)
  const summaryStatus = queryErrors.length > 0 ? 'failed' : payosConfigured ? 'configured' : 'missing'

  return {
    checked_at: checkedAt,
    summary_status: summaryStatus,
    provider: {
      status: payosConfigured ? 'configured' : 'missing',
      detail: payosConfigured ? 'PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY configured' : 'PayOS secrets missing',
      stale_pending_count: stalePendingOrders.count,
    },
    metrics: [
      { id: 'active_premium', label: 'Premium active', value: activePremium.count, detail: activePremium.error ?? 'active subscriptions' },
      { id: 'expired_subscriptions', label: 'Expired', value: expiredSubs.count, detail: expiredSubs.error ?? 'expired subscriptions' },
      { id: 'pending_orders', label: 'Pending orders', value: pendingOrders.count, detail: pendingOrders.error ?? 'PayOS pending' },
      { id: 'stale_pending', label: 'Stale pending', value: stalePendingOrders.count, detail: stalePendingOrders.error ?? '> 30 minutes' },
      { id: 'paid_30d', label: 'Paid month', value: paidOrders30d.count, detail: paidOrders30d.error ?? checkedAt.slice(0, 7) },
      { id: 'manual_30d', label: 'Manual grants', value: manualGrants30d.count, detail: manualGrants30d.error ?? checkedAt.slice(0, 7) },
    ],
    subscriptions: subscriptions.rows,
    payments: payments.rows,
    recent_errors: [
      ...queryErrors.map((message, index) => ({ id: `query-${index}`, source: 'admin-billing', action: 'billing.snapshot', message, created_at: checkedAt })),
      ...errors,
    ].slice(0, 8),
  }
}

async function lookupUser(query: string) {
  const profile = await findProfile(query)
  if (!profile) throw new HttpError(404, 'User not found')
  const [subscription, payments, redemptions] = await Promise.all([
    subscriptionForUser(profile.id),
    paymentsForUser(profile.id),
    redemptionsForUser(profile.id),
  ])
  return {
    profile: {
      user_id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    },
    subscription,
    payments,
    redemptions,
  }
}

async function manualGrant(actor: Actor, body: RequestBody) {
  requireOperator(actor)
  const plan = body.plan === 'team' ? 'team' : body.plan === 'personal' ? 'personal' : null
  const days = limitedInt(body.days, 30, 1, 3650)
  if (!plan) throw new HttpError(400, 'Invalid plan')
  const target = cleanText(body.user_id) ?? cleanText(body.user_email)
  if (!target) throw new HttpError(400, 'User required')
  const profile = await findProfile(target)
  if (!profile) throw new HttpError(404, 'User not found')

  const payload = {
    user_id: profile.id,
    user_email: profile.email,
    plan,
    days,
    source: 'manual',
    note: cleanText(body.note)?.slice(0, 300) ?? null,
  }

  const { error } = await admin.rpc('grant_subscription', {
    p_uid: profile.id,
    p_plan: plan,
    p_days: days,
    p_source: 'manual',
  })
  if (error) {
    await writeAudit(actor, 'billing.manual_grant', 'failed', payload, error.message)
    throw new HttpError(500, error.message)
  }

  const subscription = await subscriptionForUser(profile.id)
  await writeAudit(actor, 'billing.manual_grant', 'success', payload, null)
  return { subscription }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const actor = await getActor(jwt)
    const body = (await req.json().catch(() => ({}))) as RequestBody
    if (body.action === 'snapshot') return json(await buildSnapshot(body), 200, origin)
    if (body.action === 'lookup_user') {
      const query = cleanText(body.query)
      if (!query) return json({ error: 'Query required' }, 400, origin)
      return json(await lookupUser(query), 200, origin)
    }
    if (body.action === 'manual_grant') return json(await manualGrant(actor, body), 200, origin)
    return json({ error: 'Invalid action' }, 400, origin)
  } catch (error) {
    const message = sanitizeError(error)
    return json({ error: message }, error instanceof HttpError ? error.status : 500, origin)
  }
})
