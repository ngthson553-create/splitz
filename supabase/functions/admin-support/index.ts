// Console Admin User / Group Support 360 (verify_jwt=true).
// Read-only support snapshot after checking admin_users. The response redacts
// bank account numbers and push credentials; no business data is mutated here.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'search_users' | 'user_snapshot'

type RequestBody = {
  action?: Action
  query?: string | null
  limit?: number | string | null
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
  bank_code: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  onboarded_at: string | null
  created_at: string
  updated_at: string | null
}

type GroupRow = {
  id: string
  owner_id: string
  name: string
  emoji: string | null
  base_currency: string
  settlement_method: string
  created_at: string
  updated_at: string | null
  version: number
}

type MemberRow = {
  id: string
  group_id: string
  user_id: string | null
  name: string
  role: 'owner' | 'member'
  bank_code: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  joined_at: string
  updated_at: string | null
  version: number
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

function bankConfigured(row: { bank_code?: unknown; bank_account_number?: unknown; bank_account_name?: unknown }): boolean {
  return Boolean(cleanText(row.bank_code) && cleanText(row.bank_account_number) && cleanText(row.bank_account_name))
}

function accountLast4(value: unknown): string | null {
  const clean = cleanText(value)?.replace(/\s+/g, '')
  return clean && clean.length >= 4 ? clean.slice(-4) : null
}

function daysLeft(periodEnd: unknown): number | null {
  const value = cleanText(periodEnd)
  if (!value) return null
  const ms = new Date(value).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.ceil((ms - Date.now()) / 86_400_000)
}

function countByKey(rows: Record<string, unknown>[], key: string): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const value = cleanText(row[key])
    if (!value) continue
    map.set(value, (map.get(value) ?? 0) + 1)
  }
  return map
}

function latestIso(values: (string | null | undefined)[]): string | null {
  let latest = 0
  let latestValue: string | null = null
  for (const value of values) {
    if (!value) continue
    const time = new Date(value).getTime()
    if (Number.isFinite(time) && time > latest) {
      latest = time
      latestValue = value
    }
  }
  return latestValue
}

function endpointHost(endpoint: unknown): string {
  const value = cleanText(endpoint)
  if (!value) return 'unknown'
  try {
    return new URL(value).host || 'unknown'
  } catch {
    return 'unknown'
  }
}

function profilePayload(row: ProfileRow) {
  return {
    user_id: row.id,
    email: row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    onboarded_at: row.onboarded_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    bank_configured: bankConfigured(row),
    bank_code: cleanText(row.bank_code),
    bank_account_last4: accountLast4(row.bank_account_number),
  }
}

function subscriptionPayload(row: Record<string, unknown> | null | undefined) {
  if (!row) return null
  const userId = cleanText(row.user_id)
  const plan = cleanText(row.plan)
  const status = cleanText(row.status)
  const createdAt = cleanText(row.created_at)
  if (!userId || !plan || !status || !createdAt) return null
  return {
    user_id: userId,
    plan,
    status,
    period_end: cleanText(row.period_end),
    source: cleanText(row.source),
    team_id: cleanText(row.team_id),
    days_left: daysLeft(row.period_end),
    created_at: createdAt,
    updated_at: cleanText(row.updated_at),
  }
}

function paymentPayload(row: Record<string, unknown>) {
  const orderCode = row.order_code == null ? null : String(row.order_code)
  const plan = cleanText(row.plan)
  const cycle = cleanText(row.cycle)
  const status = cleanText(row.status)
  const createdAt = cleanText(row.created_at)
  if (!orderCode || !plan || !cycle || !status || !createdAt) return null
  return {
    order_code: orderCode,
    plan,
    cycle,
    amount: Number(row.amount ?? 0),
    status,
    created_at: createdAt,
    paid_at: cleanText(row.paid_at),
  }
}

function memberPayload(row: MemberRow, profileById: Map<string, ProfileRow>) {
  const profile = row.user_id ? profileById.get(row.user_id) : null
  return {
    member_id: row.id,
    user_id: row.user_id,
    email: profile?.email ?? null,
    name: row.name,
    role: row.role,
    bank_configured: bankConfigured(row),
    joined_at: row.joined_at,
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

function uniqueProfiles(rows: ProfileRow[]): ProfileRow[] {
  const map = new Map<string, ProfileRow>()
  for (const row of rows) if (row?.id && !map.has(row.id)) map.set(row.id, row)
  return [...map.values()]
}

async function searchProfiles(rawQuery: string, limit: number): Promise<ProfileRow[]> {
  const query = cleanText(rawQuery)
  if (!query) return []
  const columns = 'id,email,display_name,avatar_url,bank_code,bank_account_number,bank_account_name,onboarded_at,created_at,updated_at'
  if (isUuid(query)) {
    const { data } = await admin.from('profiles').select(columns).eq('id', query).limit(1)
    return (data ?? []) as ProfileRow[]
  }

  const pattern = `%${query}%`
  const [byEmail, byName] = await Promise.all([
    admin.from('profiles').select(columns).ilike('email', pattern).order('created_at', { ascending: false }).limit(limit),
    admin.from('profiles').select(columns).ilike('display_name', pattern).order('created_at', { ascending: false }).limit(limit),
  ])
  return uniqueProfiles([...(byEmail.data ?? []), ...(byName.data ?? [])] as ProfileRow[]).slice(0, limit)
}

async function findProfile(rawQuery: string): Promise<ProfileRow | null> {
  const query = cleanText(rawQuery)
  if (!query) return null
  const columns = 'id,email,display_name,avatar_url,bank_code,bank_account_number,bank_account_name,onboarded_at,created_at,updated_at'
  if (isUuid(query)) {
    const { data } = await admin.from('profiles').select(columns).eq('id', query).maybeSingle()
    return (data as ProfileRow | null) ?? null
  }

  const exact = await admin.from('profiles').select(columns).eq('email', query.toLowerCase()).maybeSingle()
  if (exact.data) return exact.data as ProfileRow
  const rows = await searchProfiles(query, 3)
  return rows[0] ?? null
}

async function subscriptionForUser(userId: string) {
  const { data } = await admin
    .from('subscriptions')
    .select('user_id,plan,status,period_end,source,team_id,created_at,updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  return subscriptionPayload(data as Record<string, unknown> | null)
}

async function groupCountForUser(userId: string): Promise<number> {
  const { count } = await admin
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}

async function buildSearchUsers(body: RequestBody) {
  const query = cleanText(body.query)
  if (!query) throw new HttpError(400, 'Query required')
  const limit = limitedInt(body.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const profiles = await searchProfiles(query, limit)
  const users = await Promise.all(profiles.map(async (profile) => {
    const [subscription, groupCount] = await Promise.all([
      subscriptionForUser(profile.id),
      groupCountForUser(profile.id),
    ])
    const activePremium = subscription?.status === 'active' && subscription.plan !== 'free'
    return {
      user_id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      onboarded: Boolean(profile.onboarded_at),
      bank_configured: bankConfigured(profile),
      group_count: groupCount,
      premium_plan: activePremium ? subscription.plan : 'free',
      created_at: profile.created_at,
    }
  }))
  return { users }
}

async function paymentsForUser(userId: string) {
  const { data } = await admin
    .from('payment_orders')
    .select('order_code,plan,cycle,amount,status,created_at,paid_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []).map((row) => paymentPayload(row as Record<string, unknown>)).filter(Boolean)
}

async function redemptionsForUser(userId: string) {
  const { data } = await admin
    .from('redemption_uses')
    .select('id,code,used_at,redemption_codes(plan,duration_days)')
    .eq('used_by', userId)
    .order('used_at', { ascending: false })
    .limit(20)
  return (data ?? []).flatMap((row) => {
    const id = cleanText(row.id)
    const code = cleanText(row.code)
    const usedAt = cleanText(row.used_at)
    if (!id || !code || !usedAt) return []
    const codeRow = Array.isArray(row.redemption_codes) ? row.redemption_codes[0] : row.redemption_codes
    const plan = codeRow && typeof codeRow === 'object' ? cleanText((codeRow as Record<string, unknown>).plan) : null
    const durationDaysRaw = codeRow && typeof codeRow === 'object' ? Number((codeRow as Record<string, unknown>).duration_days ?? 0) : null
    return [{ id, code, used_at: usedAt, plan, duration_days: Number.isFinite(durationDaysRaw) ? durationDaysRaw : null }]
  })
}

async function aiUsageForUser(userId: string) {
  const { data } = await admin
    .from('ai_usage')
    .select('feature,period,count,updated_at')
    .eq('user_id', userId)
    .order('period', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(30)
  return (data ?? []).flatMap((row) => {
    const feature = cleanText(row.feature)
    const period = cleanText(row.period)
    const updatedAt = cleanText(row.updated_at)
    if (!feature || !period || !updatedAt) return []
    return [{ feature, period, count: Number(row.count ?? 0), updated_at: updatedAt }]
  })
}

async function pushHealthForUser(userId: string) {
  const { data } = await admin
    .from('push_subscriptions')
    .select('endpoint,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as Record<string, unknown>[]
  const hosts = new Map<string, number>()
  for (const row of rows) {
    const host = endpointHost(row.endpoint)
    hosts.set(host, (hosts.get(host) ?? 0) + 1)
  }
  return {
    subscription_count: rows.length,
    latest_created_at: latestIso(rows.map((row) => cleanText(row.created_at))),
    endpoint_hosts: [...hosts.entries()].map(([host, count]) => ({ host, count })),
  }
}

async function supportGroupsForUser(userId: string) {
  const memberResult = await admin
    .from('group_members')
    .select('id,group_id,user_id,name,role,bank_code,bank_account_number,bank_account_name,joined_at,updated_at,version')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(50)
  const userMemberships = (memberResult.data ?? []) as MemberRow[]
  const groupIds = [...new Set(userMemberships.map((row) => row.group_id).filter(Boolean))]
  if (groupIds.length === 0) return []

  const [groupsResult, allMembersResult, expensesResult, settlementsResult] = await Promise.all([
    admin
      .from('groups')
      .select('id,owner_id,name,emoji,base_currency,settlement_method,created_at,updated_at,version')
      .in('id', groupIds),
    admin
      .from('group_members')
      .select('id,group_id,user_id,name,role,bank_code,bank_account_number,bank_account_name,joined_at,updated_at,version')
      .in('group_id', groupIds)
      .order('joined_at', { ascending: true }),
    admin.from('expenses').select('group_id').in('group_id', groupIds),
    admin.from('settlements').select('group_id').in('group_id', groupIds),
  ])

  const groups = (groupsResult.data ?? []) as GroupRow[]
  const allMembers = (allMembersResult.data ?? []) as MemberRow[]
  const ownerIds = [...new Set(groups.map((group) => group.owner_id).filter(Boolean))]
  const memberUserIds = [...new Set(allMembers.map((member) => member.user_id).filter(Boolean) as string[])]
  const profileIds = [...new Set([...ownerIds, ...memberUserIds])]
  const profilesResult = profileIds.length > 0
    ? await admin
      .from('profiles')
      .select('id,email,display_name,avatar_url,bank_code,bank_account_number,bank_account_name,onboarded_at,created_at,updated_at')
      .in('id', profileIds)
    : { data: [] }
  const profileById = new Map<string, ProfileRow>(((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  const groupById = new Map<string, GroupRow>(groups.map((group) => [group.id, group]))
  const membersByGroup = new Map<string, MemberRow[]>()
  for (const member of allMembers) {
    const list = membersByGroup.get(member.group_id) ?? []
    list.push(member)
    membersByGroup.set(member.group_id, list)
  }
  const expenseCounts = countByKey((expensesResult.data ?? []) as Record<string, unknown>[], 'group_id')
  const settlementCounts = countByKey((settlementsResult.data ?? []) as Record<string, unknown>[], 'group_id')

  return userMemberships.flatMap((membership) => {
    const group = groupById.get(membership.group_id)
    if (!group) return []
    const members = membersByGroup.get(group.id) ?? []
    const owner = profileById.get(group.owner_id)
    return [{
      group_id: group.id,
      name: group.name,
      emoji: group.emoji,
      base_currency: group.base_currency,
      settlement_method: group.settlement_method,
      owner_id: group.owner_id,
      owner_email: owner?.email ?? null,
      member_id: membership.id,
      member_name: membership.name,
      member_role: membership.role,
      is_owner: group.owner_id === userId || membership.role === 'owner',
      member_count: members.length,
      expense_count: expenseCounts.get(group.id) ?? 0,
      settlement_count: settlementCounts.get(group.id) ?? 0,
      created_at: group.created_at,
      updated_at: group.updated_at,
      version: group.version,
      members: members.map((member) => memberPayload(member, profileById)),
    }]
  })
}

async function buildUserSnapshot(body: RequestBody) {
  const query = cleanText(body.query)
  if (!query) throw new HttpError(400, 'Query required')
  const profile = await findProfile(query)
  if (!profile) throw new HttpError(404, 'User not found')

  const [groups, subscription, payments, redemptions, aiUsage, push] = await Promise.all([
    supportGroupsForUser(profile.id),
    subscriptionForUser(profile.id),
    paymentsForUser(profile.id),
    redemptionsForUser(profile.id),
    aiUsageForUser(profile.id),
    pushHealthForUser(profile.id),
  ])

  return {
    checked_at: new Date().toISOString(),
    profile: profilePayload(profile),
    groups,
    subscription,
    payments,
    redemptions,
    ai_usage: aiUsage,
    push,
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    await getActor(jwt)
    const body = (await req.json().catch(() => ({}))) as RequestBody
    if (body.action === 'search_users') return json(await buildSearchUsers(body), 200, origin)
    if (body.action === 'user_snapshot') return json(await buildUserSnapshot(body), 200, origin)
    return json({ error: 'Invalid action' }, 400, origin)
  } catch (error) {
    const message = sanitizeError(error)
    return json({ error: message }, error instanceof HttpError ? error.status : 500, origin)
  }
})
