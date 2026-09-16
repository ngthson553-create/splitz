import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type MaintenanceBannerSeverity = 'info' | 'warning' | 'critical'

export type MaintenanceBanner = {
  enabled: true
  title: string
  message: string
  severity: MaintenanceBannerSeverity
  startsAt: string | null
  endsAt: string | null
}

type RpcResult = PromiseLike<{ data: unknown; error: unknown }>

type SystemConfigRpcClient = {
  rpc: (name: 'current_maintenance_banner') => RpcResult
}

function getClient(client?: SystemConfigRpcClient | null): SystemConfigRpcClient | null {
  return client ?? (isSupabaseConfigured ? getSupabase() : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function severity(value: unknown): MaintenanceBannerSeverity {
  return value === 'warning' || value === 'critical' ? value : 'info'
}

function normalizeMaintenanceBanner(row: unknown): MaintenanceBanner | null {
  if (!isRecord(row) || row.enabled !== true) return null
  const title = text(row.title)
  if (!title) return null
  return {
    enabled: true,
    title,
    message: text(row.message) ?? '',
    severity: severity(row.severity),
    startsAt: text(row.starts_at),
    endsAt: text(row.ends_at),
  }
}

export async function loadCurrentMaintenanceBanner(
  client?: SystemConfigRpcClient | null,
): Promise<MaintenanceBanner | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.rpc('current_maintenance_banner')
    if (error) return null
    return normalizeMaintenanceBanner(data)
  } catch {
    return null
  }
}
