// Insight/nhận xét chi tiêu AI (verify_jwt=true). Free NẾM 3 lần/tháng (ai_usage
// feature='insight') → Premium unlimited. Trừ quota CHỈ khi sinh thành công.
// Client tính sẵn SỐ LIỆU (privacy + chính xác); function chỉ nhờ LLM viết nhận xét.
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, APP_ORIGINS.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { aiConfigured, generateInsightLLM, loadAiRuntimeConfig } from '../_shared/ai.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const FEATURE = 'insight'
const MAX_STATS = 20_000 // ký tự JSON

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
    if (!aiConfigured) return json({ error: 'Tính năng AI chưa được cấu hình.' }, 503, origin)

    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(jwt)
    if (!u.user) return json({ error: 'Chưa đăng nhập.' }, 401, origin)
    const uid = u.user.id

    const body = (await req.json()) as { stats?: unknown }
    const stats = body.stats
    if (!stats || typeof stats !== 'object') return json({ error: 'Thiếu số liệu.' }, 400, origin)
    if (JSON.stringify(stats).length > MAX_STATS) return json({ error: 'Số liệu quá lớn.' }, 400, origin)

    const aiConfig = await loadAiRuntimeConfig(admin)
    if (!aiConfig.flags.insight) return json({ error: 'Tính năng insight AI đang tạm tắt.' }, 503, origin)
    const freeLimit = aiConfig.quotas.insightFree

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
            error: `Đã dùng hết ${freeLimit} lượt phân tích AI miễn phí tháng này. Nâng cấp Premium để xem không giới hạn.`,
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

    const insight = await generateInsightLLM(stats, {
      provider: aiConfig.provider,
      promptTemplate: aiConfig.prompts.insight,
    })

    let remaining: number | null = null
    if (isFree) {
      const { data: newCount } = await admin.rpc('bump_ai_usage', {
        p_uid: uid,
        p_feature: FEATURE,
        p_period: period,
      })
      remaining = Math.max(0, freeLimit - (Number(newCount) || 0))
    }

    return json({ insight, remaining, limit: isFree ? freeLimit : null, plan }, 200, origin)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Không tạo được phân tích.' }, 500, origin)
  }
})
