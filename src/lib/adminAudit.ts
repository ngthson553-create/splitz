import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminAuditStatus = 'success' | 'failed'

export type AdminAuditLog = {
  id: string
  actorUserId: string | null
  actorEmail: string | null
  actorRole: string | null
  action: string
  targetType: string | null
  targetId: string | null
  payloadSummary: unknown
  status: AdminAuditStatus
  errorMessage: string | null
  createdAt: string
}

export type AdminAuditListFilters = {
  status?: AdminAuditStatus
  action?: string
  limit?: number
}

export type AdminAuditWriteInput = {
  action: string
  targetType?: string | null
  targetId?: string | null
  payloadSummary?: unknown
  status: AdminAuditStatus
  errorMessage?: string | null
}

type RpcResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminAuditRpcClient = {
  rpc: (name: 'admin_list_audit_logs' | 'admin_write_audit_log', params?: Record<string, unknown>) => RpcResult
}

function getAuditClient(client?: AdminAuditRpcClient | null): AdminAuditRpcClient | null {
  return client ?? (isSupabaseConfigured ? getSupabase() : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeStatus(value: unknown): AdminAuditStatus | null {
  return value === 'success' || value === 'failed' ? value : null
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function normalizeAuditLog(row: unknown): AdminAuditLog | null {
  if (!isRecord(row)) return null
  const id = normalizeText(row.id)
  const action = normalizeText(row.action)
  const status = normalizeStatus(row.status)
  const createdAt = normalizeText(row.created_at)
  if (!id || !action || !status || !createdAt) return null

  return {
    id,
    actorUserId: normalizeText(row.actor_user_id),
    actorEmail: normalizeText(row.actor_email),
    actorRole: normalizeText(row.actor_role),
    action,
    targetType: normalizeText(row.target_type),
    targetId: normalizeText(row.target_id),
    payloadSummary: row.payload_summary ?? null,
    status,
    errorMessage: normalizeText(row.error_message),
    createdAt,
  }
}

export async function listAdminAuditLogs(
  client?: AdminAuditRpcClient | null,
  filters: AdminAuditListFilters = {},
): Promise<AdminAuditLog[]> {
  const rpcClient = getAuditClient(client)
  if (!rpcClient) return []

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100)
  const action = filters.action?.trim() || null

  try {
    const { data, error } = await rpcClient.rpc('admin_list_audit_logs', {
      p_status: filters.status ?? null,
      p_action: action,
      p_limit: limit,
    })
    if (error || !Array.isArray(data)) return []
    return data.map(normalizeAuditLog).filter((row): row is AdminAuditLog => Boolean(row))
  } catch {
    return []
  }
}

export async function writeAdminAuditLog(
  client: AdminAuditRpcClient | null | undefined,
  input: AdminAuditWriteInput,
): Promise<string | null> {
  const rpcClient = getAuditClient(client)
  if (!rpcClient) return null

  try {
    const { data, error } = await rpcClient.rpc('admin_write_audit_log', {
      p_action: input.action,
      p_target_type: input.targetType ?? null,
      p_target_id: input.targetId ?? null,
      p_payload_summary: input.payloadSummary ?? {},
      p_status: input.status,
      p_error_message: input.errorMessage ?? null,
    })
    if (error) return null
    return typeof data === 'string' && data.length > 0 ? data : null
  } catch {
    return null
  }
}
