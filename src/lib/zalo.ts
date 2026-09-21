// ── Splitz · Client Zalo OAuth (PKCE) ──────────────────────────────────────
// Zalo CHẶN /me khi gọi từ IP ngoài VN → /me PHẢI gọi từ TRÌNH DUYỆT user (IP VN).
// Luồng:
//   startZaloLogin()  → redirect sang Zalo (PKCE)
//   [callback] exchangeZaloCode(code,verifier) → Edge đổi lấy accessToken
//   fetchZaloProfile(accessToken)              → CLIENT gọi /me (IP VN) lấy id/name/avatar
//   initZaloLogin({id,name,avatar})            → Edge: cần email? hay đã có → gửi OTP
//   sendOtp/verifyOtp                          → Edge xác thực email → session
import { getSupabase } from './supabase/client'
import { t } from './i18n'
import type { Session } from '@supabase/supabase-js'

const ZALO_APP_ID = import.meta.env.VITE_ZALO_APP_ID?.trim()
export const isZaloConfigured = Boolean(ZALO_APP_ID)

const VERIFIER_KEY = 'splitz.zalo.pkce_verifier'
const STATE_KEY = 'splitz.zalo.state'

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function sha256(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return new Uint8Array(digest)
}
function randomString(len = 64): string {
  return base64url(crypto.getRandomValues(new Uint8Array(len)))
}

export function zaloRedirectUri(): string {
  return `${window.location.origin}/auth/zalo/callback`
}

/** Bước 1: chuyển hướng sang trang cho phép của Zalo (PKCE). */
export async function startZaloLogin(): Promise<void> {
  if (!ZALO_APP_ID) throw new Error(t().errors.zaloNotConfigured)
  const verifier = randomString(64)
  const challenge = base64url(await sha256(verifier))
  const state = randomString(16)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)

  const url = new URL('https://oauth.zaloapp.com/v4/permission')
  url.searchParams.set('app_id', ZALO_APP_ID)
  url.searchParams.set('redirect_uri', zaloRedirectUri())
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('state', state)
  window.location.href = url.toString()
}

async function callZaloAuth<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke('zalo-auth', {
    body: { action, ...payload },
  })
  if (error) {
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      try {
        const b = await ctx.json()
        if (b?.error) throw new Error(b.error)
      } catch { /* dùng message mặc định */ }
    }
    throw error
  }
  return data as T
}

export type ZaloProfile = { id: string; name?: string; avatar?: string }

/** Bước 2a: Edge đổi authorization code (PKCE) → access_token. */
export async function exchangeZaloCode(code: string, state: string): Promise<string> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  const savedState = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  if (!verifier) throw new Error(t().errors.zaloSessionInvalid)
  if (savedState && state && savedState !== state) throw new Error(t().errors.zaloStateMismatch)

  const { accessToken } = await callZaloAuth<{ accessToken: string }>('exchange', {
    code,
    codeVerifier: verifier,
    redirectUri: zaloRedirectUri(),
  })
  return accessToken
}

/** Bước 2b: CLIENT gọi /me (IP VN) — lấy id (+name/avatar nếu Zalo cho). */
export async function fetchZaloProfile(accessToken: string): Promise<ZaloProfile> {
  const url = new URL('https://graph.zalo.me/v2.0/me')
  url.searchParams.set('fields', 'id,name,picture')
  const res = await fetch(url, { headers: { access_token: accessToken } })
  const data = await res.json()
  if (!data.id) {
    throw new Error(
      data?.message ? `Zalo: ${data.message}` : t().errors.zaloProfileFailed,
    )
  }
  return {
    id: String(data.id),
    name: data.name || undefined,
    avatar: data.picture?.data?.url || undefined,
  }
}

export type InitResult =
  | { status: 'need_email'; zaloToken: string }
  | { status: 'otp'; zaloToken: string; email: string; sendError?: string }

/** Bước 3: gửi id lên Edge → cần nhập email, hoặc đã liên kết → tự gửi OTP. */
export async function initZaloLogin(profile: ZaloProfile): Promise<InitResult> {
  return callZaloAuth<InitResult>('init', {
    zaloId: profile.id,
    name: profile.name,
    avatar: profile.avatar,
  })
}

/** Gửi OTP tới email user nhập (lần đầu / đổi email). */
export async function sendZaloEmailOtp(
  zaloToken: string,
  email: string,
): Promise<{ zaloToken: string; email: string }> {
  const r = await callZaloAuth<{ status: 'otp'; zaloToken: string; email: string }>('send-otp', {
    zaloToken,
    email,
  })
  return { zaloToken: r.zaloToken, email: r.email }
}

/** Xác thực OTP → trả session. */
export async function verifyZaloOtp(zaloToken: string, otp: string): Promise<Session> {
  const r = await callZaloAuth<{ status: 'ok'; session: Session }>('verify', { zaloToken, otp })
  return r.session
}

const PENDING_LINK_KEY = 'splitz.zalo.pending_link'

/**
 * Lần đầu: liên kết bằng GOOGLE thay vì OTP. Lưu zaloToken rồi chuyển sang Google OAuth.
 * Sau khi Google redirect về callback (?zalolink=1), completeGoogleLink() sẽ gắn zalo_id.
 */
export async function linkZaloViaGoogle(zaloToken: string): Promise<void> {
  sessionStorage.setItem(PENDING_LINK_KEY, zaloToken)
  const { error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/zalo/callback?zalolink=1` },
  })
  if (error) {
    sessionStorage.removeItem(PENDING_LINK_KEY)
    throw error
  }
}

export function hasPendingGoogleLink(): boolean {
  return Boolean(sessionStorage.getItem(PENDING_LINK_KEY))
}

/**
 * Sau khi Google redirect về: user đã có session Google. Gắn zalo_id vào account này.
 * functions.invoke tự đính kèm JWT Google qua Authorization → Edge xác thực email.
 */
export async function completeGoogleLink(): Promise<void> {
  const zaloToken = sessionStorage.getItem(PENDING_LINK_KEY)
  sessionStorage.removeItem(PENDING_LINK_KEY)
  if (!zaloToken) throw new Error(t().errors.zaloLinkSessionMissing)
  await callZaloAuth<{ status: 'ok' }>('link-google', { zaloToken })
}

/** Áp session do Edge phát vào Supabase client. */
export async function applySession(session: Session): Promise<void> {
  const { error } = await getSupabase().auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (error) throw error
}
