/**
 * Nguồn env duy nhất của app: cấu hình RUNTIME (Docker) ưu tiên trước, fallback
 * về giá trị nhúng lúc build (import.meta.env).
 *
 * Vite thay thế import.meta.env.VITE_* lúc BUILD — không có lớp này thì image
 * Docker phát hành sẽ đóng băng cấu hình của máy build, người chạy không đổi
 * được Supabase/PostHog... mà phải tự build lại.
 */

export type RuntimeEnvName =
  | 'VITE_SUPABASE_URL'
  | 'VITE_SUPABASE_ANON_KEY'
  | 'VITE_ZALO_APP_ID'
  | 'VITE_VAPID_PUBLIC_KEY'
  | 'VITE_POSTHOG_HOST'
  | 'VITE_POSTHOG_KEY'
  | 'VITE_SENTRY_DSN'

export interface SplitzRuntimeConfig {
  [key: string]: string | undefined
}

declare global {
  interface Window {
    __SPLITZ_CONFIG__?: SplitzRuntimeConfig
  }
}

/**
 * Giá trị đã trim, hoặc undefined khi trống/chưa cấu hình.
 * Giữ nguyên chữ ký "string | undefined" để các call-site hiện tại
 * (`?.trim()` phía sau) không đổi hành vi.
 */
export function runtimeEnv(name: RuntimeEnvName): string | undefined {
  const fromRuntime =
    typeof window !== 'undefined' ? window.__SPLITZ_CONFIG__?.[name] : undefined
  const value = fromRuntime ?? (import.meta.env[name] as string | undefined)
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
