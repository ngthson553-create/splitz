// Console Admin notification sender (verify_jwt=true).
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, APP_ORIGINS.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'
const MAX_TARGETS = 5000

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

type Action = 'preview' | 'send_now'
type TargetType = 'all' | 'free' | 'premium' | 'user' | 'group'

type RequestBody = {
  action?: Action
  title?: string | null
  body?: string | null
  href?: string | null
  target_type?: TargetType
  target_value?: string | null
  channels?: {
    in_app?: boolean
    web_push?: boolean
  }
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

function uniqueUsers(rows: TargetUser[]): TargetUser[] {
  const map = new Map<string, TargetUser>()
  for (const row of rows) {
    if (row.userId && !map.has(row.userId)) map.set(row.userId, row)
  }
  return [...map.values()].slice(0, MAX_TARGETS)
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

  return { userId: u.user.id, email: u.user.email ?? null, role: row.role }
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

async function resolveTargetUsers(targetType: TargetType, targetValue: string | null): Promise<TargetUser[]> {
  if (targetType === 'all') return allProfiles()

  if (targetType === 'premium') {
    const ids = [...await premiumUserIds()]
    if (ids.length === 0) return []
    const { data } = await admin.from('profiles').select('id,email').in('id', ids).limit(MAX_TARGETS)
    return uniqueUsers((data ?? []).map((row) => ({ userId: row.id as string, email: (row.email as string | null) ?? null })))
  }

  if (targetType === 'free') {
    const premium = await premiumUserIds()
    return (await allProfiles()).filter((row) => !premium.has(row.userId))
  }

  if (targetType === 'user') {
    if (!targetValue) return []
    const { data } = await admin
      .from('profiles')
      .select('id,email')
      .ilike('email', targetValue)
      .limit(1)
    return uniqueUsers((data ?? []).map((row) => ({ userId: row.id as string, email: (row.email as string | null) ?? null })))
  }

  if (targetType === 'group') {
    if (!targetValue) return []
    const { data } = await admin
      .from('group_members')
      .select('user_id,profiles(email)')
      .eq('group_id', targetValue)
      .not('user_id', 'is', null)
      .limit(MAX_TARGETS)
    return uniqueUsers(
      (data ?? []).map((row) => ({
        userId: row.user_id as string,
        email: Array.isArray(row.profiles) ? null : ((row.profiles?.email as string | null) ?? null),
      })),
    )
  }

  return []
}

async function countPushSubscribers(users: TargetUser[]): Promise<number> {
  if (users.length === 0) return 0
  const { data } = await admin
    .from('push_subscriptions')
    .select('user_id')
    .in('user_id', users.map((user) => user.userId))
  return new Set((data ?? []).map((row) => row.user_id as string)).size
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
    target_type: 'system_notification',
    target_id: targetId,
    payload_summary: payload,
    status,
    error_message: errorMessage ? errorMessage.slice(0, 2000) : null,
  })
}

async function sendPushToUser(user: TargetUser, payload: string) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return { ok: 0, failed: 1, error: 'push_not_configured' }

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('user_id', user.userId)
  if (!subs || subs.length === 0) return { ok: 0, failed: 1, error: 'no_push_subscription' }

  let ok = 0
  let failed = 0
  const errors: string[] = []
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      ok += 1
    } catch (e) {
      failed += 1
      const code = (e as { statusCode?: number })?.statusCode
      errors.push(code ? `push_${code}` : 'push_failed')
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }
  return { ok, failed, error: errors[0] ?? null }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let actor: Actor | null = null
  let notificationId: string | null = null

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    actor = await getActor(jwt)
    const body = (await req.json()) as RequestBody
    const action = body.action
    const targetType = body.target_type
    const targetValue = cleanText(body.target_value)
    const channelInApp = body.channels?.in_app !== false
    const channelWebPush = body.channels?.web_push !== false

    if (action !== 'preview' && action !== 'send_now') return json({ error: 'Invalid action' }, 400, origin)
    if (!targetType || !['all', 'free', 'premium', 'user', 'group'].includes(targetType)) {
      return json({ error: 'Invalid target' }, 400, origin)
    }
    if (!channelInApp && !channelWebPush) return json({ error: 'No channel selected' }, 400, origin)
    if ((targetType === 'user' || targetType === 'group') && !targetValue) {
      return json({ error: 'Target value required' }, 400, origin)
    }

    const users = await resolveTargetUsers(targetType, targetValue)
    const pushSubscriberCount = await countPushSubscribers(users)
    if (action === 'preview') {
      return json({ target_count: users.length, push_subscriber_count: pushSubscriberCount }, 200, origin)
    }

    const title = cleanText(body.title)
    const message = cleanText(body.body)
    const href = cleanText(body.href) ?? '/notifications'
    if (!title || !message) return json({ error: 'Title and body required' }, 400, origin)

    const { data: notification, error: notificationError } = await admin
      .from('system_notifications')
      .insert({
        title,
        body: message,
        href,
        target_type: targetType,
        target_value: targetValue,
        status: 'sending',
        channel_in_app: channelInApp,
        channel_web_push: channelWebPush,
        target_count: users.length,
        created_by: actor.userId,
        payload: { push_subscriber_count: pushSubscriberCount },
      })
      .select('id')
      .single()
    if (notificationError || !notification) throw new Error(notificationError?.message ?? 'notification_insert_failed')
    notificationId = notification.id as string

    const { data: job, error: jobError } = await admin
      .from('notification_jobs')
      .insert({
        notification_id: notificationId,
        job_type: 'send_now',
        status: 'running',
        target_type: targetType,
        target_value: targetValue,
        target_count: users.length,
        preview_payload: { push_subscriber_count: pushSubscriberCount },
        created_by: actor.userId,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (jobError || !job) throw new Error(jobError?.message ?? 'job_insert_failed')
    const jobId = job.id as string

    let inAppSent = 0
    let pushSent = 0
    let pushFailed = 0
    const now = new Date().toISOString()

    for (const user of users) {
      if (channelInApp) {
        await admin.from('notification_deliveries').insert({
          notification_id: notificationId,
          job_id: jobId,
          user_id: user.userId,
          user_email: user.email,
          channel: 'in_app',
          status: 'sent',
          title,
          body: message,
          href,
          target_type: targetType,
          target_value: targetValue,
          sent_at: now,
        })
        inAppSent += 1
      }

      if (channelWebPush) {
        const payload = JSON.stringify({ title, body: message, url: href, tag: `system-${notificationId}` })
        const result = await sendPushToUser(user, payload)
        const ok = result.ok > 0
        await admin.from('notification_deliveries').insert({
          notification_id: notificationId,
          job_id: jobId,
          user_id: user.userId,
          user_email: user.email,
          channel: 'web_push',
          status: ok ? 'sent' : 'failed',
          title,
          body: message,
          href,
          target_type: targetType,
          target_value: targetValue,
          payload: { devices_ok: result.ok, devices_failed: result.failed },
          error_message: ok ? null : result.error,
          sent_at: ok ? now : null,
        })
        if (ok) pushSent += 1
        else pushFailed += 1
      }
    }

    await admin
      .from('system_notifications')
      .update({
        status: 'sent',
        in_app_sent: inAppSent,
        push_sent: pushSent,
        push_failed: pushFailed,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    await admin
      .from('notification_jobs')
      .update({
        status: 'succeeded',
        in_app_sent: inAppSent,
        push_sent: pushSent,
        push_failed: pushFailed,
        result_summary: { in_app_sent: inAppSent, push_sent: pushSent, push_failed: pushFailed },
        finished_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    await writeAudit(
      actor,
      'notification.send_now',
      notificationId,
      {
        title,
        target_type: targetType,
        target_value: targetValue,
        channel_in_app: channelInApp,
        channel_web_push: channelWebPush,
        target_count: users.length,
        in_app_sent: inAppSent,
        push_sent: pushSent,
        push_failed: pushFailed,
      },
      'success',
    )

    return json({
      notification_id: notificationId,
      job_id: jobId,
      target_count: users.length,
      in_app_sent: inAppSent,
      push_sent: pushSent,
      push_failed: pushFailed,
    }, 200, origin)
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status, origin)
    const message = e instanceof Error ? e.message : 'unknown_error'
    if (notificationId) {
      await admin.from('system_notifications').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', notificationId)
      await admin.from('notification_jobs').update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() }).eq('notification_id', notificationId)
    }
    if (actor) {
      await writeAudit(actor, 'notification.send_now', notificationId, { notification_id: notificationId }, 'failed', message)
    }
    return json({ error: message }, 500, origin)
  }
})
