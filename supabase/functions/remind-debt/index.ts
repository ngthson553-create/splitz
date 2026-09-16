// Nhắc nợ một chạm — chủ nợ gọi (verify_jwt=true). Gửi Web Push tới thiết bị con nợ.
//  • Xác thực: caller phải là CHỦ NỢ (user của to_member) trong nhóm.
//  • Rate-limit: 1 lần / 24h / khoản (cặp group+from+to) — nguồn chân lý là bảng debt_reminders.
//  • Con nợ phải là USER THẬT (có user_id) + đã bật thông báo (có push_subscriptions).
// LƯU Ý chủ đích: server KHÔNG tính lại settlement (engine ở client) → tin tưởng tư cách
//  thành viên + caller là to_member + rate-limit chặn spam. Blast radius nhỏ (1 push/24h/cặp,
//  chỉ tới thành viên cùng nhóm, nội dung nhắc chung chung). Amount chỉ để HIỂN THỊ (không tin cậy).
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (tự có), VAPID_PUBLIC_KEY,
//          VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), APP_ORIGINS (CORS).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

const DEFAULT_COOLDOWN_HOURS = 24 // 1 lần/24h/khoản
const MAX_TARGETS = 30 // chặn payload bất thường

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

async function isFeatureEnabled(key: string, fallback = true): Promise<boolean> {
  const { data, error } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', key)
    .maybeSingle()
  if (error || !data) return fallback
  return data.enabled !== false
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function intValue(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.trunc(n), min), max)
}

async function debtCooldownMs(): Promise<number> {
  const { data, error } = await admin
    .from('app_config')
    .select('value')
    .eq('key', 'operation_limits')
    .maybeSingle()
  const value = error ? {} : objectValue(data?.value)
  const hours = intValue(value.debt_cooldown_hours, DEFAULT_COOLDOWN_HOURS, 1, 720)
  return hours * 60 * 60 * 1000
}

// Gửi push tới mọi thiết bị của 1 user. Trả về số thiết bị gửi thành công.
async function pushToUser(userId: string, payload: string): Promise<number> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return 0
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('user_id', userId)
  let ok = 0
  for (const p of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth } },
        payload,
      )
      ok++
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', p.endpoint)
      }
    }
  }
  return ok
}

type Body = {
  groupId?: string
  // Danh sách con nợ cần nhắc (1 phần tử = nhắc lẻ; nhiều = "Nhắc tất cả").
  fromMemberIds?: string[]
  // amount theo từng con nợ (chỉ để hiển thị trong nội dung push).
  amounts?: Record<string, number>
}

type TargetResult = {
  fromMemberId: string
  status: 'sent' | 'no_device' | 'not_real_user' | 'cooldown' | 'invalid'
  devices?: number
  retryAfterMs?: number
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  try {
    // Caller từ JWT (gateway verify_jwt=true).
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u.user) return json({ error: 'Chưa đăng nhập.' }, 401, origin)
    const uid = u.user.id

    if (!(await isFeatureEnabled('debt_reminder'))) {
      return json({ error: 'Tính năng nhắc nợ đang tạm dừng.' }, 503, origin)
    }
    const cooldownMs = await debtCooldownMs()

    const body = (await req.json()) as Body
    const groupId = body.groupId
    const fromIds = Array.from(new Set((body.fromMemberIds ?? []).filter(Boolean)))
    if (!groupId || fromIds.length === 0) {
      return json({ error: 'Thiếu nhóm hoặc danh sách con nợ.' }, 400, origin)
    }
    if (fromIds.length > MAX_TARGETS) {
      return json({ error: 'Quá nhiều khoản nhắc cùng lúc.' }, 400, origin)
    }

    // Caller phải là 1 thành viên (chủ nợ) của nhóm → đây là to_member.
    const { data: me } = await admin
      .from('group_members')
      .select('id,name')
      .eq('group_id', groupId)
      .eq('user_id', uid)
      .maybeSingle()
    if (!me) return json({ error: 'Bạn không thuộc nhóm này.' }, 403, origin)
    const toMemberId = me.id

    // Tên nhóm cho nội dung push.
    const { data: grp } = await admin
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .maybeSingle()
    const groupName = grp?.name ?? 'nhóm'

    // Nạp các con nợ hợp lệ trong nhóm (user_id để biết thật/ảo).
    const { data: debtors } = await admin
      .from('group_members')
      .select('id,user_id,name')
      .eq('group_id', groupId)
      .in('id', fromIds)
    const debtorById = new Map((debtors ?? []).map((d) => [d.id, d]))

    const now = Date.now()
    const results: TargetResult[] = []

    for (const fromId of fromIds) {
      if (fromId === toMemberId) {
        results.push({ fromMemberId: fromId, status: 'invalid' })
        continue
      }
      const debtor = debtorById.get(fromId)
      if (!debtor) {
        results.push({ fromMemberId: fromId, status: 'invalid' })
        continue
      }
      if (!debtor.user_id) {
        results.push({ fromMemberId: fromId, status: 'not_real_user' })
        continue
      }

      // Rate-limit: lần nhắc gần nhất cho khoản này (cùng cặp from→to).
      const { data: last } = await admin
        .from('debt_reminders')
        .select('reminded_at')
        .eq('group_id', groupId)
        .eq('from_member_id', fromId)
        .eq('to_member_id', toMemberId)
        .order('reminded_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (last) {
        const elapsed = now - new Date(last.reminded_at).getTime()
        if (elapsed < cooldownMs) {
          results.push({
            fromMemberId: fromId,
            status: 'cooldown',
            retryAfterMs: cooldownMs - elapsed,
          })
          continue
        }
      }

      const amount = body.amounts?.[fromId]
      const amountText = typeof amount === 'number' && amount > 0
        ? ` ${new Intl.NumberFormat('vi-VN').format(Math.round(amount))}đ`
        : ''
      const payload = JSON.stringify({
        title: 'Splitz — nhắc thanh toán',
        body: `${me.name} nhắc bạn chuyển${amountText} trong nhóm "${groupName}".`,
        url: `/g/${groupId}?tab=settle`,
        tag: `debt-${groupId}-${fromId}`,
      })
      const devices = await pushToUser(debtor.user_id, payload)

      // Ghi log dù không có thiết bị (vẫn tính là "đã nhắc" để chống bấm dồn).
      await admin.from('debt_reminders').insert({
        group_id: groupId,
        from_member_id: fromId,
        to_member_id: toMemberId,
        reminded_by: uid,
      })

      results.push({
        fromMemberId: fromId,
        status: devices > 0 ? 'sent' : 'no_device',
        devices,
      })
    }

    const sent = results.filter((r) => r.status === 'sent').length
    return json({ ok: true, sent, results }, 200, origin)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Lỗi không xác định.' }, 500, origin)
  }
})
