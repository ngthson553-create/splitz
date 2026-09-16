import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminHealthStatus = 'ok' | 'configured' | 'missing' | 'failed' | 'unknown'
export type AdminHealthJobStatus = 'all' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
export type AdminHealthJobSource = 'notification_jobs' | 'admin_job_runs'

export type AdminHealthCard = {
  id: string
  label: string
  status: AdminHealthStatus
  detail: string
  lastSuccessAt: string | null
  lastErrorAt: string | null
  lastError: string | null
}

export type AdminHealthMetric = {
  id: string
  label: string
  value: number
  detail: string | null
}

export type AdminHealthJob = {
  id: string
  source: AdminHealthJobSource
  jobType: string
  status: Exclude<AdminHealthJobStatus, 'all'>
  targetType: string | null
  targetValue: string | null
  targetCount: number
  resultSummary: Record<string, unknown>
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export type AdminHealthError = {
  id: string
  source: string
  action: string | null
  message: string | null
  createdAt: string
}

export type AdminHealthSnapshot = {
  checkedAt: string
  summaryStatus: AdminHealthStatus
  cards: AdminHealthCard[]
  metrics: AdminHealthMetric[]
  jobs: AdminHealthJob[]
  recentErrors: AdminHealthError[]
}

export type AdminHealthFilters = {
  jobStatus?: AdminHealthJobStatus
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminHealthClient = {
  functions: {
    invoke: (name: 'admin-health', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminHealthClient | null): AdminHealthClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminHealthClient) : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(n) ? n : 0
}

function normalizeStatus(value: unknown): AdminHealthStatus {
  return value === 'ok' || value === 'configured' || value === 'missing' || value === 'failed' ? value : 'unknown'
}

function normalizeJobStatus(value: unknown): Exclude<AdminHealthJobStatus, 'all'> | null {
  return value === 'queued' || value === 'running' || value === 'succeeded' || value === 'failed' || value === 'cancelled'
    ? value
    : null
}

function normalizeJobSource(value: unknown): AdminHealthJobSource | null {
  return value === 'notification_jobs' || value === 'admin_job_runs' ? value : null
}

function normalizeCard(row: unknown): AdminHealthCard | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const label = text(row.label)
  const detail = text(row.detail)
  if (!id || !label || !detail) return null
  return {
    id,
    label,
    status: normalizeStatus(row.status),
    detail,
    lastSuccessAt: text(row.last_success_at),
    lastErrorAt: text(row.last_error_at),
    lastError: text(row.last_error),
  }
}

function normalizeMetric(row: unknown): AdminHealthMetric | null {
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

function normalizeJob(row: unknown): AdminHealthJob | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const source = normalizeJobSource(row.source)
  const jobType = text(row.job_type)
  const status = normalizeJobStatus(row.status)
  const createdAt = text(row.created_at)
  if (!id || !source || !jobType || !status || !createdAt) return null
  return {
    id,
    source,
    jobType,
    status,
    targetType: text(row.target_type),
    targetValue: text(row.target_value),
    targetCount: numberValue(row.target_count),
    resultSummary: isRecord(row.result_summary) ? row.result_summary : {},
    errorMessage: text(row.error_message),
    createdAt,
    startedAt: text(row.started_at),
    finishedAt: text(row.finished_at),
  }
}

function normalizeError(row: unknown): AdminHealthError | null {
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

export async function getAdminHealthSnapshot(
  client?: AdminHealthClient | null,
  filters: AdminHealthFilters = {},
): Promise<AdminHealthSnapshot | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-health', {
      body: {
        action: 'snapshot',
        job_status: filters.jobStatus && filters.jobStatus !== 'all' ? filters.jobStatus : null,
      },
    })
    if (error || !isRecord(data)) return null

    const cards = Array.isArray(data.cards) ? data.cards.map(normalizeCard).filter(Boolean) as AdminHealthCard[] : []
    const metrics = Array.isArray(data.metrics) ? data.metrics.map(normalizeMetric).filter(Boolean) as AdminHealthMetric[] : []
    const jobs = Array.isArray(data.jobs) ? data.jobs.map(normalizeJob).filter(Boolean) as AdminHealthJob[] : []
    const recentErrors = Array.isArray(data.recent_errors) ? data.recent_errors.map(normalizeError).filter(Boolean) as AdminHealthError[] : []

    const checkedAt = text(data.checked_at)
    if (!checkedAt) return null

    return {
      checkedAt,
      summaryStatus: normalizeStatus(data.summary_status),
      cards,
      metrics,
      jobs,
      recentErrors,
    }
  } catch {
    return null
  }
}
