import { getSupabase } from '../supabase/client'
import { t } from '../i18n'

async function fnError(error: unknown): Promise<never> {
  const ctx = (error as { context?: Response })?.context
  if (ctx) {
    try {
      const body = await ctx.json()
      if (body?.error) throw new Error(body.error)
    } catch {
      // dùng message mặc định
    }
  }
  throw error instanceof Error ? error : new Error(t().errors.unknownError)
}

/** Tạo link thanh toán PayOS cho gói → trả checkoutUrl. */
export async function createPayosLink(plan: 'personal' | 'team', cycle: 'month' | 'year'): Promise<string> {
  const { data, error } = await getSupabase().functions.invoke('payos-create', {
    body: { plan, cycle },
  })
  if (error) await fnError(error)
  if (!data?.checkoutUrl) throw new Error(t().errors.paymentLinkFailed)
  return data.checkoutUrl as string
}

/** Kích hoạt bằng mã → trả về tên gói được cấp. */
export async function redeemCode(code: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('redeem_code', { p_code: code })
  if (error) throw new Error(error.message || t().errors.redeemCodeInvalid)
  return data as string
}
