import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminDataQualitySeverity = 'critical' | 'warning' | 'info'

export type AdminDataQualitySummary = {
  totalIssues: number
  critical: number
  warning: number
  info: number
  scannersRun: number
}

export type AdminDataQualityIssue = {
  id: string
  scanner: string
  severity: AdminDataQualitySeverity
  title: string
  detail: string | null
  targetType: string | null
  targetId: string | null
  detectedAt: string
  metadata: Record<string, unknown>
}

export type AdminDataQualityRecentScan = {
  id: string
  checkedAt: string
  totalIssues: number
  critical: number
  warning: number
  info: number
}

export type AdminDataQualitySnapshot = {
  scanId: string | null
  checkedAt: string
  summary: AdminDataQualitySummary
  issues: AdminDataQualityIssue[]
  recentScans: AdminDataQualityRecentScan[]
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminDataQualityClient = {
  functions: {
    invoke: (name: 'admin-data-quality', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminDataQualityClient | null): AdminDataQualityClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminDataQualityClient) : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(n) ? n : 0
}

function severity(value: unknown): AdminDataQualitySeverity | null {
  return value === 'critical' || value === 'warning' || value === 'info' ? value : null
}

function metadata(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function normalizeSummary(row: unknown): AdminDataQualitySummary {
  const value = isRecord(row) ? row : {}
  return {
    totalIssues: numberValue(value.total_issues),
    critical: numberValue(value.critical),
    warning: numberValue(value.warning),
    info: numberValue(value.info),
    scannersRun: numberValue(value.scanners_run),
  }
}

function normalizeIssue(row: unknown): AdminDataQualityIssue | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const scanner = text(row.scanner)
  const issueSeverity = severity(row.severity)
  const title = text(row.title)
  const detectedAt = text(row.detected_at)
  if (!id || !scanner || !issueSeverity || !title || !detectedAt) return null
  return {
    id,
    scanner,
    severity: issueSeverity,
    title,
    detail: text(row.detail),
    targetType: text(row.target_type),
    targetId: text(row.target_id),
    detectedAt,
    metadata: metadata(row.metadata),
  }
}

function normalizeRecentScan(row: unknown): AdminDataQualityRecentScan | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const checkedAt = text(row.checked_at)
  if (!id || !checkedAt) return null
  return {
    id,
    checkedAt,
    totalIssues: numberValue(row.total_issues),
    critical: numberValue(row.critical),
    warning: numberValue(row.warning),
    info: numberValue(row.info),
  }
}

function normalizeSnapshot(row: unknown): AdminDataQualitySnapshot | null {
  if (!isRecord(row)) return null
  const checkedAt = text(row.checked_at)
  if (!checkedAt) return null
  return {
    scanId: text(row.scan_id),
    checkedAt,
    summary: normalizeSummary(row.summary),
    issues: Array.isArray(row.issues) ? row.issues.map(normalizeIssue).filter((issue): issue is AdminDataQualityIssue => Boolean(issue)) : [],
    recentScans: Array.isArray(row.recent_scans) ? row.recent_scans.map(normalizeRecentScan).filter((scan): scan is AdminDataQualityRecentScan => Boolean(scan)) : [],
  }
}

export async function loadAdminDataQualitySnapshot(
  client?: AdminDataQualityClient | null,
): Promise<AdminDataQualitySnapshot | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-data-quality', { body: { action: 'snapshot' } })
    if (error) return null
    return normalizeSnapshot(data)
  } catch {
    return null
  }
}
