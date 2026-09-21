import { getSupabase } from '../supabase/client'
import { t } from '../i18n'

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
  throw error instanceof Error ? error : new Error(t().errors.remindSendFailed)
}

export type RemindStatus = 'sent' | 'no_device' | 'not_real_user' | 'cooldown' | 'invalid'

export type RemindResult = {
  fromMemberId: string
  status: RemindStatus
  devices?: number
  retryAfterMs?: number
}

export type RemindTarget = { fromMemberId: string; amount: number }

/** Nhắc 1 hoặc nhiều con nợ (Web Push). Edge Function enforce rate-limit 1 lần/24h/khoản. */
export async function remindDebts(
  groupId: string,
  targets: RemindTarget[],
): Promise<{ sent: number; results: RemindResult[] }> {
  const amounts: Record<string, number> = {}
  for (const t of targets) amounts[t.fromMemberId] = t.amount
  const { data, error } = await getSupabase().functions.invoke('remind-debt', {
    body: { groupId, fromMemberIds: targets.map((t) => t.fromMemberId), amounts },
  })
  if (error) await fnError(error)
  return { sent: data?.sent ?? 0, results: (data?.results ?? []) as RemindResult[] }
}

/**
 * Map "lần nhắc gần nhất" cho các khoản MÀ TÔI là chủ nợ → key = fromMemberId (con nợ).
 * Dùng để hiển thị cooldown trên nút Nhắc. Chỉ lấy bản ghi to_member = myMemberId.
 */
export async function listMyDebtReminders(
  groupId: string,
  myMemberId: string,
): Promise<Map<string, number>> {
  const { data, error } = await getSupabase()
    .from('debt_reminders')
    .select('from_member_id,reminded_at')
    .eq('group_id', groupId)
    .eq('to_member_id', myMemberId)
    .order('reminded_at', { ascending: false })
  if (error) throw error
  const map = new Map<string, number>()
  for (const r of data ?? []) {
    const ts = new Date(r.reminded_at as string).getTime()
    const prev = map.get(r.from_member_id as string)
    if (prev === undefined || ts > prev) map.set(r.from_member_id as string, ts)
  }
  return map
}
