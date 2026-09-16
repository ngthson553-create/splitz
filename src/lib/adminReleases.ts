import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminReleaseStatus = 'draft' | 'published' | 'cancelled'
export type AdminReleaseAudience = 'all' | 'free' | 'premium'

export type AdminReleaseNote = {
  id: string
  version: string
  title: string
  body: string
  status: AdminReleaseStatus
  audience: AdminReleaseAudience
  href: string | null
  notificationId: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AdminReleaseSummary = {
  total: number
  draft: number
  published: number
  cancelled: number
}

export type AdminReleaseChange = {
  id: string
  action: string
  actorEmail: string | null
  createdAt: string
}

export type AdminReleasesSnapshot = {
  checkedAt: string
  summary: AdminReleaseSummary
  releases: AdminReleaseNote[]
  recentChanges: AdminReleaseChange[]
}

export type AdminReleaseDraftInput = {
  releaseId?: string | null
  version: string
  title: string
  body: string
  audience: AdminReleaseAudience
  href?: string | null
  reason: string
}

export type AdminReleasePublishInput = {
  releaseId: string
  reason: string
}

export type AdminReleasePublishResult = {
  releaseId: string
  notificationId: string | null
  targetCount: number
  inAppSent: number
}

export type AdminReleaseCancelInput = {
  releaseId: string
  reason: string
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminReleasesClient = {
  functions: {
    invoke: (name: 'admin-releases', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminReleasesClient | null): AdminReleasesClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminReleasesClient) : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function cleanText(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? ''
  return clean.length > 0 ? clean : null
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(n) ? n : 0
}

function normalizeStatus(value: unknown): AdminReleaseStatus | null {
  return value === 'draft' || value === 'published' || value === 'cancelled' ? value : null
}

function normalizeAudience(value: unknown): AdminReleaseAudience {
  return value === 'free' || value === 'premium' ? value : 'all'
}

function normalizeSummary(row: unknown): AdminReleaseSummary {
  const value = isRecord(row) ? row : {}
  return {
    total: numberValue(value.total),
    draft: numberValue(value.draft),
    published: numberValue(value.published),
    cancelled: numberValue(value.cancelled),
  }
}

function normalizeRelease(row: unknown): AdminReleaseNote | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const version = text(row.version)
  const title = text(row.title)
  const body = text(row.body)
  const status = normalizeStatus(row.status)
  const createdAt = text(row.created_at)
  const updatedAt = text(row.updated_at)
  if (!id || !version || !title || !body || !status || !createdAt || !updatedAt) return null
  return {
    id,
    version,
    title,
    body,
    status,
    audience: normalizeAudience(row.audience),
    href: text(row.href),
    notificationId: text(row.notification_id),
    publishedAt: text(row.published_at),
    createdAt,
    updatedAt,
  }
}

function normalizeChange(row: unknown): AdminReleaseChange | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const action = text(row.action)
  const createdAt = text(row.created_at)
  if (!id || !action || !createdAt) return null
  return {
    id,
    action,
    actorEmail: text(row.actor_email),
    createdAt,
  }
}

function normalizeSnapshot(row: unknown): AdminReleasesSnapshot | null {
  if (!isRecord(row)) return null
  const checkedAt = text(row.checked_at)
  if (!checkedAt) return null
  return {
    checkedAt,
    summary: normalizeSummary(row.summary),
    releases: Array.isArray(row.releases) ? row.releases.map(normalizeRelease).filter(Boolean) as AdminReleaseNote[] : [],
    recentChanges: Array.isArray(row.recent_changes) ? row.recent_changes.map(normalizeChange).filter(Boolean) as AdminReleaseChange[] : [],
  }
}

async function invokeAdminReleases(
  client: AdminReleasesClient | null | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-releases', { body })
    if (error || !isRecord(data)) return null
    return data
  } catch {
    return null
  }
}

function reasonText(reason: string): string | null {
  return cleanText(reason)?.slice(0, 300) ?? null
}

export async function loadAdminReleasesSnapshot(
  client?: AdminReleasesClient | null,
): Promise<AdminReleasesSnapshot | null> {
  const data = await invokeAdminReleases(client, { action: 'snapshot' })
  return normalizeSnapshot(data)
}

export async function saveAdminReleaseDraft(
  client: AdminReleasesClient | null | undefined,
  input: AdminReleaseDraftInput,
): Promise<string | null> {
  const releaseId = cleanText(input.releaseId)
  const data = await invokeAdminReleases(client, {
    action: 'save_draft',
    ...(releaseId ? { release_id: releaseId } : {}),
    version: cleanText(input.version),
    title: cleanText(input.title),
    body: cleanText(input.body),
    audience: input.audience,
    href: cleanText(input.href),
    reason: reasonText(input.reason),
  })
  return text(data?.release_id)
}

export async function publishAdminRelease(
  client: AdminReleasesClient | null | undefined,
  input: AdminReleasePublishInput,
): Promise<AdminReleasePublishResult | null> {
  const data = await invokeAdminReleases(client, {
    action: 'publish',
    release_id: cleanText(input.releaseId),
    reason: reasonText(input.reason),
  })
  const releaseId = text(data?.release_id)
  if (!releaseId) return null
  return {
    releaseId,
    notificationId: text(data?.notification_id),
    targetCount: numberValue(data?.target_count),
    inAppSent: numberValue(data?.in_app_sent),
  }
}

export async function cancelAdminRelease(
  client: AdminReleasesClient | null | undefined,
  input: AdminReleaseCancelInput,
): Promise<boolean> {
  const data = await invokeAdminReleases(client, {
    action: 'cancel',
    release_id: cleanText(input.releaseId),
    reason: reasonText(input.reason),
  })
  return data?.cancelled === true
}
