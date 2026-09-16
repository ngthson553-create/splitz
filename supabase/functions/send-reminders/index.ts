// Nhắc gia hạn — chạy theo lịch (pg_cron → gọi hàm này hằng ngày). KHÔNG yêu cầu JWT
// (đặt verify_jwt=false). Việc:
//  1) Hạ cấp: subscriptions quá hạn (period_end < now, status active) → 'expired'.
//  2) Nhắc: gói còn ≤3 ngày, chưa nhắc chu kỳ này → gửi EMAIL (Resend) + WEB PUSH.
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (tự có), RESEND_API_KEY,
//          RESEND_FROM (vd 'Splitz <noreply@domain-da-verify>'),
//          VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Splitz <noreply@example.com>'
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

function sanitizeError(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value ?? 'unknown_error')
  return text.replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]').slice(0, 2000)
}

async function logEmailDelivery(input: {
  userId: string
  to: string
  subject: string
  status: 'sent' | 'failed' | 'skipped'
  providerMessageId?: string | null
  errorMessage?: string | null
}) {
  await admin.from('email_delivery_logs').insert({
    provider: 'resend',
    template_key: 'premium_reminder',
    to_email: input.to,
    from_email: RESEND_FROM,
    subject: input.subject,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    payload_summary: { source: 'send-reminders', user_id: input.userId },
    error_message: input.errorMessage ? sanitizeError(input.errorMessage) : null,
    sent_at: input.status === 'sent' ? new Date().toISOString() : null,
  }).catch(() => {})
}

async function sendEmail(userId: string, to: string, name: string, periodEnd: string) {
  const subject = 'Gói Splitz Premium của bạn sắp hết hạn'
  if (!RESEND_API_KEY) {
    await logEmailDelivery({ userId, to, subject, status: 'skipped', errorMessage: 'RESEND_API_KEY missing' })
    return
  }
  const date = new Date(periodEnd).toLocaleDateString('vi-VN')
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to,
        subject,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1d4ed8">Sắp đến hạn gia hạn</h2>
        <p>Chào ${name || 'bạn'}, gói Premium của bạn sẽ hết hạn vào <b>${date}</b>.</p>
        <p>Gia hạn để không bị gián đoạn (giữ nguyên nhóm và thành viên hiện có).</p>
        <p><a href="${APP_URL}/settings" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;display:inline-block">Gia hạn ngay</a></p>
      </div>`,
      }),
    })
    const data = await response.json().catch(() => ({})) as { id?: string; message?: string }
    if (!response.ok) throw new Error(data.message ?? `resend_${response.status}`)
    await logEmailDelivery({ userId, to, subject, status: 'sent', providerMessageId: data.id ?? null })
  } catch (error) {
    await logEmailDelivery({ userId, to, subject, status: 'failed', errorMessage: sanitizeError(error) })
  }
}

async function sendPush(userId: string, periodEnd: string) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('user_id', userId)
  const date = new Date(periodEnd).toLocaleDateString('vi-VN')
  const payload = JSON.stringify({
    title: 'Splitz Premium sắp hết hạn',
    body: `Gói của bạn hết hạn ${date}. Bấm để gia hạn.`,
    url: '/settings',
    tag: 'renewal',
  })
  for (const p of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth } },
        payload,
      )
    } catch (e) {
      // 404/410 = endpoint hết hiệu lực → xoá.
      const code = (e as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', p.endpoint)
      }
    }
  }
}

Deno.serve(async (req) => {
  // Chỉ cho cron (service role) gọi — chặn người lạ trigger gửi nhắc/spam.
  if ((req.headers.get('Authorization') ?? '') !== `Bearer ${SERVICE_ROLE}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const nowIso = new Date().toISOString()

  // 1) Hạ cấp quá hạn.
  await admin
    .from('subscriptions')
    .update({ status: 'expired' })
    .lt('period_end', nowIso)
    .eq('status', 'active')

  // 2) Tìm gói sắp hết hạn (≤3 ngày), premium, đang active.
  const in3 = new Date(Date.now() + 3 * 86_400_000).toISOString()
  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id,plan,period_end,reminder_sent_at,profiles(email,display_name)')
    .eq('status', 'active')
    .in('plan', ['personal', 'team'])
    .gt('period_end', nowIso)
    .lte('period_end', in3)

  let sent = 0
  for (const s of (subs ?? []) as Array<{
    user_id: string
    period_end: string
    reminder_sent_at: string | null
    profiles: { email: string; display_name: string } | null
  }>) {
    // Đã nhắc cho chu kỳ này? (reminder_sent_at gần period_end → bỏ qua)
    if (
      s.reminder_sent_at &&
      new Date(s.reminder_sent_at).getTime() > new Date(s.period_end).getTime() - 7 * 86_400_000
    ) {
      continue
    }
    const email = s.profiles?.email
    if (email) await sendEmail(s.user_id, email, s.profiles?.display_name ?? '', s.period_end)
    await sendPush(s.user_id, s.period_end)
    await admin.from('subscriptions').update({ reminder_sent_at: nowIso }).eq('user_id', s.user_id)
    sent++
  }

  return new Response(JSON.stringify({ ok: true, reminded: sent }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
