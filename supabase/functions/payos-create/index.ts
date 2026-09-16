// Tạo link thanh toán PayOS cho 1 gói. Yêu cầu user đăng nhập (verify_jwt=true).
// Lưu payment_orders (pending) để webhook tra cứu kích hoạt cho ai.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { PRICES, hmacHex, sortedQuery } from '../_shared/payos.ts'

const PAYOS_CLIENT_ID = Deno.env.get('PAYOS_CLIENT_ID')!
const PAYOS_API_KEY = Deno.env.get('PAYOS_API_KEY')!
const PAYOS_CHECKSUM_KEY = Deno.env.get('PAYOS_CHECKSUM_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

async function isFeatureEnabled(key: string, fallback = true): Promise<boolean> {
  const { data, error } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', key)
    .maybeSingle()
  if (error || !data) return fallback
  return data.enabled !== false
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  try {
    // user từ JWT (gateway đã verify_jwt=true)
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u.user) return json({ error: 'Chưa đăng nhập.' }, 401, origin)

    if (!(await isFeatureEnabled('payments'))) {
      return json({ error: 'Thanh toán đang tạm dừng. Vui lòng thử lại sau.' }, 503, origin)
    }

    const { plan, cycle } = await req.json()
    const amount = PRICES[plan]?.[cycle]
    if (!amount) return json({ error: 'Gói/chu kỳ không hợp lệ.' }, 400, origin)

    // Mã đơn duy nhất: ms * 1000 + ngẫu nhiên → tránh trùng PK khi 2 đơn cùng millisecond.
    const orderCode = Date.now() * 1000 + Math.floor(Math.random() * 1000)
    const returnUrl = `${APP_URL}/settings?payment=success`
    const cancelUrl = `${APP_URL}/settings?payment=cancel`
    const description = 'Splitz Premium' // PayOS giới hạn 25 ký tự

    await admin.from('payment_orders').insert({
      order_code: orderCode,
      user_id: u.user.id,
      plan,
      cycle,
      amount,
    })

    const signature = await hmacHex(
      PAYOS_CHECKSUM_KEY,
      sortedQuery({ amount, cancelUrl, description, orderCode, returnUrl }),
    )

    const res = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': PAYOS_CLIENT_ID,
        'x-api-key': PAYOS_API_KEY,
      },
      body: JSON.stringify({
        orderCode,
        amount,
        description,
        cancelUrl,
        returnUrl,
        signature,
      }),
    })
    const data = await res.json()
    if (data.code !== '00' || !data.data?.checkoutUrl) {
      return json({ error: data.desc ?? 'PayOS từ chối tạo đơn.', detail: data }, 400, origin)
    }
    return json({ checkoutUrl: data.data.checkoutUrl, orderCode }, 200, origin)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Lỗi máy chủ.' }, 500, origin)
  }
})
