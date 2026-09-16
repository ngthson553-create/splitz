import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminAiStatus = 'ok' | 'configured' | 'missing' | 'failed' | 'unknown'
export type AdminAiProviderName = 'gemini' | 'deepseek'
export type AdminAiFeature = 'parse_expense' | 'ocr_receipt' | 'insight'
export type AdminAiFeatureFilter = AdminAiFeature | 'all'
export type AdminAiFlagKey = 'ai_parse_expense' | 'ai_ocr_receipt' | 'ai_insight'

export type AdminAiProviderConfig = {
  active: AdminAiProviderName
  fallback: AdminAiProviderName
  geminiModel: string
  deepseekModel: string
  status: AdminAiStatus
  detail: string
}

export type AdminAiFeatureFlag = {
  key: AdminAiFlagKey
  label: string
  enabled: boolean
  description: string
  updatedAt: string | null
}

export type AdminAiQuota = {
  feature: AdminAiFeature
  label: string
  freeLimit: number
  totalCount: number
  userCount: number
  remaining: number | null
}

export type AdminAiPromptVersion = {
  promptKey: AdminAiFeature
  version: number
  title: string
  prompt: string
  active: boolean
  updatedAt: string | null
}

export type AdminAiTopUser = {
  userId: string
  userEmail: string | null
  displayName: string | null
  count: number
}

export type AdminAiUsageSummary = {
  feature: AdminAiFeature
  label: string
  period: string
  totalCount: number
  userCount: number
  topUsers: AdminAiTopUser[]
}

export type AdminAiUsageRow = {
  userId: string
  userEmail: string | null
  displayName: string | null
  feature: AdminAiFeature
  period: string
  count: number
  updatedAt: string | null
}

export type AdminAiError = {
  id: string
  source: string
  action: string | null
  message: string | null
  createdAt: string
}

export type AdminAiSnapshot = {
  checkedAt: string
  summaryStatus: AdminAiStatus
  provider: AdminAiProviderConfig
  flags: AdminAiFeatureFlag[]
  quotas: AdminAiQuota[]
  prompts: AdminAiPromptVersion[]
  usageSummary: AdminAiUsageSummary[]
  usageRows: AdminAiUsageRow[]
  recentErrors: AdminAiError[]
}

export type AdminAiSnapshotFilters = {
  period?: string
  feature?: AdminAiFeatureFilter
}

export type AdminAiSaveConfigInput = {
  provider: {
    active: AdminAiProviderName
    fallback: AdminAiProviderName
    geminiModel: string
    deepseekModel: string
  }
  flags: {
    parseExpense: boolean
    ocrReceipt: boolean
    insight: boolean
  }
  quotas: {
    parseFree: number
    ocrFree: number
    insightFree: number
  }
  prompts: {
    parseExpense: string
    ocrReceipt: string
    insight: string
  }
}

export type AdminAiParseTestInput = {
  text: string
  memberNames: string[]
}

export type AdminAiOcrTestInput = {
  imageBase64: string
  mimeType: string
}

export type AdminAiInsightTestInput = {
  stats: unknown
}

export type AdminAiResetQuotaInput = {
  userEmail?: string | null
  userId?: string | null
  feature: AdminAiFeature
  period: string
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminAiClient = {
  functions: {
    invoke: (name: 'admin-ai', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminAiClient | null): AdminAiClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminAiClient) : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function normalizedText(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? ''
  return clean.length > 0 ? clean : null
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(n) ? n : 0
}

function boolValue(value: unknown): boolean {
  return value === true || value === 'true'
}

function normalizeStatus(value: unknown): AdminAiStatus {
  return value === 'ok' || value === 'configured' || value === 'missing' || value === 'failed' ? value : 'unknown'
}

function normalizeProviderName(value: unknown): AdminAiProviderName {
  return value === 'deepseek' ? 'deepseek' : 'gemini'
}

function normalizeFeature(value: unknown): AdminAiFeature | null {
  return value === 'parse_expense' || value === 'ocr_receipt' || value === 'insight' ? value : null
}

function normalizeFlagKey(value: unknown): AdminAiFlagKey | null {
  return value === 'ai_parse_expense' || value === 'ai_ocr_receipt' || value === 'ai_insight' ? value : null
}

function normalizeProvider(row: unknown): AdminAiProviderConfig | null {
  if (!isRecord(row)) return null
  const geminiModel = text(row.gemini_model)
  const deepseekModel = text(row.deepseek_model)
  const detail = text(row.detail)
  if (!geminiModel || !deepseekModel || !detail) return null
  return {
    active: normalizeProviderName(row.active),
    fallback: normalizeProviderName(row.fallback),
    geminiModel,
    deepseekModel,
    status: normalizeStatus(row.status),
    detail,
  }
}

function normalizeFlag(row: unknown): AdminAiFeatureFlag | null {
  if (!isRecord(row)) return null
  const key = normalizeFlagKey(row.key)
  const label = text(row.label)
  const description = text(row.description)
  if (!key || !label || !description) return null
  return {
    key,
    label,
    enabled: boolValue(row.enabled),
    description,
    updatedAt: text(row.updated_at),
  }
}

function normalizeQuota(row: unknown): AdminAiQuota | null {
  if (!isRecord(row)) return null
  const feature = normalizeFeature(row.feature)
  const label = text(row.label)
  if (!feature || !label) return null
  const remaining = row.remaining === null || row.remaining === undefined ? null : numberValue(row.remaining)
  return {
    feature,
    label,
    freeLimit: numberValue(row.free_limit),
    totalCount: numberValue(row.total_count),
    userCount: numberValue(row.user_count),
    remaining,
  }
}

function normalizePrompt(row: unknown): AdminAiPromptVersion | null {
  if (!isRecord(row)) return null
  const promptKey = normalizeFeature(row.prompt_key)
  const title = text(row.title)
  const prompt = text(row.prompt)
  if (!promptKey || !title || !prompt) return null
  return {
    promptKey,
    version: numberValue(row.version),
    title,
    prompt,
    active: boolValue(row.active),
    updatedAt: text(row.updated_at),
  }
}

function normalizeTopUser(row: unknown): AdminAiTopUser | null {
  if (!isRecord(row)) return null
  const userId = text(row.user_id)
  if (!userId) return null
  return {
    userId,
    userEmail: text(row.user_email),
    displayName: text(row.display_name),
    count: numberValue(row.count),
  }
}

function normalizeSummary(row: unknown): AdminAiUsageSummary | null {
  if (!isRecord(row)) return null
  const feature = normalizeFeature(row.feature)
  const label = text(row.label)
  const period = text(row.period)
  if (!feature || !label || !period) return null
  return {
    feature,
    label,
    period,
    totalCount: numberValue(row.total_count),
    userCount: numberValue(row.user_count),
    topUsers: Array.isArray(row.top_users) ? row.top_users.map(normalizeTopUser).filter(Boolean) as AdminAiTopUser[] : [],
  }
}

function normalizeUsageRow(row: unknown): AdminAiUsageRow | null {
  if (!isRecord(row)) return null
  const userId = text(row.user_id)
  const feature = normalizeFeature(row.feature)
  const period = text(row.period)
  if (!userId || !feature || !period) return null
  return {
    userId,
    userEmail: text(row.user_email),
    displayName: text(row.display_name),
    feature,
    period,
    count: numberValue(row.count),
    updatedAt: text(row.updated_at),
  }
}

function normalizeError(row: unknown): AdminAiError | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const source = text(row.source)
  const createdAt = text(row.created_at)
  if (!id || !source || !createdAt) return null
  return {
    id,
    source,
    action: text(row.action),
    message: text(row.message),
    createdAt,
  }
}

function normalizeSnapshot(row: unknown): AdminAiSnapshot | null {
  if (!isRecord(row)) return null
  const checkedAt = text(row.checked_at)
  const provider = normalizeProvider(row.provider)
  if (!checkedAt || !provider) return null
  return {
    checkedAt,
    summaryStatus: normalizeStatus(row.summary_status),
    provider,
    flags: Array.isArray(row.flags) ? row.flags.map(normalizeFlag).filter(Boolean) as AdminAiFeatureFlag[] : [],
    quotas: Array.isArray(row.quotas) ? row.quotas.map(normalizeQuota).filter(Boolean) as AdminAiQuota[] : [],
    prompts: Array.isArray(row.prompts) ? row.prompts.map(normalizePrompt).filter(Boolean) as AdminAiPromptVersion[] : [],
    usageSummary: Array.isArray(row.usage_summary) ? row.usage_summary.map(normalizeSummary).filter(Boolean) as AdminAiUsageSummary[] : [],
    usageRows: Array.isArray(row.usage_rows) ? row.usage_rows.map(normalizeUsageRow).filter(Boolean) as AdminAiUsageRow[] : [],
    recentErrors: Array.isArray(row.recent_errors) ? row.recent_errors.map(normalizeError).filter(Boolean) as AdminAiError[] : [],
  }
}

async function invokeAdminAi(
  client: AdminAiClient | null | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-ai', { body })
    if (error || !isRecord(data)) return null
    return data
  } catch {
    return null
  }
}

export async function loadAdminAiSnapshot(
  client?: AdminAiClient | null,
  filters: AdminAiSnapshotFilters = {},
): Promise<AdminAiSnapshot | null> {
  const data = await invokeAdminAi(client, {
    action: 'snapshot',
    period: normalizedText(filters.period),
    feature: filters.feature ?? 'all',
  })
  return normalizeSnapshot(data)
}

export async function saveAdminAiConfig(
  client: AdminAiClient | null | undefined,
  input: AdminAiSaveConfigInput,
): Promise<Record<string, unknown> | null> {
  return invokeAdminAi(client, {
    action: 'save_config',
    provider: {
      active: input.provider.active,
      fallback: input.provider.fallback,
      gemini_model: normalizedText(input.provider.geminiModel),
      deepseek_model: normalizedText(input.provider.deepseekModel),
    },
    flags: {
      parse_expense: input.flags.parseExpense,
      ocr_receipt: input.flags.ocrReceipt,
      insight: input.flags.insight,
    },
    quotas: {
      parse_free: input.quotas.parseFree,
      ocr_free: input.quotas.ocrFree,
      insight_free: input.quotas.insightFree,
    },
    prompts: {
      parse_expense: input.prompts.parseExpense,
      ocr_receipt: input.prompts.ocrReceipt,
      insight: input.prompts.insight,
    },
  })
}

export async function testAdminAiParse(
  client: AdminAiClient | null | undefined,
  input: AdminAiParseTestInput,
): Promise<Record<string, unknown> | null> {
  return invokeAdminAi(client, {
    action: 'test_parse',
    text: normalizedText(input.text),
    member_names: input.memberNames.map((name) => name.trim()).filter(Boolean),
  })
}

export async function testAdminAiOcr(
  client: AdminAiClient | null | undefined,
  input: AdminAiOcrTestInput,
): Promise<Record<string, unknown> | null> {
  return invokeAdminAi(client, {
    action: 'test_ocr',
    image_base64: normalizedText(input.imageBase64),
    mime_type: normalizedText(input.mimeType),
  })
}

export async function testAdminAiInsight(
  client: AdminAiClient | null | undefined,
  input: AdminAiInsightTestInput,
): Promise<Record<string, unknown> | null> {
  return invokeAdminAi(client, {
    action: 'test_insight',
    stats: input.stats,
  })
}

export async function resetAdminAiQuota(
  client: AdminAiClient | null | undefined,
  input: AdminAiResetQuotaInput,
): Promise<Record<string, unknown> | null> {
  const body: Record<string, unknown> = {
    action: 'reset_quota',
    feature: input.feature,
    period: normalizedText(input.period),
  }
  const email = normalizedText(input.userEmail)
  const userId = normalizedText(input.userId)
  if (email) body.user_email = email
  if (userId) body.user_id = userId
  return invokeAdminAi(client, body)
}
