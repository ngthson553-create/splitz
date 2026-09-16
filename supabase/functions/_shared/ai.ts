// Tầng AI dùng chung — adapter dễ đổi provider (Gemini chính, DeepSeek dự phòng).
// Trả JSON đã parse cho việc "nhập chi tự nhiên". KHÔNG giữ state; key đọc từ env.

export interface ParsedExpense {
  title: string
  amount: number // VND, số nguyên
  payerName: string | null
  participantNames: string[]
  splitMode: 'equal' | 'shares' | 'percent' | 'exact' | 'itemized'
}

export type AiProviderName = 'gemini' | 'deepseek'

export interface AiProviderSettings {
  active: AiProviderName
  fallback: AiProviderName
  geminiModel: string
  deepseekModel: string
}

export interface AiRuntimeConfig {
  provider: AiProviderSettings & {
    status: 'configured' | 'missing'
    detail: string
  }
  flags: {
    parseExpense: boolean
    ocrReceipt: boolean
    insight: boolean
  }
  quotas: {
    parseExpenseFree: number
    ocrReceiptFree: number
    insightFree: number
  }
  prompts: {
    parseExpense: string
    ocrReceipt: string
    insight: string
  }
}

export interface AiCallOptions {
  provider?: AiProviderSettings
  promptTemplate?: string | null
}

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.0-flash'
const DEEPSEEK_KEY = Deno.env.get('DEEPSEEK_API_KEY')
const DEEPSEEK_MODEL = Deno.env.get('DEEPSEEK_MODEL') ?? 'deepseek-v4-flash'

export const aiConfigured = Boolean(GEMINI_KEY || DEEPSEEK_KEY)

const DEFAULT_PROVIDER: AiProviderSettings = {
  active: 'gemini',
  fallback: 'deepseek',
  geminiModel: GEMINI_MODEL,
  deepseekModel: DEEPSEEK_MODEL,
}

const DEFAULT_PARSE_PROMPT_TEMPLATE = [
  'Bạn là trợ lý bóc tách khoản chi tiêu nhóm từ câu tiếng Việt.',
  'Danh sách thành viên trong nhóm (chỉ được chọn tên trong đây): {{memberNames}}.',
  'Phân tích câu sau và trả về JSON đúng schema:',
  '- title: tiêu đề ngắn gọn của khoản chi (không kèm số tiền/tên người).',
  '- amount: số tiền QUY ĐỔI RA VND, số nguyên. "k"=nghìn, "tr"/"triệu"=triệu. Không bóc được thì 0.',
  '- payerName: tên người TRẢ (phải khớp đúng 1 tên trong danh sách) hoặc null nếu không rõ.',
  '- participantNames: danh sách tên người CÙNG CHIA (khớp danh sách). Không nêu rõ thì lấy tất cả thành viên.',
  '- splitMode: "equal" trừ khi câu nói rõ chia theo phần/phần trăm/số tay/theo món.',
  'Câu: "{{text}}"',
].join('\n')

const DEFAULT_OCR_PROMPT_TEMPLATE = [
  'Đây là ảnh hoá đơn / biên lai mua hàng (thường tiếng Việt).',
  'Trích DANH SÁCH TỪNG MÓN: mỗi món gồm tên (title) và GIÁ THÀNH TIỀN của dòng đó (amount, VND, số nguyên).',
  'Nếu món có số lượng > 1, amount là thành tiền cả dòng (đơn giá × số lượng).',
  'BỎ QUA các dòng tổng cộng/tạm tính/tiền khách đưa/tiền thối/điểm tích luỹ.',
  'GIỮ các dòng phụ phí, thuế, phí dịch vụ nếu chúng là khoản tính tiền riêng.',
  'Không đọc được giá của dòng nào thì bỏ dòng đó. Trả JSON đúng schema { items: [...] }.',
].join('\n')

const DEFAULT_INSIGHT_PROMPT_TEMPLATE = [
  'Bạn là cố vấn chi tiêu thân thiện, nói tiếng Việt gọn gàng, tích cực, KHÔNG phán xét.',
  'Dưới đây là SỐ LIỆU ĐÃ TÍNH SẴN (đơn vị VND) của nhóm chia tiền / bảng tổng quan.',
  'Viết nhận xét: 1 câu "headline" tổng quát + 3 đến 5 gạch đầu dòng "points" hữu ích.',
  'Gợi ý nội dung: nhóm/bạn chi nhiều cho LOẠI gì (tự suy luận từ tên khoản: ăn uống, đi lại, mua sắm, giải trí, hoá đơn...), ai chi nhiều nhất, xu hướng tháng này so tháng trước, vị thế nợ/được nhận của người dùng, gợi ý quyết toán nếu còn nợ.',
  'TUYỆT ĐỐI không bịa số ngoài dữ liệu. Tiền viết gọn kiểu 450k, 1,2tr. Mỗi point ngắn (≤ 22 từ).',
  'DỮ LIỆU JSON:',
  '{{stats}}',
].join('\n')

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => vars[key] ?? '')
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function intValue(value: unknown, fallback: number, min = 0, max = 9999): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.trunc(n), min), max)
}

function providerName(value: unknown, fallback: AiProviderName): AiProviderName {
  return value === 'deepseek' || value === 'gemini' ? value : fallback
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function providerAvailable(provider: AiProviderName): boolean {
  return provider === 'gemini' ? Boolean(GEMINI_KEY) : Boolean(DEEPSEEK_KEY)
}

function uniqueProviderOrder(provider: AiProviderSettings): AiProviderName[] {
  const order = [provider.active, provider.fallback, 'gemini', 'deepseek'] as AiProviderName[]
  return order.filter((item, index) => order.indexOf(item) === index)
}

export async function loadAiRuntimeConfig(admin: any): Promise<AiRuntimeConfig> {
  const defaults: AiRuntimeConfig = {
    provider: {
      ...DEFAULT_PROVIDER,
      status: aiConfigured ? 'configured' : 'missing',
      detail: aiConfigured ? 'AI provider key configured' : 'No AI provider key configured',
    },
    flags: { parseExpense: true, ocrReceipt: true, insight: true },
    quotas: { parseExpenseFree: 15, ocrReceiptFree: 3, insightFree: 3 },
    prompts: {
      parseExpense: DEFAULT_PARSE_PROMPT_TEMPLATE,
      ocrReceipt: DEFAULT_OCR_PROMPT_TEMPLATE,
      insight: DEFAULT_INSIGHT_PROMPT_TEMPLATE,
    },
  }

  try {
    const [flagRes, configRes, promptRes] = await Promise.all([
      admin.from('feature_flags').select('key,enabled').in('key', ['ai_parse_expense', 'ai_ocr_receipt', 'ai_insight']),
      admin.from('app_config').select('key,value').in('key', ['ai_provider', 'ai_quota']),
      admin
        .from('ai_prompt_versions')
        .select('prompt_key,prompt,version')
        .eq('active', true)
        .in('prompt_key', ['parse_expense', 'ocr_receipt', 'insight'])
        .order('version', { ascending: false }),
    ])

    const flags = defaults.flags
    for (const row of flagRes.data ?? []) {
      if (row.key === 'ai_parse_expense') flags.parseExpense = row.enabled !== false
      if (row.key === 'ai_ocr_receipt') flags.ocrReceipt = row.enabled !== false
      if (row.key === 'ai_insight') flags.insight = row.enabled !== false
    }

    const appConfig = new Map<string, Record<string, unknown>>()
    for (const row of configRes.data ?? []) appConfig.set(row.key as string, readObject(row.value))
    const providerConfig = appConfig.get('ai_provider') ?? {}
    const quotaConfig = appConfig.get('ai_quota') ?? {}
    const provider: AiProviderSettings = {
      active: providerName(providerConfig.active, defaults.provider.active),
      fallback: providerName(providerConfig.fallback, defaults.provider.fallback),
      geminiModel: cleanText(providerConfig.gemini_model) ?? defaults.provider.geminiModel,
      deepseekModel: cleanText(providerConfig.deepseek_model) ?? defaults.provider.deepseekModel,
    }

    const prompts = defaults.prompts
    const seenPrompt = new Set<string>()
    for (const row of promptRes.data ?? []) {
      const key = cleanText(row.prompt_key)
      const prompt = cleanText(row.prompt)
      if (!key || !prompt || seenPrompt.has(key)) continue
      seenPrompt.add(key)
      if (key === 'parse_expense') prompts.parseExpense = prompt
      if (key === 'ocr_receipt') prompts.ocrReceipt = prompt
      if (key === 'insight') prompts.insight = prompt
    }

    const configuredProviders = [GEMINI_KEY ? 'Gemini' : null, DEEPSEEK_KEY ? 'DeepSeek' : null].filter(Boolean).join(', ')
    return {
      provider: {
        ...provider,
        status: aiConfigured ? 'configured' : 'missing',
        detail: aiConfigured
          ? `Active ${provider.active}, fallback ${provider.fallback}; configured: ${configuredProviders}`
          : 'No AI provider key configured',
      },
      flags,
      quotas: {
        parseExpenseFree: intValue(quotaConfig.parse_free, defaults.quotas.parseExpenseFree, 0, 999),
        ocrReceiptFree: intValue(quotaConfig.ocr_free, defaults.quotas.ocrReceiptFree, 0, 999),
        insightFree: intValue(quotaConfig.insight_free, defaults.quotas.insightFree, 0, 999),
      },
      prompts,
    }
  } catch {
    return defaults
  }
}

function buildPrompt(text: string, memberNames: string[], template = DEFAULT_PARSE_PROMPT_TEMPLATE): string {
  return renderTemplate(template, { text, memberNames: JSON.stringify(memberNames) })
}

function coerce(raw: unknown, memberNames: string[]): ParsedExpense {
  const o = (raw ?? {}) as Record<string, unknown>
  const valid = new Set(memberNames)
  const payer = typeof o.payerName === 'string' && valid.has(o.payerName) ? o.payerName : null
  let parts = Array.isArray(o.participantNames)
    ? (o.participantNames as unknown[]).filter((n): n is string => typeof n === 'string' && valid.has(n))
    : []
  if (parts.length === 0) parts = [...memberNames]
  const modes = ['equal', 'shares', 'percent', 'exact', 'itemized']
  const splitMode = (typeof o.splitMode === 'string' && modes.includes(o.splitMode)
    ? o.splitMode
    : 'equal') as ParsedExpense['splitMode']
  const amount = Math.max(0, Math.round(Number(o.amount) || 0))
  const title = typeof o.title === 'string' && o.title.trim() ? o.title.trim() : 'Khoản chi'
  return { title, amount, payerName: payer, participantNames: parts, splitMode }
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    amount: { type: 'integer' },
    payerName: { type: 'string', nullable: true },
    participantNames: { type: 'array', items: { type: 'string' } },
    splitMode: { type: 'string', enum: ['equal', 'shares', 'percent', 'exact', 'itemized'] },
  },
  required: ['title', 'amount', 'participantNames', 'splitMode'],
}

async function callGemini(prompt: string, model: string): Promise<ParsedExpense> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini lỗi ${res.status}`)
  const data = await res.json()
  const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!txt) throw new Error('Gemini không trả nội dung.')
  return JSON.parse(txt)
}

async function callDeepSeek(prompt: string, model: string): Promise<ParsedExpense> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Chỉ trả JSON hợp lệ, không giải thích.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek lỗi ${res.status}`)
  const data = await res.json()
  const txt = data?.choices?.[0]?.message?.content
  if (!txt) throw new Error('DeepSeek không trả nội dung.')
  return JSON.parse(txt)
}

/** Bóc tách bằng LLM: Gemini chính → DeepSeek dự phòng khi Gemini lỗi. */
export async function parseExpenseLLM(text: string, memberNames: string[], options: AiCallOptions = {}): Promise<ParsedExpense> {
  const provider = options.provider ?? DEFAULT_PROVIDER
  const prompt = buildPrompt(text, memberNames, options.promptTemplate ?? DEFAULT_PARSE_PROMPT_TEMPLATE)
  let lastError: unknown = null
  for (const name of uniqueProviderOrder(provider)) {
    if (!providerAvailable(name)) continue
    try {
      const raw = name === 'gemini'
        ? await callGemini(prompt, provider.geminiModel)
        : await callDeepSeek(prompt, provider.deepseekModel)
      return coerce(raw, memberNames)
    } catch (e) {
      lastError = e
    }
  }
  if (lastError instanceof Error) throw lastError
  throw new Error('Chưa cấu hình provider AI.')
}

// ── OCR hoá đơn (vision) ─────────────────────────────────────────────────
export interface OcrItem {
  title: string
  amount: number // VND, số nguyên
}

export const visionConfigured = Boolean(GEMINI_KEY)

const OCR_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, amount: { type: 'integer' } },
        required: ['title', 'amount'],
      },
    },
  },
  required: ['items'],
}

function coerceItems(raw: unknown): OcrItem[] {
  const arr = (raw as { items?: unknown })?.items
  if (!Array.isArray(arr)) return []
  return arr
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>
      return {
        title: typeof o.title === 'string' ? o.title.trim() : '',
        amount: Math.max(0, Math.round(Number(o.amount) || 0)),
      }
    })
    .filter((it) => it.title && it.amount > 0)
}

/** Quét hoá đơn → danh sách món (Gemini vision). base64 KHÔNG kèm tiền tố data URL. */
export async function ocrReceiptLLM(imageBase64: string, mimeType: string, options: AiCallOptions = {}): Promise<OcrItem[]> {
  if (!GEMINI_KEY) throw new Error('Chưa cấu hình provider AI (vision).')
  const model = options.provider?.geminiModel ?? DEFAULT_PROVIDER.geminiModel
  const prompt = renderTemplate(options.promptTemplate ?? DEFAULT_OCR_PROMPT_TEMPLATE, {})
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: OCR_SCHEMA,
          temperature: 0,
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini vision lỗi ${res.status}`)
  const data = await res.json()
  const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!txt) throw new Error('Gemini không đọc được hoá đơn.')
  return coerceItems(JSON.parse(txt))
}

// ── Insight / nhận xét chi tiêu (text) ───────────────────────────────────
export interface SpendingInsight {
  headline: string
  points: string[]
}

const INSIGHT_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    points: { type: 'array', items: { type: 'string' } },
  },
  required: ['headline', 'points'],
}

function buildInsightPrompt(stats: unknown, template = DEFAULT_INSIGHT_PROMPT_TEMPLATE): string {
  return renderTemplate(template, { stats: JSON.stringify(stats) })
}

function coerceInsight(raw: unknown): SpendingInsight {
  const o = (raw ?? {}) as Record<string, unknown>
  const headline = typeof o.headline === 'string' ? o.headline.trim() : 'Tổng quan chi tiêu'
  const points = Array.isArray(o.points)
    ? (o.points as unknown[]).filter((p): p is string => typeof p === 'string' && p.trim().length > 0).slice(0, 6)
    : []
  return { headline, points }
}

/** Sinh nhận xét chi tiêu (Gemini chính → DeepSeek dự phòng). */
export async function generateInsightLLM(stats: unknown, options: AiCallOptions = {}): Promise<SpendingInsight> {
  const provider = options.provider ?? DEFAULT_PROVIDER
  const prompt = buildInsightPrompt(stats, options.promptTemplate ?? DEFAULT_INSIGHT_PROMPT_TEMPLATE)
  let lastError: unknown = null

  for (const name of uniqueProviderOrder(provider)) {
    if (!providerAvailable(name)) continue
    try {
      if (name === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${provider.geminiModel}:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: INSIGHT_SCHEMA,
                temperature: 0.4,
              },
            }),
          },
        )
        if (!res.ok) throw new Error(`Gemini lỗi ${res.status}`)
        const data = await res.json()
        const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!txt) throw new Error('Gemini không trả nội dung.')
        return coerceInsight(JSON.parse(txt))
      }

      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${DEEPSEEK_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.deepseekModel,
          messages: [
            { role: 'system', content: 'Chỉ trả JSON {headline, points[]} hợp lệ, không giải thích.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.4,
        }),
      })
      if (!res.ok) throw new Error(`DeepSeek lỗi ${res.status}`)
      const data = await res.json()
      const txt = data?.choices?.[0]?.message?.content
      if (!txt) throw new Error('DeepSeek không trả nội dung.')
      return coerceInsight(JSON.parse(txt))
    } catch (error) {
      lastError = error
    }
  }
  if (lastError instanceof Error) throw lastError
  throw new Error('Chưa cấu hình provider AI.')
}
