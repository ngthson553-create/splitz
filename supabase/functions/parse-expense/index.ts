// Nhập chi tự nhiên bằng LLM (verify_jwt=true). Giấu API key, enforce quota:
//  FREE = 15 lần/tháng/feature → Premium = không giới hạn (effective_plan != 'free').
// Parser quy tắc (client) là FREE unlimited → đây CHỈ là đường "hiểu thông minh".
// Trừ quota CHỈ khi LLM trả thành công (bump sau khi parse OK).
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY (+ tùy chọn
//          GEMINI_MODEL, DEEPSEEK_API_KEY), APP_ORIGINS (CORS).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { aiConfigured, loadAiRuntimeConfig, parseExpenseLLM } from '../_shared/ai.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const FEATURE = 'parse_expense'
const MAX_TEXT = 500
const MAX_MEMBERS = 60

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

// Tháng hiện tại theo UTC: 'YYYY-MM'.
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

    const body = (await req.json()) as { text?: string; memberNames?: string[] }
    const text = (body.text ?? '').trim()
    const memberNames = (body.memberNames ?? []).filter((n) => typeof n === 'string' && n.trim())
    if (!text) return json({ error: 'Chưa nhập nội dung.' }, 400, origin)
    if (text.length > MAX_TEXT) return json({ error: 'Nội dung quá dài.' }, 400, origin)
    if (memberNames.length > MAX_MEMBERS) return json({ error: 'Nhóm quá lớn.' }, 400, origin)

    const aiConfig = await loadAiRuntimeConfig(admin)
    if (!aiConfig.flags.parseExpense) return json({ error: 'Tính năng nhập chi tự nhiên đang tạm tắt.' }, 503, origin)
    const freeLimit = aiConfig.quotas.parseExpenseFree

    // Gói hiệu lực (free / personal / team) — quyết định có giới hạn không.
    const { data: planRaw } = await admin.rpc('effective_plan', { uid })
    const plan = (planRaw as string) ?? 'free'
    const isFree = plan === 'free'
    const period = currentPeriod()

    // Free: kiểm quota TRƯỚC khi gọi LLM.
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
            error: `Đã dùng hết ${freeLimit} lượt AI miễn phí tháng này. Nâng cấp Premium để dùng không giới hạn (hoặc dùng "Điền nhanh" miễn phí).`,
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

    // Gọi LLM (Gemini → DeepSeek dự phòng).
    const parsed = await parseExpenseLLM(text, memberNames, {
      provider: aiConfig.provider,
      promptTemplate: aiConfig.prompts.parseExpense,
    })

    // Trừ quota CHỈ khi thành công.
    let remaining: number | null = null
    if (isFree) {
      const { data: newCount } = await admin.rpc('bump_ai_usage', {
        p_uid: uid,
        p_feature: FEATURE,
        p_period: period,
      })
      remaining = Math.max(0, freeLimit - (Number(newCount) || 0))
    }

    return json({ parsed, remaining, limit: isFree ? freeLimit : null, plan }, 200, origin)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Không phân tích được.' }, 500, origin)
  }
})
