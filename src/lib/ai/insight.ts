import { getSupabase } from '../supabase/client'
import { t } from '../i18n'
import type { InsightStats } from '../insight'

async function fnError(error: unknown): Promise<never> {
  const ctx = (error as { context?: Response })?.context
  if (ctx) {
    try {
      const body = await ctx.json()
      if (body?.error) throw new Error(body.error)
    } catch (e) {
      if (e instanceof Error && e.message) throw e
    }
  }
  throw error instanceof Error ? error : new Error(t().errors.insightFailed)
}

export type SpendingInsight = { headline: string; points: string[] }
export type InsightResult = {
  insight: SpendingInsight
  remaining: number | null
  limit: number | null
  plan?: string
}

/** Gọi Edge Function `insight` — LLM viết nhận xét từ số liệu đã tính sẵn. Quota phía server. */
export async function requestInsight(stats: InsightStats): Promise<InsightResult> {
  const { data, error } = await getSupabase().functions.invoke('insight', { body: { stats } })
  if (error) await fnError(error)
  if (!data?.insight) throw new Error(t().errors.insightFailed)
  return data as InsightResult
}
