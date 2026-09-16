// Console Admin Access Manager (verify_jwt=true).
// Owner-only management for admin_users; every write records admin_audit_logs.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEFAULT_LIMIT = 12
const MAX_LIMIT = 25

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'snapshot' | 'search_profiles' | 'upsert_admin' | 'disable_admin'
type Role = 'owner' | 'operator' | 'support' | 'readonly'
type Status = 'active' | 'disabled'

type RequestBody = {
  action?: Action
  query?: string | null
  limit?: number | string | null
  userId?: string | null
  user_id?: string | null
  role?: string | null
  status?: string | null
  reason?: string | null
}

type Actor = {
  userId: string
  email: string | null
  role: Role
}

type AdminUserRow = {
  user_id: string
  role: Role
  status: Status
  created_at: string
  created_by: string | null
}

type ProfileRow = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
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

function normalizeRole(value: unknown): Role {
  if (value === 'owner' || value === 'operator' || value === 'support' || value === 'readonly') return value
  throw new HttpError(400, 'Invalid role')
}

function normalizeStatus(value: unknown): Status {
  if (value === 'active' || value === 'disabled') return value
  throw new HttpError(400, 'Invalid status')
}

function reasonText(value: unknown): string {
  const reason = cleanText(value)
  if (!reason) throw new HttpError(400, 'Reason required')
  return reason.slice(0, 300)
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
  if (row.role !== 'owner') throw new HttpError(403, 'Owner role required')
  return { userId: u.user.id, email: u.user.email ?? null, role: row.role as Role }
}

async function writeAudit(
  actor: Actor,
  action: string,
  targetId: string | null,
  payload: Record<string, unknown>,
  status: 'success' | 'failed',
  errorMessage?: string | null,
) {
  await admin.from('admin_audit_logs').insert({
    actor_user_id: actor.userId,
    actor_email: actor.email,
    actor_role: actor.role,
    action,
    target_type: 'admin_user',
    target_id: targetId,
    payload_summary: payload,
    status,
    error_message: errorMessage ? sanitizeError(errorMessage) : null,
  })
}

async function profilesById(ids: string[]): Promise<Map<string, ProfileRow>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return new Map()
  const { data } = await admin
    .from('profiles')
    .select('id,email,display_name,avatar_url,created_at')
    .in('id', unique)
  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
}

async function recentChanges() {
  const { data } = await admin
    .from('admin_audit_logs')
    .select('id,action,actor_email,created_at')
    .ilike('action', 'admin_access.%')
    .order('created_at', { ascending: false })
    .limit(8)
  return (data ?? []).flatMap((row) => {
    const id = cleanText(row.id)
    const action = cleanText(row.action)
    const createdAt = cleanText(row.created_at)
    if (!id || !action || !createdAt) return []
    return [{ id, action, actor_email: cleanText(row.actor_email), created_at: createdAt }]
  })
}

async function buildSnapshot() {
  const { data, error } = await admin
    .from('admin_users')
    .select('user_id,role,status,created_at,created_by')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as AdminUserRow[]
  const profileIds = rows.flatMap((row) => [row.user_id, row.created_by].filter(Boolean) as string[])
  const profiles = await profilesById(profileIds)
  const admins = rows.flatMap((row) => {
    const profile = profiles.get(row.user_id)
    if (!profile) return []
    const creator = row.created_by ? profiles.get(row.created_by) : null
    return [{
      user_id: row.user_id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      role: row.role,
      status: row.status,
      created_at: row.created_at,
      created_by_email: creator?.email ?? null,
    }]
  })

  return {
    checked_at: new Date().toISOString(),
    summary: {
      total: rows.length,
      active: rows.filter((row) => row.status === 'active').length,
      disabled: rows.filter((row) => row.status === 'disabled').length,
      owners: rows.filter((row) => row.status === 'active' && row.role === 'owner').length,
    },
    admins,
    recent_changes: await recentChanges(),
  }
}

function uniqueProfiles(rows: ProfileRow[]): ProfileRow[] {
  const byId = new Map<string, ProfileRow>()
  for (const row of rows) if (row?.id && !byId.has(row.id)) byId.set(row.id, row)
  return [...byId.values()]
}

async function searchProfileRows(query: string, limit: number): Promise<ProfileRow[]> {
  const columns = 'id,email,display_name,avatar_url,created_at'
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

async function buildSearchProfiles(body: RequestBody) {
  const query = cleanText(body.query)
  if (!query) throw new HttpError(400, 'Query required')
  const limit = limitedInt(body.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const profiles = await searchProfileRows(query, limit)
  const ids = profiles.map((profile) => profile.id)
  const adminRows = ids.length > 0
    ? await admin.from('admin_users').select('user_id').in('user_id', ids)
    : { data: [] }
  const existing = new Set((adminRows.data ?? []).map((row) => row.user_id as string))
  return {
    results: profiles.map((profile) => ({
      user_id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      already_admin: existing.has(profile.id),
    })),
  }
}

async function profileForUser(userId: string): Promise<ProfileRow> {
  const { data, error } = await admin
    .from('profiles')
    .select('id,email,display_name,avatar_url,created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new HttpError(404, 'Profile not found')
  return data as ProfileRow
}

async function ensureOwnerInvariant(targetUserId: string, nextRole: Role, nextStatus: Status) {
  const { data, error } = await admin
    .from('admin_users')
    .select('user_id,role,status')
    .eq('status', 'active')
    .eq('role', 'owner')
  if (error) throw new Error(error.message)
  const owners = (data ?? []) as Pick<AdminUserRow, 'user_id' | 'role' | 'status'>[]
  const remainingOwners = owners.filter((row) => row.user_id !== targetUserId).length
  const targetWillBeOwner = nextStatus === 'active' && nextRole === 'owner'
  if (remainingOwners + (targetWillBeOwner ? 1 : 0) < 1) {
    throw new HttpError(409, 'Cannot remove last active owner')
  }
}

async function upsertAdmin(actor: Actor, body: RequestBody) {
  const userId = cleanText(body.userId) ?? cleanText(body.user_id)
  if (!userId || !isUuid(userId)) throw new HttpError(400, 'Valid user id required')
  const role = normalizeRole(body.role)
  const status = normalizeStatus(body.status ?? 'active')
  const reason = reasonText(body.reason)
  const profile = await profileForUser(userId)
  await ensureOwnerInvariant(userId, role, status)

  const { error } = await admin.from('admin_users').upsert({
    user_id: userId,
    role,
    status,
    created_by: actor.userId,
  }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)

  await writeAudit(actor, 'admin_access.upsert', userId, { target_email: profile.email, role, status, reason }, 'success')
  return { ok: true }
}

async function disableAdmin(actor: Actor, body: RequestBody) {
  const userId = cleanText(body.userId) ?? cleanText(body.user_id)
  if (!userId || !isUuid(userId)) throw new HttpError(400, 'Valid user id required')
  const reason = reasonText(body.reason)
  const profile = await profileForUser(userId)
  await ensureOwnerInvariant(userId, 'readonly', 'disabled')

  const { error } = await admin
    .from('admin_users')
    .update({ status: 'disabled' })
    .eq('user_id', userId)
  if (error) throw new Error(error.message)

  await writeAudit(actor, 'admin_access.disable', userId, { target_email: profile.email, reason }, 'success')
  return { ok: true }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let actor: Actor | null = null
  let body: RequestBody = {}
  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    actor = await getActor(jwt)
    body = (await req.json().catch(() => ({}))) as RequestBody

    if (body.action === 'snapshot') return json(await buildSnapshot(), 200, origin)
    if (body.action === 'search_profiles') return json(await buildSearchProfiles(body), 200, origin)
    if (body.action === 'upsert_admin') return json(await upsertAdmin(actor, body), 200, origin)
    if (body.action === 'disable_admin') return json(await disableAdmin(actor, body), 200, origin)
    return json({ error: 'Invalid action' }, 400, origin)
  } catch (error) {
    const message = sanitizeError(error)
    if (actor && (body.action === 'upsert_admin' || body.action === 'disable_admin')) {
      const targetId = cleanText(body.userId) ?? cleanText(body.user_id)
      await writeAudit(actor, `admin_access.${body.action === 'disable_admin' ? 'disable' : 'upsert'}`, targetId, { reason: cleanText(body.reason) }, 'failed', message).catch(() => undefined)
    }
    return json({ error: message }, error instanceof HttpError ? error.status : 500, origin)
  }
})
