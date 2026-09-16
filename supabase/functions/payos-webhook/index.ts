// Webhook PayOS — verify chữ ký checksum, kích hoạt gói. KHÔNG yêu cầu JWT
// (PayOS gọi). Đặt verify_jwt=false trong config.toml.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { hmacHex, sortedQuery, CYCLE_DAYS, timingSafeEqual } from '../_shared/payos.ts'

const PAYOS_CHECKSUM_KEY = Deno.env.get('PAYOS_CHECKSUM_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const body = await req.json()
    const data = body?.data
    const signature = body?.signature
    if (!data || !signature) return new Response(JSON.stringify({ success: false }), { status: 200 })

    // Verify: HMAC của data (khoá sắp alpha) == signature.
    const expected = await hmacHex(PAYOS_CHECKSUM_KEY, sortedQuery(data))
    if (!timingSafeEqual(expected, String(signature))) {
      return new Response(JSON.stringify({ success: false, error: 'invalid signature' }), { status: 200 })
    }

    // Thành công khi code '00'. Tra đơn → kích hoạt (idempotent: chỉ khi còn pending).
    if (body.code === '00' || body.success === true) {
      const orderCode = Number(data.orderCode)
      // Claim đơn NGUYÊN TỬ: chỉ 1 lần giao (kể cả PayOS retry đồng thời) flip được
      // pending→paid; chỉ lần đó mới grant → không bao giờ cộng dồn 2 chu kỳ.
      const { data: claimed } = await admin
        .from('payment_orders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('order_code', orderCode)
        .eq('status', 'pending')
        .select('user_id,plan,cycle')
      if (claimed && claimed.length > 0) {
        const o = claimed[0]
        await admin.rpc('grant_subscription', {
          p_uid: o.user_id,
          p_plan: o.plan,
          p_days: CYCLE_DAYS[o.cycle] ?? 30,
          p_source: 'payos',
        })
      }
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ success: false }), { status: 200 })
  }
})
