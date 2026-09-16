import { isSupabaseConfigured } from '../supabase/client'
import { LocalGroupRepository } from './local'
import type { GroupRepository } from './repository'
import { SupabaseGroupRepository } from './supabase'

export type { GroupRepository } from './repository'

let instance: GroupRepository | null = null

/** Chọn adapter: có cấu hình Supabase → cloud; không → local (chạy ngay, 0 config). */
export function getRepository(): GroupRepository {
  if (!instance) {
    instance = isSupabaseConfigured ? new SupabaseGroupRepository() : new LocalGroupRepository()
  }
  return instance
}
