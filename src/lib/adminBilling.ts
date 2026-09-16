import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminBillingStatus = 'ok' | 'configured' | 'missing' | 'failed' | 'unknown'
export type AdminBillingPlan = 'free' | 'personal' | 'team'
export type AdminBillingGrantPlan = Exclude<AdminBillingPlan, 'free'>
export type AdminBillingSubscriptionStatus = 'active' | 'expired'
export type AdminBillingPaymentStatus = 'pending' | 'paid' | 'cancelled'
export type AdminBillingSource = 'payos' | 'redemption' | 'manual' | null

export type AdminBillingProvider = {
  status: AdminBillingStatus
  detail: string
  stalePendingCount: number
}

export type AdminBillingMetric = {
  id: string
  label: string
  value: number
  detail: string | null
}

export type AdminBillingSubscription = {
  userId: string
  userEmail: string | null
  displayName: string | null
  plan: AdminBillingPlan
  status: AdminBillingSubscriptionStatus
  periodEnd: string | null
  source: AdminBillingSource
  teamId: string | null
  daysLeft: number | null
  createdAt: string
  updatedAt: string | null
}

export type AdminBillingPaymentOrder = {
  orderCode: string
  userId: string
  userEmail: string | null
  displayName: string | null
  plan: AdminBillingGrantPlan
  cycle: 'month' | 'year'
  amount: number
  status: AdminBillingPaymentStatus
  createdAt: string
  paidAt: string | null
}

export type AdminBillingError = {
  id: string
  source: string
  action: string | null
  message: string | null
  createdAt: string
}

export type AdminBillingProfile = {
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}

export type AdminBillingRedemption = {
  id: string
  code: string
  plan: AdminBillingGrantPlan | null
  durationDays: number | null
  usedAt: string
}

export type AdminBillingUserDetail = {
  profile: AdminBillingProfile
  subscription: AdminBillingSubscription | null
  payments: AdminBillingPaymentOrder[]
  redemptions: AdminBillingRedemption[]
}

export type AdminBillingSnapshot = {
  checkedAt: string
  summaryStatus: AdminBillingStatus
  provider: AdminBillingProvider
  metrics: AdminBillingMetric[]
  subscriptions: AdminBillingSubscription[]
  payments: AdminBillingPaymentOrder[]
  recentErrors: AdminBillingError[]
}

export type AdminBillingSnapshotFilters = {
  search?: string
  subscriptionStatus?: AdminBillingSubscriptionStatus | 'all'
  paymentStatus?: AdminBillingPaymentStatus | 'all'
  limit?: number
}

export type AdminBillingGrantInput = {
  userEmail?: string | null
  userId?: string | null
  plan: AdminBillingGrantPlan
  days: number
  note?: string | null
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminBillingClient = {
  functions: {
    invoke: (name: 'admin-billing', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminBillingClient | null): AdminBillingClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminBillingClient) : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return typeof value === 'string' && value.length > 0 ? value : null
}

function normalizedText(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? ''
  return clean.length > 0 ? clean : null
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

function limitedPositiveInt(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.trunc(value), min), max)
}

function normalizeStatus(value: unknown): AdminBillingStatus {
  return value === 'ok' || value === 'configured' || value === 'missing' || value === 'failed' ? value : 'unknown'
}

function normalizePlan(value: unknown): AdminBillingPlan | null {
  return value === 'free' || value === 'personal' || value === 'team' ? value : null
}

function normalizeGrantPlan(value: unknown): AdminBillingGrantPlan | null {
  return value === 'personal' || value === 'team' ? value : null
}

function normalizeSubscriptionStatus(value: unknown): AdminBillingSubscriptionStatus | null {
  return value === 'active' || value === 'expired' ? value : null
}

function normalizePaymentStatus(value: unknown): AdminBillingPaymentStatus | null {
  return value === 'pending' || value === 'paid' || value === 'cancelled' ? value : null
}

function normalizeCycle(value: unknown): 'month' | 'year' | null {
  return value === 'month' || value === 'year' ? value : null
}

function normalizeSource(value: unknown): AdminBillingSource {
  return value === 'payos' || value === 'redemption' || value === 'manual' ? value : null
}

function normalizeProvider(row: unknown): AdminBillingProvider | null {
  if (!isRecord(row)) return null
  const detail = text(row.detail)
  if (!detail) return null
  return {
    status: normalizeStatus(row.status),
    detail,
    stalePendingCount: numberValue(row.stale_pending_count),
  }
}

function normalizeMetric(row: unknown): AdminBillingMetric | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const label = text(row.label)
  if (!id || !label) return null
  return {
    id,
    label,
    value: numberValue(row.value),
    detail: text(row.detail),
  }
}

function normalizeSubscription(row: unknown): AdminBillingSubscription | null {
  if (!isRecord(row)) return null
  const userId = text(row.user_id)
  const plan = normalizePlan(row.plan)
  const status = normalizeSubscriptionStatus(row.status)
  const createdAt = text(row.created_at)
  if (!userId || !plan || !status || !createdAt) return null
  return {
    userId,
    userEmail: text(row.user_email),
    displayName: text(row.display_name),
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

function normalizePayment(row: unknown): AdminBillingPaymentOrder | null {
  if (!isRecord(row)) return null
  const orderCode = text(row.order_code)
  const userId = text(row.user_id)
  const plan = normalizeGrantPlan(row.plan)
  const cycle = normalizeCycle(row.cycle)
  const status = normalizePaymentStatus(row.status)
  const createdAt = text(row.created_at)
  if (!orderCode || !userId || !plan || !cycle || !status || !createdAt) return null
  return {
    orderCode,
    userId,
    userEmail: text(row.user_email),
    displayName: text(row.display_name),
    plan,
    cycle,
    amount: numberValue(row.amount),
    status,
    createdAt,
    paidAt: text(row.paid_at),
  }
}

function normalizeError(row: unknown): AdminBillingError | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const source = text(row.source)
  const createdAt = text(row.created_at)
  if (!id || !source || !createdAt) return null
  return {
    id,
    source,
    action: text(row.action),
    message: text(row.message),
    createdAt,
  }
}

function normalizeProfile(row: unknown): AdminBillingProfile | null {
  if (!isRecord(row)) return null
  const userId = text(row.user_id)
  const email = text(row.email)
  if (!userId || !email) return null
  return {
    userId,
    email,
    displayName: text(row.display_name),
    avatarUrl: text(row.avatar_url),
  }
}

function normalizeRedemption(row: unknown): AdminBillingRedemption | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const code = text(row.code)
  const usedAt = text(row.used_at)
  if (!id || !code || !usedAt) return null
  return {
    id,
    code,
    plan: normalizeGrantPlan(row.plan),
    durationDays: optionalNumber(row.duration_days),
    usedAt,
  }
}

function normalizeSnapshot(row: unknown): AdminBillingSnapshot | null {
  if (!isRecord(row)) return null
  const checkedAt = text(row.checked_at)
  const provider = normalizeProvider(row.provider)
  if (!checkedAt || !provider) return null
  return {
    checkedAt,
    summaryStatus: normalizeStatus(row.summary_status),
    provider,
    metrics: Array.isArray(row.metrics) ? row.metrics.map(normalizeMetric).filter(Boolean) as AdminBillingMetric[] : [],
    subscriptions: Array.isArray(row.subscriptions) ? row.subscriptions.map(normalizeSubscription).filter(Boolean) as AdminBillingSubscription[] : [],
    payments: Array.isArray(row.payments) ? row.payments.map(normalizePayment).filter(Boolean) as AdminBillingPaymentOrder[] : [],
    recentErrors: Array.isArray(row.recent_errors) ? row.recent_errors.map(normalizeError).filter(Boolean) as AdminBillingError[] : [],
  }
}

function normalizeUserDetail(row: unknown): AdminBillingUserDetail | null {
  if (!isRecord(row)) return null
  const profile = normalizeProfile(row.profile)
  if (!profile) return null
  return {
    profile,
    subscription: normalizeSubscription(row.subscription),
    payments: Array.isArray(row.payments) ? row.payments.map(normalizePayment).filter(Boolean) as AdminBillingPaymentOrder[] : [],
    redemptions: Array.isArray(row.redemptions) ? row.redemptions.map(normalizeRedemption).filter(Boolean) as AdminBillingRedemption[] : [],
  }
}

async function invokeAdminBilling(
  client: AdminBillingClient | null | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-billing', { body })
    if (error || !isRecord(data)) return null
    return data
  } catch {
    return null
  }
}

export async function loadAdminBillingSnapshot(
  client?: AdminBillingClient | null,
  filters: AdminBillingSnapshotFilters = {},
): Promise<AdminBillingSnapshot | null> {
  const data = await invokeAdminBilling(client, {
    action: 'snapshot',
    search: normalizedText(filters.search),
    subscription_status: filters.subscriptionStatus && filters.subscriptionStatus !== 'all' ? filters.subscriptionStatus : null,
    payment_status: filters.paymentStatus && filters.paymentStatus !== 'all' ? filters.paymentStatus : null,
    limit: limitedPositiveInt(filters.limit ?? 50, 1, 100),
  })
  return normalizeSnapshot(data)
}

export async function lookupAdminBillingUser(
  client: AdminBillingClient | null | undefined,
  query: string,
): Promise<AdminBillingUserDetail | null> {
  const clean = normalizedText(query)
  if (!clean) return null
  const data = await invokeAdminBilling(client, { action: 'lookup_user', query: clean })
  return normalizeUserDetail(data)
}

export async function grantAdminPremium(
  client: AdminBillingClient | null | undefined,
  input: AdminBillingGrantInput,
): Promise<AdminBillingSubscription | null> {
  const data = await invokeAdminBilling(client, {
    action: 'manual_grant',
    user_email: normalizedText(input.userEmail),
    user_id: normalizedText(input.userId),
    plan: input.plan,
    days: limitedPositiveInt(input.days, 1, 3650),
    note: normalizedText(input.note),
  })
  return isRecord(data) ? normalizeSubscription(data.subscription) : null
}
