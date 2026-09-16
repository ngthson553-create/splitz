// ── Splitz · Zalo OAuth Edge Function ──────────────────────────────────────
// Zalo CHẶN /me khi gọi từ IP ngoài VN (-501). Edge Function chạy ở Seoul →
// không gọi /me được. Giải pháp (chuẩn VN): /me gọi từ TRÌNH DUYỆT user (IP VN).
//
// Server chỉ lo: (1) đổi code→access_token (cần app secret, không bị chặn IP),
// (2) phát session sau khi user xác thực EMAIL bằng OTP.
//
// Bảo mật: server KHÔNG tự xác minh được zalo_id (vì /me bị chặn) → ĐỊNH DANH
// HOÀN TOÀN DỰA TRÊN EMAIL OTP. zalo_id chỉ là "ghi nhớ email" để lần sau khỏi
// gõ lại. Luôn cho phép đổi email → không thể chiếm tài khoản dù giả zalo_id.
//
// Actions (POST JSON { action, ... }):
//   "exchange"  { code, codeVerifier, redirectUri }  → { accessToken }
//   "init"      { zaloId, name?, avatar? }
//                 → { status:"need_email", zaloToken }           (chưa từng liên kết)
//                 | { status:"otp", zaloToken, email }           (đã liên kết → tự gửi OTP)
//   "send-otp"  { zaloToken, email }                 → { status:"otp", zaloToken, email }
//   "verify"    { zaloToken, otp }                   → { status:"ok", session }
//
// Secrets: ZALO_APP_ID, ZALO_APP_SECRET, ZALO_TOKEN_SECRET (+ SUPABASE_* tự có).

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const ZALO_APP_ID = Deno.env.get('ZALO_APP_ID')!
const ZALO_APP_SECRET = Deno.env.get('ZALO_APP_SECRET')!
const ZALO_TOKEN_SECRET = Deno.env.get('ZALO_TOKEN_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
if (!ZALO_APP_ID || !ZALO_APP_SECRET || !ZALO_TOKEN_SECRET) {
  console.error('[zalo-auth] THIẾU SECRET:', {
    ZALO_APP_ID: Boolean(ZALO_APP_ID),
    ZALO_APP_SECRET: Boolean(ZALO_APP_SECRET),
    ZALO_TOKEN_SECRET: Boolean(ZALO_TOKEN_SECRET),
  })
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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

function maskEmail(email: string): string {
  const [u, d] = email.split('@')
  if (!d) return email
  const head = u.slice(0, Math.min(2, u.length))
  return `${head}${'*'.repeat(Math.max(1, u.length - head.length))}@${d}`
}

// ── JWT tối giản (HS256) ký "zaloToken" ngắn hạn giữa các bước ──
function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
async function hmacKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ZALO_TOKEN_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}
async function signZaloToken(payload: Record<string, unknown>): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 600 }))
  const data = `${header}.${body}`
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), new TextEncoder().encode(data))
  return `${data}.${b64url(sig)}`
}
async function verifyZaloToken(token: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, b, s] = parts
  const ok = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(),
    b64urlToBytes(s),
    new TextEncoder().encode(`${h}.${b}`),
  )
  if (!ok) return null
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(b))) as Record<string, unknown>
  if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

// ── Zalo: đổi code → access_token (server, cần app secret) ──
async function exchangeZaloCode(code: string, codeVerifier: string): Promise<string> {
  const res = await fetch('https://oauth.zaloapp.com/v4/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      secret_key: ZALO_APP_SECRET,
    },
    body: new URLSearchParams({
      code,
      app_id: ZALO_APP_ID,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  })
  const data = await res.json()
  if (!data.access_token) {
    console.error('[zalo-auth] Zalo token endpoint rejected:', JSON.stringify(data))
    const detail = data.error_name || data.error_description || data.message || data.error || 'không rõ'
    throw new Error(`Zalo từ chối mã đăng nhập (${detail}).`)
  }
  return data.access_token as string
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  try {
    if (!(await isFeatureEnabled('zalo_login'))) {
      return json({ error: 'Đăng nhập Zalo đang tạm dừng. Vui lòng dùng Google hoặc email.' }, 503, origin)
    }

    const body = await req.json()
    const action = body.action as string

    // 1) Đổi code → access_token. Client sẽ dùng token này gọi /me từ IP VN.
    if (action === 'exchange') {
      const { code, codeVerifier } = body
      if (!code || !codeVerifier) return json({ error: 'Thiếu tham số.' }, 400, origin)
      const accessToken = await exchangeZaloCode(code, codeVerifier)
      return json({ accessToken }, 200, origin)
    }

    // 2) Client gửi zalo_id (đã lấy từ /me). Quyết định: cần email hay đã có.
    if (action === 'init') {
      const zaloId = body.zaloId ? String(body.zaloId) : ''
      const name = body.name ? String(body.name) : undefined
      const avatar = body.avatar ? String(body.avatar) : undefined
      if (!zaloId) return json({ error: 'Thiếu zalo_id.' }, 400, origin)

      const { data: link } = await admin
        .from('zalo_identities')
        .select('user_id')
        .eq('zalo_id', zaloId)
        .maybeSingle()

      if (link?.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(link.user_id)
        const email = u.user?.email
        if (email) {
          // Đã liên kết → tự gửi OTP tới email đã nhớ.
          const { error } = await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
          const zaloToken = await signZaloToken({ zaloId, name, avatar, email })
          if (error) {
            // Gửi email lỗi → KHÔNG chết luồng: cho client biết để hiện nút Google + gửi lại.
            console.error('[zalo-auth] init signInWithOtp failed:', error.message)
            return json(
              { status: 'otp', zaloToken, email: maskEmail(email), sendError: error.message },
              200,
              origin,
            )
          }
          return json({ status: 'otp', zaloToken, email: maskEmail(email) }, 200, origin)
        }
      }
      // Chưa liên kết → yêu cầu nhập email.
      const zaloToken = await signZaloToken({ zaloId, name, avatar })
      return json({ status: 'need_email', zaloToken }, 200, origin)
    }

    // 3) User nhập email (hoặc đổi email) → gửi OTP.
    if (action === 'send-otp') {
      const { zaloToken, email } = body
      if (!zaloToken || !email) return json({ error: 'Thiếu tham số.' }, 400, origin)
      const payload = await verifyZaloToken(zaloToken)
      if (!payload) return json({ error: 'Phiên Zalo hết hạn, thử lại.' }, 401, origin)

      const { error } = await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
      if (error) throw error
      const next = await signZaloToken({
        zaloId: payload.zaloId,
        name: payload.name,
        avatar: payload.avatar,
        email,
      })
      return json({ status: 'otp', zaloToken: next, email: maskEmail(String(email)) }, 200, origin)
    }

    // 3b) Liên kết qua GOOGLE (lần đầu, KHỎI OTP): user vừa đăng nhập Google
    //     (JWT chứng minh sở hữu email) → gắn zalo_id vào user đó.
    if (action === 'link-google') {
      const { zaloToken } = body
      if (!zaloToken) return json({ error: 'Thiếu tham số.' }, 400, origin)
      const payload = await verifyZaloToken(zaloToken)
      if (!payload) return json({ error: 'Phiên Zalo hết hạn, thử lại.' }, 401, origin)

      const authHeader = req.headers.get('Authorization') ?? ''
      const jwt = authHeader.replace(/^Bearer\s+/i, '')
      if (!jwt) return json({ error: 'Chưa đăng nhập Google.' }, 401, origin)
      const { data: u, error: uErr } = await admin.auth.getUser(jwt)
      if (uErr || !u.user) return json({ error: 'Phiên Google không hợp lệ.' }, 401, origin)

      const zaloId = String(payload.zaloId)
      // Chống chiếm: zalo_id đã thuộc user khác thì không cho gắn đè.
      const { data: existing } = await admin
        .from('zalo_identities')
        .select('user_id')
        .eq('zalo_id', zaloId)
        .maybeSingle()
      if (existing && existing.user_id !== u.user.id) {
        return json({ error: 'Tài khoản Zalo này đã liên kết người dùng khác.' }, 409, origin)
      }

      await admin.from('zalo_identities').upsert({
        zalo_id: zaloId,
        user_id: u.user.id,
        name: payload.name ?? null,
        picture: payload.avatar ?? null,
      })
      return json({ status: 'ok' }, 200, origin)
    }

    // 4) Xác thực OTP → phát session + ghi nhớ liên kết zalo_id↔user (email là chân lý).
    if (action === 'verify') {
      const { zaloToken, otp } = body
      if (!zaloToken || !otp) return json({ error: 'Thiếu tham số.' }, 400, origin)
      const payload = await verifyZaloToken(zaloToken)
      if (!payload || !payload.email) return json({ error: 'Phiên Zalo hết hạn, thử lại.' }, 401, origin)
      const email = String(payload.email)
      const zaloId = String(payload.zaloId)

      const { data: verified, error: vErr } = await admin.auth.verifyOtp({
        email,
        token: String(otp),
        type: 'email',
      })
      if (vErr || !verified.user || !verified.session) {
        return json({ error: 'Mã OTP không đúng hoặc đã hết hạn.' }, 401, origin)
      }

      // Ghi nhớ liên kết (last-write-wins): user vừa CHỨNG MINH kiểm soát email này.
      await admin.from('zalo_identities').upsert({
        zalo_id: zaloId,
        user_id: verified.user.id,
        name: payload.name ?? null,
        picture: payload.avatar ?? null,
      })

      return json({ status: 'ok', session: verified.session }, 200, origin)
    }

    return json({ error: 'Action không hợp lệ.' }, 400, origin)
  } catch (e) {
    console.error('[zalo-auth] UNHANDLED:', e instanceof Error ? (e.stack ?? e.message) : String(e))
    return json({ error: e instanceof Error ? e.message : 'Lỗi máy chủ.' }, 500, origin)
  }
})
