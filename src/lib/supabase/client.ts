import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { t } from '../i18n'
import { runtimeEnv } from '../env'

const url = runtimeEnv('VITE_SUPABASE_URL')
const anonKey = runtimeEnv('VITE_SUPABASE_ANON_KEY')

/** Bật cloud khi có đủ cấu hình; nếu trống → app chạy chế độ local. */
export const isSupabaseConfigured = Boolean(url && anonKey)

let cached: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(t().errors.supabaseNotConfigured)
  }
  if (!cached) {
    cached = createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  return cached
}
