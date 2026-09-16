// Console Admin Email / Resend operations (verify_jwt=true).
// Supports sanitized Resend snapshots, template listing, delivery logs, and
// test emails with audit logging. Never returns RESEND_API_KEY or secrets.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Splitz <noreply@example.com>'
const RESEND_REPLY_TO = Deno.env.get('RESEND_REPLY_TO') ?? null
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_MESSAGE = 4000

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'snapshot' | 'send_test'
type EmailStatus = 'queued' | 'sent' | 'failed' | 'skipped'

type RequestBody = {
  action?: Action
  limit?: number | string | null
  to_email?: string | null
  template_key?: string | null
  subject?: string | null
  message?: string | null
}

type Actor = {
  userId: string
  email: string | null
  role: string
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
  const text = cleanText(value) ?? 'unknown_error'
  return text.replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]').slice(0, 2000)
}

function limitedInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.trunc(n), min), max)
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => vars[key] ?? '')
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
  return { userId: u.user.id, email: u.user.email ?? null, role: row.role as string }
}

function requireOperator(actor: Actor) {
  if (!['owner', 'operator'].includes(actor.role)) throw new HttpError(403, 'Operator role required')
}

async function writeAudit(
  actor: Actor,
  action: string,
  status: 'success' | 'failed',
  payload: Record<string, unknown>,
  errorMessage?: string | null,
) {
  await admin.from('admin_audit_logs').insert({
    actor_user_id: actor.userId,
    actor_email: actor.email,
    actor_role: actor.role,
    action,
    target_type: 'email',
    target_id: cleanText(payload.log_id) ?? cleanText(payload.template_key) ?? 'resend',
    payload_summary: payload,
    status,
    error_message: errorMessage ? sanitizeError(errorMessage) : null,
  })
}

async function countEmailLogs(query: (builder: any) => any): Promise<number> {
  try {
    const { count } = await query(admin.from('email_delivery_logs').select('*', { count: 'exact', head: true }))
    return count ?? 0
  } catch {
    return 0
  }
}

async function templateRows() {
  const { data } = await admin
    .from('email_templates')
    .select('key,name,category,subject,description,active,updated_at')
    .order('category', { ascending: true })
    .order('key', { ascending: true })
  return data ?? []
}

async function deliveryLogs(limit: number) {
  const { data } = await admin
    .from('email_delivery_logs')
    .select('id,template_key,to_email,from_email,subject,status,provider,provider_message_id,error_message,sent_at,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

async function recentErrors() {
  const { data: logErrors } = await admin
    .from('email_delivery_logs')
    .select('id,template_key,error_message,created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(5)
  const { data: auditErrors } = await admin
    .from('admin_audit_logs')
    .select('id,action,error_message,created_at')
    .eq('status', 'failed')
    .ilike('action', 'email.%')
    .order('created_at', { ascending: false })
    .limit(5)

  return [
    ...(logErrors ?? []).flatMap((row) => {
      const id = cleanText(row.id)
      const createdAt = cleanText(row.created_at)
      if (!id || !createdAt) return []
      return [{ id, source: 'email_delivery_logs', action: cleanText(row.template_key), message: cleanText(row.error_message), created_at: createdAt }]
    }),
    ...(auditErrors ?? []).flatMap((row) => {
      const id = cleanText(row.id)
      const createdAt = cleanText(row.created_at)
      if (!id || !createdAt) return []
      return [{ id, source: 'admin_audit_logs', action: cleanText(row.action), message: cleanText(row.error_message), created_at: createdAt }]
    }),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
}

async function buildSnapshot(actor: Actor, body: RequestBody) {
  const checkedAt = new Date().toISOString()
  const limit = limitedInt(body.limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
  const weekStart = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const monthStart = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [sent7d, failed7d, reminder30d, test30d, templates, logs, errors] = await Promise.all([
    countEmailLogs((query) => query.eq('status', 'sent').gte('created_at', weekStart)),
    countEmailLogs((query) => query.eq('status', 'failed').gte('created_at', weekStart)),
    countEmailLogs((query) => query.eq('template_key', 'premium_reminder').gte('created_at', monthStart)),
    countEmailLogs((query) => query.eq('template_key', 'system_test').gte('created_at', monthStart)),
    templateRows(),
    deliveryLogs(limit),
    recentErrors(),
  ])
  const configured = Boolean(RESEND_API_KEY)
  const summaryStatus = !configured ? 'missing' : failed7d > 0 || errors.length > 0 ? 'failed' : 'configured'

  return {
    checked_at: checkedAt,
    summary_status: summaryStatus,
    default_to_email: actor.email,
    provider: {
      status: configured ? 'configured' : 'missing',
      from: RESEND_FROM,
      reply_to: RESEND_REPLY_TO,
      detail: configured ? 'RESEND_API_KEY configured' : 'RESEND_API_KEY missing',
    },
    metrics: [
      { id: 'sent_7d', label: 'Da gui 7 ngay', value: sent7d, detail: 'Resend sent' },
      { id: 'failed_7d', label: 'Loi 7 ngay', value: failed7d, detail: 'Delivery failed' },
      { id: 'reminder_30d', label: 'Reminder 30 ngay', value: reminder30d, detail: 'premium_reminder' },
      { id: 'test_30d', label: 'Test 30 ngay', value: test30d, detail: 'system_test' },
    ],
    templates,
    logs,
    recent_errors: errors,
  }
}

async function loadTemplate(templateKey: string) {
  const { data, error } = await admin
    .from('email_templates')
    .select('key,name,subject,html,text_body,active')
    .eq('key', templateKey)
    .maybeSingle()
  if (error || !data) throw new HttpError(404, 'Template not found')
  if (data.active === false) throw new HttpError(400, 'Template disabled')
  return data
}

async function insertEmailLog(input: {
  provider: string
  templateKey: string | null
  toEmail: string
  fromEmail: string | null
  subject: string
  status: EmailStatus
  providerMessageId?: string | null
  payloadSummary?: Record<string, unknown>
  errorMessage?: string | null
  sentBy?: string | null
  sentAt?: string | null
}) {
  const { data, error } = await admin
    .from('email_delivery_logs')
    .insert({
      provider: input.provider,
      template_key: input.templateKey,
      to_email: input.toEmail,
      from_email: input.fromEmail,
      subject: input.subject,
      status: input.status,
      provider_message_id: input.providerMessageId ?? null,
      payload_summary: input.payloadSummary ?? {},
      error_message: input.errorMessage ? sanitizeError(input.errorMessage) : null,
      sent_by: input.sentBy ?? null,
      sent_at: input.sentAt ?? null,
    })
    .select('id')
    .single()
  if (error || !data?.id) throw new Error(error?.message ?? 'email_log_insert_failed')
  return data.id as string
}

async function sendViaResend(input: { toEmail: string; subject: string; html: string; text: string | null }) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing')
  const payload: Record<string, unknown> = {
    from: RESEND_FROM,
    to: input.toEmail,
    subject: input.subject,
    html: input.html,
  }
  if (input.text) payload.text = input.text
  if (RESEND_REPLY_TO) payload.reply_to = RESEND_REPLY_TO

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = cleanText((data as Record<string, unknown>).message) ?? `resend_${res.status}`
    throw new Error(message)
  }
  return cleanText((data as Record<string, unknown>).id)
}

async function sendTest(actor: Actor, body: RequestBody) {
  requireOperator(actor)
  const toEmail = cleanText(body.to_email)
  if (!toEmail || !isEmail(toEmail)) throw new HttpError(400, 'Valid email required')
  const templateKey = cleanText(body.template_key) ?? 'system_test'
  const template = await loadTemplate(templateKey)
  const subject = cleanText(body.subject) ?? cleanText(template.subject) ?? 'Test Splitz Email'
  const message = (cleanText(body.message) ?? 'Kiem tra Resend production tu Splitz Console.').slice(0, MAX_MESSAGE)
  const sentAt = new Date().toISOString()
  const vars = {
    appUrl: APP_URL,
    actorEmail: actor.email ?? 'admin',
    message,
    sentAt: new Date(sentAt).toLocaleString('vi-VN'),
    name: 'ban',
    periodEnd: 'ngay het han',
  }
  const html = renderTemplate(cleanText(template.html) ?? message, vars)
  const textBody = renderTemplate(cleanText(template.text_body) ?? message, vars)

  let providerMessageId: string | null = null
  try {
    providerMessageId = await sendViaResend({ toEmail, subject, html, text: textBody })
    const logId = await insertEmailLog({
      provider: 'resend',
      templateKey,
      toEmail,
      fromEmail: RESEND_FROM,
      subject,
      status: 'sent',
      providerMessageId,
      payloadSummary: { type: 'admin_test', template_key: templateKey, subject_length: subject.length, message_length: message.length },
      sentBy: actor.userId,
      sentAt,
    })
    await writeAudit(actor, 'email.test.send', 'success', { log_id: logId, template_key: templateKey, to_email: toEmail, provider_message_id: providerMessageId })
    return { log_id: logId, status: 'sent', provider_message_id: providerMessageId }
  } catch (error) {
    const errorMessage = sanitizeError(error instanceof Error ? error.message : error)
    const logId = await insertEmailLog({
      provider: 'resend',
      templateKey,
      toEmail,
      fromEmail: RESEND_FROM,
      subject,
      status: 'failed',
      providerMessageId,
      payloadSummary: { type: 'admin_test', template_key: templateKey, subject_length: subject.length, message_length: message.length },
      errorMessage,
      sentBy: actor.userId,
    })
    await writeAudit(actor, 'email.test.failed', 'failed', { log_id: logId, template_key: templateKey, to_email: toEmail }, errorMessage)
    return { log_id: logId, status: 'failed', provider_message_id: providerMessageId, error: errorMessage }
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let actor: Actor | null = null
  let action: Action | null = null

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    actor = await getActor(jwt)
    const body = (await req.json()) as RequestBody
    action = body.action ?? null

    if (action === 'snapshot') return json(await buildSnapshot(actor, body), 200, origin)
    if (action === 'send_test') return json(await sendTest(actor, body), 200, origin)

    return json({ error: 'Invalid action' }, 400, origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    if (actor && action === 'send_test') {
      await writeAudit(actor, 'email.test.failed', 'failed', { action }, message)
    }
    if (error instanceof HttpError) return json({ error: error.message }, error.status, origin)
    return json({ error: sanitizeError(message) }, 500, origin)
  }
})
