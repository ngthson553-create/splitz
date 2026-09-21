import { getSupabase } from './supabase/client'
import { t } from './i18n'
import { runtimeEnv } from './env'

const VAPID_PUBLIC = runtimeEnv('VITE_VAPID_PUBLIC_KEY')

export const isPushSupported =
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  typeof window !== 'undefined' &&
  'PushManager' in window &&
  'Notification' in window

export const isPushConfigured = Boolean(VAPID_PUBLIC) && isPushSupported

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const arr = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

/** Xin quyền, đăng ký service worker + push, lưu subscription vào DB. */
export async function enablePush(): Promise<void> {
  if (!isPushConfigured) throw new Error(t().errors.pushUnsupported)
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error(t().errors.pushPermissionDenied)

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC as string),
  })
  const json = sub.toJSON()
  const sb = getSupabase()
  const { data: u } = await sb.auth.getUser()
  if (!u.user) throw new Error(t().errors.notSignedIn)
  const { error } = await sb.from('push_subscriptions').upsert(
    {
      user_id: u.user.id,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
    { onConflict: 'endpoint', ignoreDuplicates: true },
  )
  if (error) throw error
}

/** Huỷ đăng ký push trên thiết bị này. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await getSupabase().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (!isPushSupported) return false
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return Boolean(sub)
}
