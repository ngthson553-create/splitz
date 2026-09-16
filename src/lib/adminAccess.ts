import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminAccessRole = 'owner' | 'operator' | 'support' | 'readonly'
export type AdminAccessStatus = 'active' | 'disabled'

export type AdminAccessRow = {
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: AdminAccessRole
  status: AdminAccessStatus
  createdAt: string
  createdByEmail: string | null
}

export type AdminAccessCandidate = {
  userId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
  alreadyAdmin: boolean
}

export type AdminAccessRecentChange = {
  id: string
  action: string
  actorEmail: string | null
  createdAt: string
}

export type AdminAccessSnapshot = {
  checkedAt: string
  summary: {
    total: number
    active: number
    disabled: number
    owners: number
  }
  admins: AdminAccessRow[]
  recentChanges: AdminAccessRecentChange[]
}

export type AdminAccessUpsertInput = {
  userId: string
  role: AdminAccessRole
  status: AdminAccessStatus
  reason: string
}

export type AdminAccessDisableInput = {
  userId: string
  reason: string
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminAccessClient = {
  functions: {
    invoke: (name: 'admin-access', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminAccessClient | null): AdminAccessClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminAccessClient) : null)
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

function boolValue(value: unknown): boolean {
  return value === true || value === 'true'
}

export function normalizeAdminAccessRole(value: unknown): AdminAccessRole {
  return value === 'owner' || value === 'operator' || value === 'support' || value === 'readonly' ? value : 'readonly'
}

function normalizeStatus(value: unknown): AdminAccessStatus {
  return value === 'disabled' ? 'disabled' : 'active'
}

function normalizeAdminRow(row: unknown): AdminAccessRow | null {
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
    role: normalizeAdminAccessRole(row.role),
    status: normalizeStatus(row.status),
    createdAt,
    createdByEmail: text(row.created_by_email),
  }
}

function normalizeCandidate(row: unknown): AdminAccessCandidate | null {
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
    createdAt,
    alreadyAdmin: boolValue(row.already_admin),
  }
}

function normalizeChange(row: unknown): AdminAccessRecentChange | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const action = text(row.action)
  const createdAt = text(row.created_at)
  if (!id || !action || !createdAt) return null
  return { id, action, actorEmail: text(row.actor_email), createdAt }
}

function normalizeSnapshot(data: unknown): AdminAccessSnapshot | null {
  if (!isRecord(data)) return null
  const checkedAt = text(data.checked_at)
  if (!checkedAt) return null
  const summary = isRecord(data.summary) ? data.summary : {}
  const admins = Array.isArray(data.admins) ? data.admins.flatMap((row) => normalizeAdminRow(row) ?? []) : []
  const recentChanges = Array.isArray(data.recent_changes) ? data.recent_changes.flatMap((row) => normalizeChange(row) ?? []) : []
  return {
    checkedAt,
    summary: {
      total: numberValue(summary.total),
      active: numberValue(summary.active),
      disabled: numberValue(summary.disabled),
      owners: numberValue(summary.owners),
    },
    admins,
    recentChanges,
  }
}

export async function loadAdminAccessSnapshot(client?: AdminAccessClient | null): Promise<AdminAccessSnapshot | null> {
  const supabase = getClient(client)
  if (!supabase) return null
  const { data, error } = await supabase.functions.invoke('admin-access', { body: { action: 'snapshot' } })
  if (error) return null
  return normalizeSnapshot(data)
}

export async function searchAdminAccessProfiles(client: AdminAccessClient | null | undefined, query: string): Promise<AdminAccessCandidate[]> {
  const supabase = getClient(client)
  const clean = query.trim()
  if (!supabase || !clean) return []
  const { data, error } = await supabase.functions.invoke('admin-access', { body: { action: 'search_profiles', query: clean, limit: 12 } })
  if (error || !isRecord(data) || !Array.isArray(data.results)) return []
  return data.results.flatMap((row) => normalizeCandidate(row) ?? [])
}

export async function upsertAdminAccess(client: AdminAccessClient | null | undefined, input: AdminAccessUpsertInput): Promise<boolean> {
  const supabase = getClient(client)
  if (!supabase) return false
  const { error } = await supabase.functions.invoke('admin-access', { body: { action: 'upsert_admin', ...input } })
  return !error
}

export async function disableAdminAccess(client: AdminAccessClient | null | undefined, input: AdminAccessDisableInput): Promise<boolean> {
  const supabase = getClient(client)
  if (!supabase) return false
  const { error } = await supabase.functions.invoke('admin-access', { body: { action: 'disable_admin', ...input } })
  return !error
}
