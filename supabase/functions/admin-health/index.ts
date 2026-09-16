// Console Admin system health snapshot (verify_jwt=true).
// Returns sanitized provider/config status, operational counts, recent jobs,
// and recent errors. Does not expose secrets or mutate user business data.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'snapshot'
type JobStatus = 'all' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

type RequestBody = {
  action?: Action
  job_status?: JobStatus
}

type Actor = {
  userId: string
  email: string | null
  role: string
}

type HealthStatus = 'ok' | 'configured' | 'missing' | 'failed'

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
  return text.replace(/[A-Za-z0-9_]{32,}/g, '[redacted]')
}

function normalizeJobStatus(value: unknown): JobStatus | null {
  return value === 'all' || value === 'queued' || value === 'running' || value === 'succeeded' || value === 'failed' || value === 'cancelled'
    ? value
    : null
}

function statusFromAnyEnv(...names: string[]): HealthStatus {
  return names.some((name) => Boolean(Deno.env.get(name))) ? 'configured' : 'missing'
}

function statusFromAllEnv(...names: string[]): HealthStatus {
  return names.every((name) => Boolean(Deno.env.get(name))) ? 'configured' : 'missing'
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

  return { userId: u.user.id, email: u.user.email ?? null, role: row.role }
}

async function selectCount(
  table: string,
  query: (builder: any) => any = (builder) => builder,
): Promise<{ count: number; error: string | null }> {
  try {
    const builder = query(admin.from(table).select('*', { count: 'exact', head: true }))
    const { count, error } = await builder
    return { count: count ?? 0, error: error ? sanitizeError(error.message) : null }
  } catch (error) {
    return { count: 0, error: sanitizeError(error instanceof Error ? error.message : error) }
  }
}

async function selectRows(
  table: string,
  columns: string,
  query: (builder: any) => any = (builder) => builder,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  try {
    const builder = query(admin.from(table).select(columns))
    const { data, error } = await builder
    return { rows: (data ?? []) as Record<string, unknown>[], error: error ? sanitizeError(error.message) : null }
  } catch (error) {
    return { rows: [], error: sanitizeError(error instanceof Error ? error.message : error) }
  }
}

function addRecentError(
  items: { id: string; source: string; action: string | null; message: string | null; created_at: string }[],
  source: string,
  rows: Record<string, unknown>[],
  actionField = 'action',
  messageField = 'error_message',
) {
  for (const row of rows) {
    const id = cleanText(row.id)
    const createdAt = cleanText(row.created_at)
    if (!id || !createdAt) continue
    items.push({
      id,
      source,
      action: cleanText(row[actionField]),
      message: cleanText(row[messageField]),
      created_at: createdAt,
    })
  }
}

function addJobItems(
  items: {
    id: string
    source: 'notification_jobs' | 'admin_job_runs'
    job_type: string
    status: string
    target_type: string | null
    target_value: string | null
    target_count: number
    result_summary: Record<string, unknown>
    error_message: string | null
    created_at: string
    started_at: string | null
    finished_at: string | null
  }[],
  source: 'notification_jobs' | 'admin_job_runs',
  rows: Record<string, unknown>[],
  targetValueField = 'target_value',
) {
  for (const row of rows) {
    const id = cleanText(row.id)
    const jobType = cleanText(row.job_type)
    const status = cleanText(row.status)
    const createdAt = cleanText(row.created_at)
    if (!id || !jobType || !status || !createdAt) continue
    const targetType = cleanText(row.target_type)
    const targetValue = cleanText(row[targetValueField])
    const targetCount = typeof row.target_count === 'number' ? row.target_count : Number(row.target_count ?? 0)
    items.push({
      id,
      source,
      job_type: jobType,
      status,
      target_type: targetType,
      target_value: targetValue,
      target_count: Number.isFinite(targetCount) ? Math.trunc(targetCount) : 0,
      result_summary: row.result_summary && typeof row.result_summary === 'object' && !Array.isArray(row.result_summary) ? (row.result_summary as Record<string, unknown>) : {},
      error_message: cleanText(row.error_message),
      created_at: createdAt,
      started_at: cleanText(row.started_at),
      finished_at: cleanText(row.finished_at),
    })
  }
}

function statusSummary(cards: { status: HealthStatus }[]): HealthStatus {
  if (cards.some((card) => card.status === 'failed')) return 'failed'
  if (cards.some((card) => card.status === 'missing')) return 'missing'
  return 'ok'
}

function card(
  id: string,
  label: string,
  status: HealthStatus,
  detail: string,
  lastSuccessAt: string | null,
  lastErrorAt: string | null = null,
  lastError: string | null = null,
) {
  return { id, label, status, detail, last_success_at: lastSuccessAt, last_error_at: lastErrorAt, last_error: lastError }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let actor: Actor | null = null
  let jobRunId: string | null = null

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    actor = await getActor(jwt)
    const body = (await req.json()) as RequestBody
    if (body.action !== 'snapshot') return json({ error: 'Invalid action' }, 400, origin)

    const jobStatus = normalizeJobStatus(body.job_status)
    if (body.job_status && body.job_status !== 'all' && !jobStatus) return json({ error: 'Invalid job status' }, 400, origin)

    const runStartedAt = new Date().toISOString()
    const { data: run, error: runError } = await admin
      .from('admin_job_runs')
      .insert({
        job_type: 'health_check',
        source: 'console',
        status: 'running',
        summary: 'system health snapshot',
        payload: { job_status: jobStatus ?? 'all' },
        created_by: actor.userId,
        started_at: runStartedAt,
      })
      .select('id')
      .single()
    if (runError || !run) throw new Error(runError?.message ?? 'health_job_insert_failed')
    jobRunId = run.id as string

    const checkedAt = new Date().toISOString()
    const currentMonth = checkedAt.slice(0, 7)
    const monthStart = `${currentMonth}-01T00:00:00.000Z`
    const pendingCutoff = new Date(Date.now() - 30 * 60_000).toISOString()
    const errorWindowCutoff = new Date(Date.now() - 6 * 60 * 60_000).toISOString()

    const [
      profilesCount,
      groupsCount,
      premiumCount,
      redeemCodesCount,
      redeemUsesCount,
      aiUsageRows,
      pushCount,
      pendingOrders,
      paidOrders,
      notificationJobs,
      adminJobs,
      auditErrors,
      notificationErrors,
      adminJobErrors,
    ] = await Promise.all([
      selectCount('profiles'),
      selectCount('groups'),
      selectCount('subscriptions', (query) => query.eq('status', 'active').in('plan', ['personal', 'team']).or(`period_end.is.null,period_end.gte.${checkedAt}`)),
      selectCount('redemption_codes'),
      selectCount('redemption_uses', (query) => query.gte('used_at', monthStart)),
      selectRows('ai_usage', 'count,period', (query) => query.eq('period', currentMonth)),
      selectCount('push_subscriptions'),
      selectCount('payment_orders', (query) => query.eq('status', 'pending').lt('created_at', pendingCutoff)),
      selectRows('payment_orders', 'order_code,paid_at,created_at,status', (query) => query.eq('status', 'paid').order('paid_at', { ascending: false }).limit(1)),
      selectRows(
        'notification_jobs',
        'id,job_type,status,target_type,target_value,target_count,result_summary,error_message,created_at,started_at,finished_at',
        (query) => (jobStatus && jobStatus !== 'all' ? query.eq('status', jobStatus) : query).order('created_at', { ascending: false }).limit(20),
      ),
      selectRows(
        'admin_job_runs',
        'id,job_type,status,target_type,target_id,result_summary,error_message,created_at,started_at,finished_at',
        (query) => (jobStatus && jobStatus !== 'all' ? query.eq('status', jobStatus) : query).order('created_at', { ascending: false }).limit(20),
      ),
      selectRows('admin_audit_logs', 'id,action,error_message,created_at', (query) => query.eq('status', 'failed').gte('created_at', errorWindowCutoff).order('created_at', { ascending: false }).limit(5)),
      selectRows('notification_jobs', 'id,job_type,error_message,created_at', (query) => query.eq('status', 'failed').gte('created_at', errorWindowCutoff).order('created_at', { ascending: false }).limit(5)),
      selectRows('admin_job_runs', 'id,job_type,error_message,created_at', (query) => query.eq('status', 'failed').gte('created_at', errorWindowCutoff).order('created_at', { ascending: false }).limit(5)),
    ])

    const aiUsageTotal = aiUsageRows.rows.reduce((total, row) => total + (typeof row.count === 'number' ? row.count : Number(row.count ?? 0)), 0)
    const latestPaidAt = paidOrders.rows[0]?.paid_at ? cleanText(paidOrders.rows[0].paid_at) : cleanText(paidOrders.rows[0]?.created_at)
    const latestAuditError = auditErrors.rows[0]
    const latestNotificationError = notificationErrors.rows[0]
    const latestAdminJobError = adminJobErrors.rows[0]
    const latestPendingOrder = pendingOrders.count > 0 ? `Pending orders: ${pendingOrders.count}` : null
    const payosQueryError = pendingOrders.error ?? paidOrders.error
    const jobQueryError = notificationJobs.error ?? adminJobs.error
    const recentErrorQueryError = auditErrors.error ?? notificationErrors.error ?? adminJobErrors.error

    const jobs: {
      id: string
      source: 'notification_jobs' | 'admin_job_runs'
      job_type: string
      status: string
      target_type: string | null
      target_value: string | null
      target_count: number
      result_summary: Record<string, unknown>
      error_message: string | null
      created_at: string
      started_at: string | null
      finished_at: string | null
    }[] = []
    addJobItems(jobs, 'notification_jobs', notificationJobs.rows)
    addJobItems(jobs, 'admin_job_runs', adminJobs.rows, 'target_id')
    for (const job of jobs) {
      if (job.id === jobRunId) {
        job.status = 'succeeded'
        job.finished_at = checkedAt
      }
    }
    jobs.sort((a, b) => b.created_at.localeCompare(a.created_at))
    const recentFailedJob = jobs.find((job) => job.status === 'failed' && job.created_at >= errorWindowCutoff)

    const recentErrors: { id: string; source: string; action: string | null; message: string | null; created_at: string }[] = []
    addRecentError(recentErrors, 'admin_audit_logs', auditErrors.rows, 'action', 'error_message')
    addRecentError(recentErrors, 'notification_jobs', notificationErrors.rows, 'job_type', 'error_message')
    addRecentError(recentErrors, 'admin_job_runs', adminJobErrors.rows, 'job_type', 'error_message')
    recentErrors.sort((a, b) => b.created_at.localeCompare(a.created_at))

    const cards = [
      card(
        'supabase',
        'Supabase/Auth',
        profilesCount.error || groupsCount.error ? 'failed' : 'ok',
        `${profilesCount.count} profiles, ${groupsCount.count} groups`,
        checkedAt,
        profilesCount.error || groupsCount.error ? checkedAt : null,
        profilesCount.error || groupsCount.error ? sanitizeError(profilesCount.error ?? groupsCount.error) : null,
      ),
      card('edge', 'Edge Functions', 'ok', 'admin-health active, service role reachable', checkedAt),
      card(
        'resend',
        'Resend',
        statusFromAllEnv('RESEND_API_KEY'),
        statusFromAllEnv('RESEND_API_KEY') === 'configured' ? 'RESEND_API_KEY configured' : 'RESEND_API_KEY missing',
        statusFromAllEnv('RESEND_API_KEY') === 'configured' ? checkedAt : null,
      ),
      card(
        'ai',
        'AI provider',
        statusFromAnyEnv('GEMINI_API_KEY', 'DEEPSEEK_API_KEY'),
        statusFromAnyEnv('GEMINI_API_KEY', 'DEEPSEEK_API_KEY') === 'configured' ? 'AI provider configured' : 'AI provider missing',
        statusFromAnyEnv('GEMINI_API_KEY', 'DEEPSEEK_API_KEY') === 'configured' ? checkedAt : null,
      ),
      card(
        'payos',
        'PayOS / webhook',
        payosQueryError ? 'failed' : statusFromAllEnv('PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'),
        payosQueryError ? payosQueryError : `${pendingOrders.count} pending orders${latestPendingOrder ? ` · ${latestPendingOrder}` : ''}`,
        latestPaidAt,
        payosQueryError ? checkedAt : null,
        payosQueryError,
      ),
      card(
        'redeem',
        'Redeem system',
        redeemCodesCount.error || redeemUsesCount.error ? 'failed' : 'ok',
        `${redeemCodesCount.count} codes, ${redeemUsesCount.count} uses this month`,
        checkedAt,
        redeemCodesCount.error || redeemUsesCount.error ? checkedAt : null,
        redeemCodesCount.error || redeemUsesCount.error ? sanitizeError(redeemCodesCount.error ?? redeemUsesCount.error) : null,
      ),
      card(
        'push',
        'Push subscriptions',
        statusFromAllEnv('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY') === 'configured' ? 'configured' : 'missing',
        `${pushCount.count} subscriptions`,
        statusFromAllEnv('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY') === 'configured' ? checkedAt : null,
      ),
      card(
        'jobs',
        'Recent jobs',
        jobQueryError ? 'failed' : recentFailedJob ? 'failed' : 'ok',
        jobQueryError ? jobQueryError : `${jobs.length} recent jobs · ${aiUsageTotal} AI usage this month`,
        checkedAt,
        jobQueryError || recentFailedJob ? checkedAt : null,
        jobQueryError ?? recentFailedJob?.error_message ?? null,
      ),
      card(
        'errors',
        'Recent errors',
        recentErrorQueryError ? 'failed' : recentErrors.length > 0 ? 'failed' : 'ok',
        recentErrorQueryError
          ? recentErrorQueryError
          : latestAuditError
            ? `${cleanText(latestAuditError.action) ?? 'audit'} · ${sanitizeError(latestAuditError.error_message)}`
            : latestNotificationError
              ? `${cleanText(latestNotificationError.job_type) ?? 'notification'} · ${sanitizeError(latestNotificationError.error_message)}`
              : latestAdminJobError
                ? `${cleanText(latestAdminJobError.job_type) ?? 'admin_job'} · ${sanitizeError(latestAdminJobError.error_message)}`
                : 'No recent errors',
        checkedAt,
        recentErrorQueryError || recentErrors.length > 0 ? (recentErrors[0]?.created_at ?? checkedAt) : null,
        recentErrorQueryError ? recentErrorQueryError : recentErrors.length > 0 ? sanitizeError(recentErrors[0].message) : null,
      ),
    ]

    const summary = statusSummary(cards)

    await admin
      .from('admin_job_runs')
      .update({
        status: 'succeeded',
        result_summary: {
          summary_status: summary,
          cards: cards.length,
          metrics: 8,
          jobs: jobs.length,
          errors: recentErrors.length,
        },
        finished_at: checkedAt,
      })
      .eq('id', jobRunId)

    await admin.from('admin_audit_logs').insert({
      actor_user_id: actor.userId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'health_check',
      target_type: 'system',
      target_id: 'dashboard',
      payload_summary: {
        job_status: jobStatus ?? 'all',
        summary_status: summary,
        cards: cards.map((item) => ({ id: item.id, status: item.status })),
        metrics: [
          { id: 'users', value: profilesCount.count },
          { id: 'groups', value: groupsCount.count },
          { id: 'premium', value: premiumCount.count },
          { id: 'redeem_codes', value: redeemCodesCount.count },
          { id: 'redeem_uses', value: redeemUsesCount.count },
          { id: 'ai_usage', value: aiUsageTotal },
          { id: 'push_subscriptions', value: pushCount.count },
          { id: 'pending_orders', value: pendingOrders.count },
        ],
      },
      status: 'success',
      error_message: null,
    })

    return json(
      {
        checked_at: checkedAt,
        summary_status: summary,
        cards,
        metrics: [
          { id: 'users', label: 'Users', value: profilesCount.count, detail: profilesCount.error ? profilesCount.error : 'profiles' },
          { id: 'groups', label: 'Groups', value: groupsCount.count, detail: groupsCount.error ? groupsCount.error : 'groups' },
          { id: 'premium', label: 'Active premium', value: premiumCount.count, detail: premiumCount.error ? premiumCount.error : 'active subscriptions' },
          { id: 'redeem_codes', label: 'Redeem codes', value: redeemCodesCount.count, detail: redeemCodesCount.error ? redeemCodesCount.error : 'codes' },
          { id: 'redeem_uses', label: 'Redeem uses', value: redeemUsesCount.count, detail: redeemUsesCount.error ? redeemUsesCount.error : currentMonth },
          { id: 'ai_usage', label: 'AI usage', value: aiUsageTotal, detail: aiUsageRows.error ? aiUsageRows.error : currentMonth },
          { id: 'push_subscriptions', label: 'Push subs', value: pushCount.count, detail: pushCount.error ? pushCount.error : 'subscriptions' },
          { id: 'pending_orders', label: 'Pending orders', value: pendingOrders.count, detail: pendingOrders.error ? pendingOrders.error : 'PayOS' },
        ],
        jobs,
        recent_errors: recentErrors,
      },
      200,
      origin,
    )
  } catch (e) {
    const message = e instanceof Error ? sanitizeError(e.message) : sanitizeError(e)
    if (jobRunId) {
      await admin.from('admin_job_runs').update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() }).eq('id', jobRunId)
    }
    if (actor) {
      await admin.from('admin_audit_logs').insert({
        actor_user_id: actor.userId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'health_check',
        target_type: 'system',
        target_id: 'dashboard',
        payload_summary: { job_status: 'all', error: message },
        status: 'failed',
        error_message: message,
      })
    }
    if (e instanceof HttpError) return json({ error: e.message }, e.status, origin)
    return json({ error: message }, 500, origin)
  }
})
