import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminRedeemPlan = 'personal' | 'team'
export type AdminRedeemStatus = 'active' | 'expired' | 'exhausted' | 'revoked'

export type AdminRedeemUse = {
  id: string
  usedBy: string | null
  usedEmail: string | null
  usedAt: string
}

export type AdminRedeemCode = {
  code: string
  plan: AdminRedeemPlan
  durationDays: number
  maxUses: number
  usedCount: number
  status: AdminRedeemStatus
  expiresAt: string | null
  createdAt: string
  internalNote: string | null
  batchId: string | null
  batchPrefix: string | null
  uses: AdminRedeemUse[]
}

export type AdminRedeemListFilters = {
  search?: string
  status?: AdminRedeemStatus | 'all'
  limit?: number
}

export type AdminRedeemCreateInput = {
  code?: string | null
  plan: AdminRedeemPlan
  durationDays: number
  maxUses: number
  expiresAt?: string | null
  internalNote?: string | null
}

export type AdminRedeemBatchInput = {
  prefix: string
  count: number
  plan: AdminRedeemPlan
  durationDays: number
  maxUses: number
  expiresAt?: string | null
  internalNote?: string | null
}

export type AdminRedeemBatchResult = {
  batchId: string | null
  codes: string[]
}

type RpcResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminRedeemRpcClient = {
  rpc: (
    name:
      | 'admin_create_redeem_code'
      | 'admin_create_redeem_batch'
      | 'admin_list_redeem_codes'
      | 'admin_lookup_redeem_code'
      | 'admin_revoke_redeem_code',
    params?: Record<string, unknown>,
  ) => RpcResult
}

function getRedeemClient(client?: AdminRedeemRpcClient | null): AdminRedeemRpcClient | null {
  return client ?? (isSupabaseConfigured ? getSupabase() : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numberValue(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : null
}

function normalizePlan(value: unknown): AdminRedeemPlan | null {
  return value === 'personal' || value === 'team' ? value : null
}

function normalizeStatus(value: unknown): AdminRedeemStatus | null {
  return value === 'active' || value === 'expired' || value === 'exhausted' || value === 'revoked' ? value : null
}

function normalizeUse(row: unknown): AdminRedeemUse | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const usedAt = text(row.used_at)
  if (!id || !usedAt) return null
  return {
    id,
    usedBy: text(row.used_by),
    usedEmail: text(row.used_email),
    usedAt,
  }
}

function normalizeRedeemCode(row: unknown): AdminRedeemCode | null {
  if (!isRecord(row)) return null
  const code = text(row.code)
  const plan = normalizePlan(row.plan)
  const durationDays = numberValue(row.duration_days)
  const maxUses = numberValue(row.max_uses)
  const usedCount = numberValue(row.used_count)
  const status = normalizeStatus(row.status)
  const createdAt = text(row.created_at)
  if (!code || !plan || durationDays == null || maxUses == null || usedCount == null || !status || !createdAt) {
    return null
  }
  const rawUses = Array.isArray(row.uses) ? row.uses : []
  return {
    code,
    plan,
    durationDays,
    maxUses,
    usedCount,
    status,
    expiresAt: text(row.expires_at),
    createdAt,
    internalNote: text(row.internal_note),
    batchId: text(row.batch_id),
    batchPrefix: text(row.batch_prefix),
    uses: rawUses.map(normalizeUse).filter((item): item is AdminRedeemUse => Boolean(item)),
  }
}

function normalizedCode(value: string | null | undefined): string | null {
  const clean = value?.trim().toUpperCase() ?? ''
  return clean.length > 0 ? clean : null
}

function normalizedText(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? ''
  return clean.length > 0 ? clean : null
}

function limitedPositiveInt(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.trunc(value), min), max)
}

export async function createAdminRedeemCode(
  client: AdminRedeemRpcClient | null | undefined,
  input: AdminRedeemCreateInput,
): Promise<string | null> {
  const rpcClient = getRedeemClient(client)
  if (!rpcClient) return null

  try {
    const { data, error } = await rpcClient.rpc('admin_create_redeem_code', {
      p_code: normalizedCode(input.code),
      p_plan: input.plan,
      p_duration_days: limitedPositiveInt(input.durationDays, 1, 3650),
      p_max_uses: limitedPositiveInt(input.maxUses, 1, 10000),
      p_expires_at: input.expiresAt ?? null,
      p_internal_note: normalizedText(input.internalNote),
    })
    if (error) return null
    return text(data)
  } catch {
    return null
  }
}

export async function createAdminRedeemBatch(
  client: AdminRedeemRpcClient | null | undefined,
  input: AdminRedeemBatchInput,
): Promise<AdminRedeemBatchResult | null> {
  const rpcClient = getRedeemClient(client)
  if (!rpcClient) return null

  try {
    const { data, error } = await rpcClient.rpc('admin_create_redeem_batch', {
      p_prefix: normalizedCode(input.prefix) ?? 'SPLITZ',
      p_count: limitedPositiveInt(input.count, 1, 200),
      p_plan: input.plan,
      p_duration_days: limitedPositiveInt(input.durationDays, 1, 3650),
      p_max_uses: limitedPositiveInt(input.maxUses, 1, 10000),
      p_expires_at: input.expiresAt ?? null,
      p_internal_note: normalizedText(input.internalNote),
    })
    if (error || !Array.isArray(data)) return null
    const codes = data.map((row) => (isRecord(row) ? text(row.code) : null)).filter((code): code is string => Boolean(code))
    const batchId = data.length > 0 && isRecord(data[0]) ? text(data[0].batch_id) : null
    return { batchId, codes }
  } catch {
    return null
  }
}

export async function listAdminRedeemCodes(
  client?: AdminRedeemRpcClient | null,
  filters: AdminRedeemListFilters = {},
): Promise<AdminRedeemCode[]> {
  const rpcClient = getRedeemClient(client)
  if (!rpcClient) return []

  try {
    const { data, error } = await rpcClient.rpc('admin_list_redeem_codes', {
      p_search: normalizedText(filters.search),
      p_status: filters.status && filters.status !== 'all' ? filters.status : null,
      p_limit: limitedPositiveInt(filters.limit ?? 50, 1, 100),
    })
    if (error || !Array.isArray(data)) return []
    return data.map(normalizeRedeemCode).filter((row): row is AdminRedeemCode => Boolean(row))
  } catch {
    return []
  }
}

export async function lookupAdminRedeemCode(
  client: AdminRedeemRpcClient | null | undefined,
  code: string,
): Promise<AdminRedeemCode | null> {
  const rpcClient = getRedeemClient(client)
  if (!rpcClient) return null

  try {
    const { data, error } = await rpcClient.rpc('admin_lookup_redeem_code', { p_code: normalizedCode(code) })
    if (error || !Array.isArray(data)) return null
    return normalizeRedeemCode(data[0])
  } catch {
    return null
  }
}

export async function revokeAdminRedeemCode(
  client: AdminRedeemRpcClient | null | undefined,
  code: string,
  reason?: string | null,
): Promise<string | null> {
  const rpcClient = getRedeemClient(client)
  if (!rpcClient) return null

  try {
    const { data, error } = await rpcClient.rpc('admin_revoke_redeem_code', {
      p_code: normalizedCode(code),
      p_reason: normalizedText(reason),
    })
    if (error) return null
    return text(data)
  } catch {
    return null
  }
}
