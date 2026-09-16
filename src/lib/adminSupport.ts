import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminSupportPlan = 'free' | 'personal' | 'team'
export type AdminSupportSubscriptionStatus = 'active' | 'expired'
export type AdminSupportPaymentStatus = 'pending' | 'paid' | 'cancelled'
export type AdminSupportSource = 'payos' | 'redemption' | 'manual' | null

export type AdminSupportUserSearchResult = {
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  onboarded: boolean
  bankConfigured: boolean
  groupCount: number
  premiumPlan: AdminSupportPlan
  createdAt: string
}

export type AdminSupportProfile = {
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  onboardedAt: string | null
  createdAt: string
  updatedAt: string | null
  bankConfigured: boolean
  bankCode: string | null
  bankAccountLast4: string | null
}

export type AdminSupportGroupMember = {
  memberId: string
  userId: string | null
  email: string | null
  name: string
  role: 'owner' | 'member'
  bankConfigured: boolean
  joinedAt: string
}

export type AdminSupportGroup = {
  groupId: string
  name: string
  emoji: string | null
  baseCurrency: string
  settlementMethod: string
  ownerId: string
  ownerEmail: string | null
  memberId: string
  memberName: string
  memberRole: 'owner' | 'member'
  isOwner: boolean
  memberCount: number
  expenseCount: number
  settlementCount: number
  createdAt: string
  updatedAt: string | null
  version: number
  members: AdminSupportGroupMember[]
}

export type AdminSupportSubscription = {
  userId: string
  plan: AdminSupportPlan
  status: AdminSupportSubscriptionStatus
  periodEnd: string | null
  source: AdminSupportSource
  teamId: string | null
  daysLeft: number | null
  createdAt: string
  updatedAt: string | null
}

export type AdminSupportPayment = {
  orderCode: string
  plan: Exclude<AdminSupportPlan, 'free'>
  cycle: 'month' | 'year'
  amount: number
  status: AdminSupportPaymentStatus
  createdAt: string
  paidAt: string | null
}

export type AdminSupportRedemption = {
  id: string
  code: string
  plan: Exclude<AdminSupportPlan, 'free'> | null
  durationDays: number | null
  usedAt: string
}

export type AdminSupportAiUsage = {
  feature: string
  period: string
  count: number
  updatedAt: string
}

export type AdminSupportPushEndpointHost = {
  host: string
  count: number
}

export type AdminSupportPushHealth = {
  subscriptionCount: number
  latestCreatedAt: string | null
  endpointHosts: AdminSupportPushEndpointHost[]
}

export type AdminSupportSnapshot = {
  checkedAt: string
  profile: AdminSupportProfile
  groups: AdminSupportGroup[]
  subscription: AdminSupportSubscription | null
  payments: AdminSupportPayment[]
  redemptions: AdminSupportRedemption[]
  aiUsage: AdminSupportAiUsage[]
  push: AdminSupportPushHealth
}

export type AdminSupportSearchFilters = {
  query: string
  limit?: number
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminSupportClient = {
  functions: {
    invoke: (name: 'admin-support', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminSupportClient | null): AdminSupportClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminSupportClient) : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return typeof value === 'string' && value.length > 0 ? value : null
}

function cleanText(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? ''
  return clean.length > 0 ? clean : null
}

function bool(value: unknown): boolean {
  return value === true || value === 'true'
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(n) ? n : 0
}

function optionalNumber(value: unknown): number | null {
  if (value == null) return null
  const n = numberValue(value)
  return Number.isFinite(n) ? n : null
}

function limitedPositiveInt(value: number | undefined, min: number, max: number) {
  const n = Number.isFinite(value) ? Math.trunc(value as number) : min
  return Math.min(Math.max(n, min), max)
}

function normalizePlan(value: unknown): AdminSupportPlan | null {
  return value === 'free' || value === 'personal' || value === 'team' ? value : null
}

function normalizePaidPlan(value: unknown): Exclude<AdminSupportPlan, 'free'> | null {
  return value === 'personal' || value === 'team' ? value : null
}

function normalizeSubscriptionStatus(value: unknown): AdminSupportSubscriptionStatus | null {
  return value === 'active' || value === 'expired' ? value : null
}

function normalizePaymentStatus(value: unknown): AdminSupportPaymentStatus | null {
  return value === 'pending' || value === 'paid' || value === 'cancelled' ? value : null
}

function normalizeCycle(value: unknown): 'month' | 'year' | null {
  return value === 'month' || value === 'year' ? value : null
}

function normalizeSource(value: unknown): AdminSupportSource {
  return value === 'payos' || value === 'redemption' || value === 'manual' ? value : null
}

function normalizeRole(value: unknown): 'owner' | 'member' | null {
  return value === 'owner' || value === 'member' ? value : null
}

function normalizeSearchResult(row: unknown): AdminSupportUserSearchResult | null {
  if (!isRecord(row)) return null
  const userId = text(row.user_id)
  const email = text(row.email)
  const createdAt = text(row.created_at)
  if (!userId || !email || !createdAt) return null
  return {
    userId,
    email,
    displayName: text(row.display_name),
    avatarUrl: text(row.avatar_url),
    onboarded: bool(row.onboarded),
    bankConfigured: bool(row.bank_configured),
    groupCount: numberValue(row.group_count),
    premiumPlan: normalizePlan(row.premium_plan) ?? 'free',
    createdAt,
  }
}

function normalizeProfile(row: unknown): AdminSupportProfile | null {
  if (!isRecord(row)) return null
  const userId = text(row.user_id)
  const email = text(row.email)
  const createdAt = text(row.created_at)
  if (!userId || !email || !createdAt) return null
  return {
    userId,
    email,
    displayName: text(row.display_name),
    avatarUrl: text(row.avatar_url),
    onboardedAt: text(row.onboarded_at),
    createdAt,
    updatedAt: text(row.updated_at),
    bankConfigured: bool(row.bank_configured),
    bankCode: text(row.bank_code),
    bankAccountLast4: text(row.bank_account_last4),
  }
}

function normalizeGroupMember(row: unknown): AdminSupportGroupMember | null {
  if (!isRecord(row)) return null
  const memberId = text(row.member_id)
  const name = text(row.name)
  const role = normalizeRole(row.role)
  const joinedAt = text(row.joined_at)
  if (!memberId || !name || !role || !joinedAt) return null
  return {
    memberId,
    userId: text(row.user_id),
    email: text(row.email),
    name,
    role,
    bankConfigured: bool(row.bank_configured),
    joinedAt,
  }
}

function normalizeGroup(row: unknown): AdminSupportGroup | null {
  if (!isRecord(row)) return null
  const groupId = text(row.group_id)
  const name = text(row.name)
  const baseCurrency = text(row.base_currency)
  const settlementMethod = text(row.settlement_method)
  const ownerId = text(row.owner_id)
  const memberId = text(row.member_id)
  const memberName = text(row.member_name)
  const memberRole = normalizeRole(row.member_role)
  const createdAt = text(row.created_at)
  if (!groupId || !name || !baseCurrency || !settlementMethod || !ownerId || !memberId || !memberName || !memberRole || !createdAt) return null
  return {
    groupId,
    name,
    emoji: text(row.emoji),
    baseCurrency,
    settlementMethod,
    ownerId,
    ownerEmail: text(row.owner_email),
    memberId,
    memberName,
    memberRole,
    isOwner: bool(row.is_owner),
    memberCount: numberValue(row.member_count),
    expenseCount: numberValue(row.expense_count),
    settlementCount: numberValue(row.settlement_count),
    createdAt,
    updatedAt: text(row.updated_at),
    version: numberValue(row.version),
    members: Array.isArray(row.members) ? row.members.map(normalizeGroupMember).filter(Boolean) as AdminSupportGroupMember[] : [],
  }
}

function normalizeSubscription(row: unknown): AdminSupportSubscription | null {
  if (!isRecord(row)) return null
  const userId = text(row.user_id)
  const plan = normalizePlan(row.plan)
  const status = normalizeSubscriptionStatus(row.status)
  const createdAt = text(row.created_at)
  if (!userId || !plan || !status || !createdAt) return null
  return {
    userId,
    plan,
    status,
    periodEnd: text(row.period_end),
    source: normalizeSource(row.source),
    teamId: text(row.team_id),
    daysLeft: optionalNumber(row.days_left),
    createdAt,
    updatedAt: text(row.updated_at),
  }
}

function normalizePayment(row: unknown): AdminSupportPayment | null {
  if (!isRecord(row)) return null
  const orderCode = text(row.order_code)
  const plan = normalizePaidPlan(row.plan)
  const cycle = normalizeCycle(row.cycle)
  const status = normalizePaymentStatus(row.status)
  const createdAt = text(row.created_at)
  if (!orderCode || !plan || !cycle || !status || !createdAt) return null
  return {
    orderCode,
    plan,
    cycle,
    amount: numberValue(row.amount),
    status,
    createdAt,
    paidAt: text(row.paid_at),
  }
}

function normalizeRedemption(row: unknown): AdminSupportRedemption | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const code = text(row.code)
  const usedAt = text(row.used_at)
  if (!id || !code || !usedAt) return null
  return {
    id,
    code,
    plan: normalizePaidPlan(row.plan),
    durationDays: optionalNumber(row.duration_days),
    usedAt,
  }
}

function normalizeAiUsage(row: unknown): AdminSupportAiUsage | null {
  if (!isRecord(row)) return null
  const feature = text(row.feature)
  const period = text(row.period)
  const updatedAt = text(row.updated_at)
  if (!feature || !period || !updatedAt) return null
  return { feature, period, count: numberValue(row.count), updatedAt }
}

function normalizePushHost(row: unknown): AdminSupportPushEndpointHost | null {
  if (!isRecord(row)) return null
  const host = text(row.host)
  if (!host) return null
  return { host, count: numberValue(row.count) }
}

function normalizePush(row: unknown): AdminSupportPushHealth {
  if (!isRecord(row)) return { subscriptionCount: 0, latestCreatedAt: null, endpointHosts: [] }
  return {
    subscriptionCount: numberValue(row.subscription_count),
    latestCreatedAt: text(row.latest_created_at),
    endpointHosts: Array.isArray(row.endpoint_hosts) ? row.endpoint_hosts.map(normalizePushHost).filter(Boolean) as AdminSupportPushEndpointHost[] : [],
  }
}

function normalizeSnapshot(row: unknown): AdminSupportSnapshot | null {
  if (!isRecord(row)) return null
  const checkedAt = text(row.checked_at)
  const profile = normalizeProfile(row.profile)
  if (!checkedAt || !profile) return null
  return {
    checkedAt,
    profile,
    groups: Array.isArray(row.groups) ? row.groups.map(normalizeGroup).filter(Boolean) as AdminSupportGroup[] : [],
    subscription: normalizeSubscription(row.subscription),
    payments: Array.isArray(row.payments) ? row.payments.map(normalizePayment).filter(Boolean) as AdminSupportPayment[] : [],
    redemptions: Array.isArray(row.redemptions) ? row.redemptions.map(normalizeRedemption).filter(Boolean) as AdminSupportRedemption[] : [],
    aiUsage: Array.isArray(row.ai_usage) ? row.ai_usage.map(normalizeAiUsage).filter(Boolean) as AdminSupportAiUsage[] : [],
    push: normalizePush(row.push),
  }
}

async function invokeAdminSupport(
  client: AdminSupportClient | null | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-support', { body })
    if (error || !isRecord(data)) return null
    return data
  } catch {
    return null
  }
}

export async function searchAdminSupportUsers(
  client: AdminSupportClient | null | undefined,
  filters: AdminSupportSearchFilters,
): Promise<AdminSupportUserSearchResult[]> {
  const query = cleanText(filters.query)
  if (!query) return []
  const data = await invokeAdminSupport(client, {
    action: 'search_users',
    query,
    limit: limitedPositiveInt(filters.limit, 1, 50),
  })
  return Array.isArray(data?.users) ? data.users.map(normalizeSearchResult).filter(Boolean) as AdminSupportUserSearchResult[] : []
}

export async function loadAdminSupportUser(
  client: AdminSupportClient | null | undefined,
  query: string,
): Promise<AdminSupportSnapshot | null> {
  const clean = cleanText(query)
  if (!clean) return null
  const data = await invokeAdminSupport(client, { action: 'user_snapshot', query: clean })
  return normalizeSnapshot(data)
}
