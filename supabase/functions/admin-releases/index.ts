// Console Admin Release Notes (verify_jwt=true).
// Stores draft/published/cancelled release notes and publishes in-app
// announcements through the existing system_notifications pipeline.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_TARGETS = 5000

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'snapshot' | 'save_draft' | 'publish' | 'cancel'
type Audience = 'all' | 'free' | 'premium'

type RequestBody = {
  action?: Action
  release_id?: string | null
  version?: string | null
  title?: string | null
  body?: string | null
  audience?: Audience
  href?: string | null
  reason?: string | null
}

type Actor = {
  userId: string
  email: string | null
  role: string
}

type TargetUser = {
  userId: string
  email: string | null
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

function audience(value: unknown): Audience {
  return value === 'free' || value === 'premium' ? value : 'all'
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
  if (!['owner', 'operator'].includes(row.role)) throw new HttpError(403, 'Forbidden')

  return { userId: u.user.id, email: u.user.email ?? null, role: row.role as string }
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
    target_type: 'release_note',
    target_id: targetId,
    payload_summary: payload,
    status,
    error_message: errorMessage ? sanitizeError(errorMessage) : null,
  })
}

async function premiumUserIds(): Promise<Set<string>> {
  const now = new Date().toISOString()
  const { data } = await admin
    .from('subscriptions')
    .select('user_id,period_end')
    .eq('status', 'active')
    .in('plan', ['personal', 'team'])
  return new Set(
    (data ?? [])
      .filter((row) => !row.period_end || new Date(row.period_end).getTime() >= new Date(now).getTime())
      .map((row) => row.user_id as string),
  )
}

async function allProfiles(): Promise<TargetUser[]> {
  const { data } = await admin
    .from('profiles')
    .select('id,email')
    .order('created_at', { ascending: false })
    .limit(MAX_TARGETS)
  return (data ?? []).map((row) => ({ userId: row.id as string, email: (row.email as string | null) ?? null }))
}

async function targetUsers(targetAudience: Audience): Promise<TargetUser[]> {
  if (targetAudience === 'all') return allProfiles()
  const premium = await premiumUserIds()
  if (targetAudience === 'free') return (await allProfiles()).filter((row) => !premium.has(row.userId))
  const ids = [...premium]
  if (ids.length === 0) return []
  const { data } = await admin.from('profiles').select('id,email').in('id', ids).limit(MAX_TARGETS)
  return (data ?? []).map((row) => ({ userId: row.id as string, email: (row.email as string | null) ?? null }))
}

async function recentChanges() {
  const { data } = await admin
    .from('admin_audit_logs')
    .select('id,action,actor_email,created_at')
    .ilike('action', 'release.%')
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

async function snapshot() {
  const { data: releases } = await admin
    .from('release_notes')
    .select('id,version,title,body,status,audience,href,notification_id,published_at,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  const rows = releases ?? []
  const summary = {
    total: rows.length,
    draft: rows.filter((row) => row.status === 'draft').length,
    published: rows.filter((row) => row.status === 'published').length,
    cancelled: rows.filter((row) => row.status === 'cancelled').length,
  }

  return {
    checked_at: new Date().toISOString(),
    summary,
    releases: rows,
    recent_changes: await recentChanges(),
  }
}

async function saveDraft(actor: Actor, body: RequestBody) {
  const reason = reasonText(body.reason)
  const version = cleanText(body.version)
  const title = cleanText(body.title)
  const message = cleanText(body.body)
  if (!version || !title || !message) throw new HttpError(400, 'Version, title and body required')

  const now = new Date().toISOString()
  const payload = {
    version: version.slice(0, 80),
    title: title.slice(0, 140),
    body: message.slice(0, 5000),
    audience: audience(body.audience),
    href: cleanText(body.href) ?? '/notifications',
    updated_by: actor.userId,
    updated_at: now,
  }
  const releaseId = cleanText(body.release_id)

  if (releaseId) {
    const { data: existing, error: existingError } = await admin
      .from('release_notes')
      .select('id,status')
      .eq('id', releaseId)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (!existing) throw new HttpError(404, 'Release note not found')
    if (existing.status !== 'draft') throw new HttpError(409, 'Only draft release notes can be edited')

    const { error } = await admin.from('release_notes').update(payload).eq('id', releaseId)
    if (error) throw new Error(error.message)
    await writeAudit(actor, 'release.draft.save', releaseId, { version: payload.version, audience: payload.audience, reason }, 'success')
    return { release_id: releaseId }
  }

  const { data, error } = await admin
    .from('release_notes')
    .insert({ ...payload, created_by: actor.userId })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'release_insert_failed')
  await writeAudit(actor, 'release.draft.save', data.id as string, { version: payload.version, audience: payload.audience, reason }, 'success')
  return { release_id: data.id }
}

async function publish(actor: Actor, body: RequestBody) {
  const reason = reasonText(body.reason)
  const releaseId = cleanText(body.release_id)
  if (!releaseId) throw new HttpError(400, 'Release id required')

  const { data: release, error: releaseError } = await admin
    .from('release_notes')
    .select('id,version,title,body,status,audience,href,notification_id')
    .eq('id', releaseId)
    .maybeSingle()
  if (releaseError) throw new Error(releaseError.message)
  if (!release) throw new HttpError(404, 'Release note not found')
  if (release.status !== 'draft') throw new HttpError(409, 'Only draft release notes can be published')

  const targetAudience = audience(release.audience)
  const users = await targetUsers(targetAudience)
  const href = cleanText(release.href) ?? '/notifications'
  const targetType = targetAudience === 'all' ? 'all' : targetAudience
  const now = new Date().toISOString()

  const { data: notification, error: notificationError } = await admin
    .from('system_notifications')
    .insert({
      title: release.title,
      body: release.body,
      href,
      target_type: targetType,
      target_value: null,
      status: 'sending',
      channel_in_app: true,
      channel_web_push: false,
      target_count: users.length,
      created_by: actor.userId,
      payload: { release_id: releaseId, version: release.version },
    })
    .select('id')
    .single()
  if (notificationError || !notification) throw new Error(notificationError?.message ?? 'notification_insert_failed')
  const notificationId = notification.id as string

  const { data: job, error: jobError } = await admin
    .from('notification_jobs')
    .insert({
      notification_id: notificationId,
      job_type: 'send_now',
      status: 'running',
      target_type: targetType,
      target_value: null,
      target_count: users.length,
      preview_payload: { release_id: releaseId, version: release.version, channel: 'in_app' },
      created_by: actor.userId,
      started_at: now,
    })
    .select('id')
    .single()
  if (jobError || !job) throw new Error(jobError?.message ?? 'job_insert_failed')
  const jobId = job.id as string

  for (const user of users) {
    await admin.from('notification_deliveries').insert({
      notification_id: notificationId,
      job_id: jobId,
      user_id: user.userId,
      user_email: user.email,
      channel: 'in_app',
      status: 'sent',
      title: release.title,
      body: release.body,
      href,
      target_type: targetType,
      target_value: null,
      payload: { release_id: releaseId, version: release.version },
      sent_at: now,
    })
  }

  await admin
    .from('system_notifications')
    .update({ status: 'sent', in_app_sent: users.length, sent_at: now, updated_at: new Date().toISOString() })
    .eq('id', notificationId)

  await admin
    .from('notification_jobs')
    .update({
      status: 'succeeded',
      in_app_sent: users.length,
      result_summary: { release_id: releaseId, in_app_sent: users.length },
      finished_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  await admin
    .from('release_notes')
    .update({
      status: 'published',
      notification_id: notificationId,
      published_by: actor.userId,
      published_at: now,
      updated_by: actor.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', releaseId)

  await writeAudit(actor, 'release.publish', releaseId, {
    version: release.version,
    notification_id: notificationId,
    audience: targetAudience,
    target_count: users.length,
    in_app_sent: users.length,
    reason,
  }, 'success')

  return { release_id: releaseId, notification_id: notificationId, target_count: users.length, in_app_sent: users.length }
}

async function cancel(actor: Actor, body: RequestBody) {
  const reason = reasonText(body.reason)
  const releaseId = cleanText(body.release_id)
  if (!releaseId) throw new HttpError(400, 'Release id required')

  const { data: release, error: releaseError } = await admin
    .from('release_notes')
    .select('id,status,version')
    .eq('id', releaseId)
    .maybeSingle()
  if (releaseError) throw new Error(releaseError.message)
  if (!release) throw new HttpError(404, 'Release note not found')
  if (release.status === 'published') throw new HttpError(409, 'Published release notes cannot be cancelled')

  const { error } = await admin
    .from('release_notes')
    .update({
      status: 'cancelled',
      cancelled_by: actor.userId,
      cancelled_at: new Date().toISOString(),
      updated_by: actor.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', releaseId)
  if (error) throw new Error(error.message)
  await writeAudit(actor, 'release.cancel', releaseId, { version: release.version, reason }, 'success')
  return { release_id: releaseId, cancelled: true }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let actor: Actor | null = null
  let action: Action | null = null
  let targetId: string | null = null

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    actor = await getActor(jwt)
    const body = (await req.json().catch(() => ({}))) as RequestBody
    action = body.action ?? null
    targetId = cleanText(body.release_id)

    if (action === 'snapshot') return json(await snapshot(), 200, origin)
    if (action === 'save_draft') return json(await saveDraft(actor, body), 200, origin)
    if (action === 'publish') return json(await publish(actor, body), 200, origin)
    if (action === 'cancel') return json(await cancel(actor, body), 200, origin)
    return json({ error: 'Invalid action' }, 400, origin)
  } catch (error) {
    const message = sanitizeError(error)
    if (actor && action && action !== 'snapshot') {
      await writeAudit(actor, `release.${action}.failed`, targetId, { action }, 'failed', message)
    }
    return json({ error: message }, error instanceof HttpError ? error.status : 500, origin)
  }
})
