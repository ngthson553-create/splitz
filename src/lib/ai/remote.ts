import { getSupabase } from '../supabase/client'
import type { ParsedExpense } from './parseExpense'

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
  throw error instanceof Error ? error : new Error('Không phân tích được.')
}

export type RemoteParseResult = {
  parsed: ParsedExpense
  /** Số lượt AI còn lại tháng này (null = Premium không giới hạn). */
  remaining: number | null
  limit: number | null
  plan: string
}

/** Gọi LLM (Gemini) qua Edge Function để hiểu câu phức tạp. Quota enforce phía server. */
export async function parseExpenseRemote(
  text: string,
  memberNames: string[],
): Promise<RemoteParseResult> {
  const { data, error } = await getSupabase().functions.invoke('parse-expense', {
    body: { text, memberNames },
  })
  if (error) await fnError(error)
  if (!data?.parsed) throw new Error('Không phân tích được.')
  return data as RemoteParseResult
}
