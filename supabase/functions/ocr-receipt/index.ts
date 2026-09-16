// Quét hoá đơn OCR → danh sách món (verify_jwt=true). Vision đắt hơn → PREMIUM,
// Free được NẾM 3 lần/tháng (qua ai_usage feature='ocr_receipt') rồi khoá → Premium unlimited.
// Trừ quota CHỈ khi vision trả thành công. Ảnh nén phía client; KHÔNG lưu ở đây
// (đính kèm do client upload Storage sau khi lưu khoản chi).
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, APP_ORIGINS.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { loadAiRuntimeConfig, ocrReceiptLLM, visionConfigured } from '../_shared/ai.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const FEATURE = 'ocr_receipt'
const MAX_IMAGE_B64 = 8 * 1024 * 1024 // ~6MB ảnh sau nén (base64 phình ~33%)

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function currentPeriod(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  try {
    if (!visionConfigured) return json({ error: 'Tính năng quét hoá đơn chưa được cấu hình.' }, 503, origin)

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u.user) return json({ error: 'Chưa đăng nhập.' }, 401, origin)
    const uid = u.user.id

    const body = (await req.json()) as { imageBase64?: string; mimeType?: string }
    const imageBase64 = body.imageBase64 ?? ''
    const mimeType = body.mimeType ?? 'image/jpeg'
    if (!imageBase64) return json({ error: 'Thiếu ảnh hoá đơn.' }, 400, origin)
    if (imageBase64.length > MAX_IMAGE_B64) return json({ error: 'Ảnh quá lớn.' }, 400, origin)

    const aiConfig = await loadAiRuntimeConfig(admin)
    if (!aiConfig.flags.ocrReceipt) return json({ error: 'Tính năng quét hoá đơn đang tạm tắt.' }, 503, origin)
    const freeLimit = aiConfig.quotas.ocrReceiptFree

    const { data: planRaw } = await admin.rpc('effective_plan', { uid })
    const plan = (planRaw as string) ?? 'free'
    const isFree = plan === 'free'
    const period = currentPeriod()

    if (isFree) {
      const { data: row } = await admin
        .from('ai_usage')
        .select('count')
        .eq('user_id', uid)
        .eq('feature', FEATURE)
        .eq('period', period)
        .maybeSingle()
      const used = row?.count ?? 0
      if (used >= freeLimit) {
        return json(
          {
            error: `Đã dùng hết ${freeLimit} lượt quét hoá đơn miễn phí tháng này. Nâng cấp Premium để quét không giới hạn.`,
            quotaExceeded: true,
            remaining: 0,
            limit: freeLimit,
            plan,
          },
          429,
          origin,
        )
      }
    }

    const items = await ocrReceiptLLM(imageBase64, mimeType, {
      provider: aiConfig.provider,
      promptTemplate: aiConfig.prompts.ocrReceipt,
    })
    if (items.length === 0) {
      // Không trừ quota khi không đọc được món nào.
      return json({ items: [], remaining: null, message: 'Không nhận được món nào từ ảnh.' }, 200, origin)
    }

    let remaining: number | null = null
    if (isFree) {
      const { data: newCount } = await admin.rpc('bump_ai_usage', {
        p_uid: uid,
        p_feature: FEATURE,
        p_period: period,
      })
      remaining = Math.max(0, freeLimit - (Number(newCount) || 0))
    }

    return json({ items, remaining, limit: isFree ? freeLimit : null, plan }, 200, origin)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Không quét được hoá đơn.' }, 500, origin)
  }
})
