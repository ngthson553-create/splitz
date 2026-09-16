// Console Admin AI operations (verify_jwt=true).
// Supports sanitized snapshots, feature/quota/provider/prompt config, admin-only
// test calls that do not consume user quota, and single-user quota reset.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  aiConfigured,
  generateInsightLLM,
  loadAiRuntimeConfig,
  ocrReceiptLLM,
  parseExpenseLLM,
  visionConfigured,
  type AiProviderName,
} from '../_shared/ai.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const MAX_IMAGE_B64 = 8 * 1024 * 1024
const MAX_STATS = 20_000
const MAX_TEXT = 500
const MAX_MEMBERS = 60

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

type Action = 'snapshot' | 'save_config' | 'test_parse' | 'test_ocr' | 'test_insight' | 'reset_quota'
type AiFeature = 'parse_expense' | 'ocr_receipt' | 'insight'
type FeatureFilter = AiFeature | 'all'

type RequestBody = {
  action?: Action
  period?: string | null
  feature?: FeatureFilter | null
  provider?: Record<string, unknown>
  flags?: Record<string, unknown>
  quotas?: Record<string, unknown>
  prompts?: Record<string, unknown>
  text?: string | null
  member_names?: string[]
  image_base64?: string | null
  mime_type?: string | null
  stats?: unknown
  user_email?: string | null
  user_id?: string | null
}

type Actor = {
  userId: string
  email: string | null
  role: string
}

type UsageRow = {
  user_id: string
  user_email: string | null
  display_name: string | null
  feature: AiFeature
  period: string
  count: number
  updated_at: string | null
}

class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const FEATURE_META: Record<AiFeature, { flag: string; label: string; description: string; promptTitle: string }> = {
  parse_expense: {
    flag: 'ai_parse_expense',
    label: 'Nhập chi tự nhiên',
    description: 'Bật/tắt LLM parser cho khoản chi tự nhiên.',
    promptTitle: 'Parse expense prompt',
  },
  ocr_receipt: {
    flag: 'ai_ocr_receipt',
    label: 'OCR hoá đơn',
    description: 'Bật/tắt vision OCR để đọc hoá đơn/biên lai.',
    promptTitle: 'Receipt OCR prompt',
  },
  insight: {
    flag: 'ai_insight',
    label: 'Insight chi tiêu',
    description: 'Bật/tắt nhận xét chi tiêu bằng AI.',
    promptTitle: 'Spending insight prompt',
  },
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function sanitizeError(value: unknown): string {
  const text = cleanText(value) ?? 'unknown_error'
  return text.replace(/[A-Za-z0-9_]{32,}/g, '[redacted]').slice(0, 2000)
}

function providerName(value: unknown, fallback: AiProviderName): AiProviderName {
  return value === 'deepseek' || value === 'gemini' ? value : fallback
}

function featureName(value: unknown): AiFeature | null {
  return value === 'parse_expense' || value === 'ocr_receipt' || value === 'insight' ? value : null
}

function featureFilter(value: unknown): FeatureFilter {
  return value === 'parse_expense' || value === 'ocr_receipt' || value === 'insight' ? value : 'all'
}

function intValue(value: unknown, fallback: number, min = 0, max = 999): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(Math.max(Math.trunc(n), min), max)
}

function boolValue(value: unknown, fallback: boolean): boolean {
  return value === true ? true : value === false ? false : fallback
}

function currentPeriod(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function normalizePeriod(value: unknown): string {
  const text = cleanText(value)
  return text && /^\d{4}-\d{2}$/.test(text) ? text : currentPeriod()
}

function profileFromJoin(row: Record<string, unknown>): { email: string | null; displayName: string | null } {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  if (!profile || typeof profile !== 'object') return { email: null, displayName: null }
  const p = profile as Record<string, unknown>
  return { email: cleanText(p.email), displayName: cleanText(p.display_name) }
}

async function getActor(jwt: string): Promise<Actor> {
  const { data: u, error } = await admin.auth.getUser(jwt)
  if (error || !u.user) throw new HttpError(401, 'Unauthorized')

  const { data: row } = await admin
    .from('admin_users')
    .select('role,status')
    .eq('user_id', u.user.id)
    .maybeSingle()
  if (!row || row.status !== 'active') throw new HttpError(403, 'Forbidden')
  return { userId: u.user.id, email: u.user.email ?? null, role: row.role }
}

function requireOwner(actor: Actor) {
  if (actor.role !== 'owner') throw new HttpError(403, 'Owner role required')
}

async function writeAudit(
  actor: Actor,
  action: string,
  status: 'success' | 'failed',
  payload: Record<string, unknown>,
  errorMessage?: string | null,
) {
  await admin.from('admin_audit_logs').insert({
    actor_user_id: actor.userId,
    actor_email: actor.email,
    actor_role: actor.role,
    action,
    target_type: 'ai_ops',
    target_id: 'ai',
    payload_summary: payload,
    status,
    error_message: errorMessage ? sanitizeError(errorMessage) : null,
  })
}

async function activePromptRows() {
  const { data } = await admin
    .from('ai_prompt_versions')
    .select('prompt_key,version,title,prompt,active,updated_at')
    .eq('active', true)
    .in('prompt_key', ['parse_expense', 'ocr_receipt', 'insight'])
    .order('version', { ascending: false })
  const seen = new Set<string>()
  const rows = []
  for (const row of data ?? []) {
    const key = cleanText(row.prompt_key)
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(row)
  }
  return rows
}

async function featureFlagRows(runtimeFlags: { parseExpense: boolean; ocrReceipt: boolean; insight: boolean }) {
  const { data } = await admin
    .from('feature_flags')
    .select('key,label,enabled,description,updated_at')
    .in('key', ['ai_parse_expense', 'ai_ocr_receipt', 'ai_insight'])
  const map = new Map((data ?? []).map((row) => [row.key as string, row]))
  return (Object.entries(FEATURE_META) as [AiFeature, typeof FEATURE_META[AiFeature]][]).map(([feature, meta]) => {
    const row = map.get(meta.flag)
    const fallbackEnabled = feature === 'parse_expense' ? runtimeFlags.parseExpense : feature === 'ocr_receipt' ? runtimeFlags.ocrReceipt : runtimeFlags.insight
    return {
      key: meta.flag,
      label: cleanText(row?.label) ?? meta.label,
      enabled: row?.enabled ?? fallbackEnabled,
      description: cleanText(row?.description) ?? meta.description,
      updated_at: cleanText(row?.updated_at),
    }
  })
}

async function usageRows(period: string, filter: FeatureFilter): Promise<UsageRow[]> {
  let query = admin
    .from('ai_usage')
    .select('user_id,feature,period,count,updated_at,profiles(email,display_name)')
    .eq('period', period)
    .order('count', { ascending: false })
    .limit(100)
  if (filter !== 'all') query = query.eq('feature', filter)
  const { data } = await query
  return (data ?? []).flatMap((row) => {
    const feature = featureName(row.feature)
    const userId = cleanText(row.user_id)
    const rowPeriod = cleanText(row.period)
    if (!feature || !userId || !rowPeriod) return []
    const profile = profileFromJoin(row as Record<string, unknown>)
    return [{
      user_id: userId,
      user_email: profile.email,
      display_name: profile.displayName,
      feature,
      period: rowPeriod,
      count: intValue(row.count, 0, 0, 999999),
      updated_at: cleanText(row.updated_at),
    }]
  })
}

function buildUsageSummary(rows: UsageRow[], period: string, quotas: Record<AiFeature, number>) {
  return (Object.entries(FEATURE_META) as [AiFeature, typeof FEATURE_META[AiFeature]][]).map(([feature, meta]) => {
    const featureRows = rows.filter((row) => row.feature === feature)
    const userIds = new Set(featureRows.map((row) => row.user_id))
    return {
      feature,
      label: meta.label,
      period,
      total_count: featureRows.reduce((total, row) => total + row.count, 0),
      user_count: userIds.size,
      free_limit: quotas[feature],
      top_users: featureRows.slice(0, 5).map((row) => ({
        user_id: row.user_id,
        user_email: row.user_email,
        display_name: row.display_name,
        count: row.count,
      })),
    }
  })
}

async function recentAiErrors() {
  const { data } = await admin
    .from('admin_audit_logs')
    .select('id,action,error_message,created_at')
    .eq('status', 'failed')
    .ilike('action', 'ai.%')
    .order('created_at', { ascending: false })
    .limit(5)
  return (data ?? []).flatMap((row) => {
    const id = cleanText(row.id)
    const createdAt = cleanText(row.created_at)
    if (!id || !createdAt) return []
    return [{ id, source: 'admin_audit_logs', action: cleanText(row.action), message: cleanText(row.error_message), created_at: createdAt }]
  })
}

async function buildSnapshot(body: RequestBody) {
  const period = normalizePeriod(body.period)
  const filter = featureFilter(body.feature)
  const runtime = await loadAiRuntimeConfig(admin)
  const rows = await usageRows(period, filter)
  const quotas: Record<AiFeature, number> = {
    parse_expense: runtime.quotas.parseExpenseFree,
    ocr_receipt: runtime.quotas.ocrReceiptFree,
    insight: runtime.quotas.insightFree,
  }
  const errors = await recentAiErrors()
  const summaryStatus = runtime.provider.status === 'missing' ? 'missing' : errors.length > 0 ? 'failed' : 'configured'

  return {
    checked_at: new Date().toISOString(),
    summary_status: summaryStatus,
    provider: {
      active: runtime.provider.active,
      fallback: runtime.provider.fallback,
      gemini_model: runtime.provider.geminiModel,
      deepseek_model: runtime.provider.deepseekModel,
      status: runtime.provider.status,
      detail: `${runtime.provider.detail}; vision ${visionConfigured ? 'configured' : 'missing'}`,
    },
    flags: await featureFlagRows(runtime.flags),
    quotas: buildUsageSummary(rows, period, quotas).map((item) => ({
      feature: item.feature,
      label: item.label,
      free_limit: item.free_limit,
      total_count: item.total_count,
      user_count: item.user_count,
      remaining: null,
    })),
    prompts: await activePromptRows(),
    usage_summary: buildUsageSummary(rows, period, quotas),
    usage_rows: rows,
    recent_errors: errors,
  }
}

async function saveConfig(actor: Actor, body: RequestBody) {
  requireOwner(actor)
  const provider = body.provider ?? {}
  const flags = body.flags ?? {}
  const quotas = body.quotas ?? {}
  const prompts = body.prompts ?? {}
  const now = new Date().toISOString()
  const providerPayload = {
    active: providerName(provider.active, 'gemini'),
    fallback: providerName(provider.fallback, 'deepseek'),
    gemini_model: cleanText(provider.gemini_model) ?? 'gemini-2.0-flash',
    deepseek_model: cleanText(provider.deepseek_model) ?? 'deepseek-v4-flash',
  }
  const quotaPayload = {
    parse_free: intValue(quotas.parse_free, 15),
    ocr_free: intValue(quotas.ocr_free, 3),
    insight_free: intValue(quotas.insight_free, 3),
  }

  await admin.from('app_config').upsert([
    { key: 'ai_provider', category: 'ai', value: providerPayload, updated_by: actor.userId, updated_at: now },
    { key: 'ai_quota', category: 'ai', value: quotaPayload, updated_by: actor.userId, updated_at: now },
  ], { onConflict: 'key' })

  await admin.from('feature_flags').upsert([
    { key: 'ai_parse_expense', label: FEATURE_META.parse_expense.label, description: FEATURE_META.parse_expense.description, enabled: boolValue(flags.parse_expense, true), updated_by: actor.userId, updated_at: now },
    { key: 'ai_ocr_receipt', label: FEATURE_META.ocr_receipt.label, description: FEATURE_META.ocr_receipt.description, enabled: boolValue(flags.ocr_receipt, true), updated_by: actor.userId, updated_at: now },
    { key: 'ai_insight', label: FEATURE_META.insight.label, description: FEATURE_META.insight.description, enabled: boolValue(flags.insight, true), updated_by: actor.userId, updated_at: now },
  ], { onConflict: 'key' })

  const promptVersions: Record<string, number> = {}
  for (const feature of Object.keys(FEATURE_META) as AiFeature[]) {
    const nextPrompt = cleanText(prompts[feature])
    if (!nextPrompt) continue
    const { data: current } = await admin
      .from('ai_prompt_versions')
      .select('id,prompt,version')
      .eq('prompt_key', feature)
      .eq('active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (cleanText(current?.prompt) === nextPrompt) {
      promptVersions[feature] = Number(current?.version ?? 1)
      continue
    }
    const { data: latest } = await admin
      .from('ai_prompt_versions')
      .select('version')
      .eq('prompt_key', feature)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextVersion = Number(latest?.version ?? 0) + 1
    const { data: inserted, error: insertError } = await admin
      .from('ai_prompt_versions')
      .insert({
        prompt_key: feature,
        version: nextVersion,
        title: `${FEATURE_META[feature].promptTitle} v${nextVersion}`,
        prompt: nextPrompt,
        active: false,
        created_by: actor.userId,
        updated_at: now,
      })
      .select('id,version')
      .single()
    if (insertError || !inserted) throw new Error(insertError?.message ?? 'prompt_insert_failed')
    await admin.from('ai_prompt_versions').update({ active: false, updated_at: now }).eq('prompt_key', feature).eq('active', true)
    await admin.from('ai_prompt_versions').update({ active: true, updated_at: now }).eq('id', inserted.id)
    promptVersions[feature] = Number(inserted.version)
  }

  await writeAudit(actor, 'ai.config.save', 'success', {
    provider: providerPayload,
    quotas: quotaPayload,
    flags: {
      parse_expense: boolValue(flags.parse_expense, true),
      ocr_receipt: boolValue(flags.ocr_receipt, true),
      insight: boolValue(flags.insight, true),
    },
    prompt_versions: promptVersions,
  })
  return { saved: true, prompt_versions: promptVersions }
}

async function testParse(actor: Actor, body: RequestBody) {
  if (!aiConfigured) throw new HttpError(503, 'AI provider missing')
  const text = cleanText(body.text)
  if (!text) throw new HttpError(400, 'Text required')
  if (text.length > MAX_TEXT) throw new HttpError(400, 'Text too long')
  const memberNames = (body.member_names ?? []).filter((name): name is string => typeof name === 'string' && name.trim().length > 0).slice(0, MAX_MEMBERS)
  const runtime = await loadAiRuntimeConfig(admin)
  const parsed = await parseExpenseLLM(text, memberNames, { provider: runtime.provider, promptTemplate: runtime.prompts.parseExpense })
  await writeAudit(actor, 'ai.test.parse', 'success', { text_length: text.length, member_count: memberNames.length })
  return { parsed, quota_consumed: false }
}

async function testOcr(actor: Actor, body: RequestBody) {
  if (!visionConfigured) throw new HttpError(503, 'Vision provider missing')
  const imageBase64 = cleanText(body.image_base64)
  const mimeType = cleanText(body.mime_type) ?? 'image/jpeg'
  if (!imageBase64) throw new HttpError(400, 'Image required')
  if (imageBase64.length > MAX_IMAGE_B64) throw new HttpError(400, 'Image too large')
  const runtime = await loadAiRuntimeConfig(admin)
  const items = await ocrReceiptLLM(imageBase64, mimeType, { provider: runtime.provider, promptTemplate: runtime.prompts.ocrReceipt })
  await writeAudit(actor, 'ai.test.ocr', 'success', { image_size: imageBase64.length, mime_type: mimeType, item_count: items.length })
  return { items, quota_consumed: false }
}

async function testInsight(actor: Actor, body: RequestBody) {
  if (!aiConfigured) throw new HttpError(503, 'AI provider missing')
  if (!body.stats || typeof body.stats !== 'object') throw new HttpError(400, 'Stats required')
  if (JSON.stringify(body.stats).length > MAX_STATS) throw new HttpError(400, 'Stats too large')
  const runtime = await loadAiRuntimeConfig(admin)
  const insight = await generateInsightLLM(body.stats, { provider: runtime.provider, promptTemplate: runtime.prompts.insight })
  await writeAudit(actor, 'ai.test.insight', 'success', { stats_size: JSON.stringify(body.stats).length, points: insight.points.length })
  return { insight, quota_consumed: false }
}

async function resetQuota(actor: Actor, body: RequestBody) {
  requireOwner(actor)
  const feature = featureName(body.feature)
  const period = normalizePeriod(body.period)
  if (!feature) throw new HttpError(400, 'Invalid feature')
  const userIdText = cleanText(body.user_id)
  const userEmail = cleanText(body.user_email)
  if (!userIdText && !userEmail) throw new HttpError(400, 'User required')

  let profileQuery = admin.from('profiles').select('id,email').limit(1)
  profileQuery = userIdText ? profileQuery.eq('id', userIdText) : profileQuery.ilike('email', userEmail!)
  const { data: profiles } = await profileQuery
  const profile = profiles?.[0]
  if (!profile?.id) throw new HttpError(404, 'User not found')

  const { data: before } = await admin
    .from('ai_usage')
    .select('count')
    .eq('user_id', profile.id)
    .eq('feature', feature)
    .eq('period', period)
    .maybeSingle()
  const previousCount = Number(before?.count ?? 0)

  await admin.from('ai_usage').upsert({
    user_id: profile.id,
    feature,
    period,
    count: 0,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,feature,period' })

  await writeAudit(actor, 'ai.quota.reset', 'success', {
    user_id: profile.id,
    user_email: profile.email,
    feature,
    period,
    previous_count: previousCount,
    next_count: 0,
  })
  return { reset: 1, user_id: profile.id, user_email: profile.email, feature, period, previous_count: previousCount }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  let actor: Actor | null = null
  let action: Action | null = null

  try {
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    actor = await getActor(jwt)
    const body = (await req.json()) as RequestBody
    action = body.action ?? null

    if (action === 'snapshot') return json(await buildSnapshot(body), 200, origin)
    if (action === 'save_config') return json(await saveConfig(actor, body), 200, origin)
    if (action === 'test_parse') return json(await testParse(actor, body), 200, origin)
    if (action === 'test_ocr') return json(await testOcr(actor, body), 200, origin)
    if (action === 'test_insight') return json(await testInsight(actor, body), 200, origin)
    if (action === 'reset_quota') return json(await resetQuota(actor, body), 200, origin)

    return json({ error: 'Invalid action' }, 400, origin)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown_error'
    if (actor && action && action !== 'snapshot') {
      await writeAudit(actor, `ai.${action}.failed`, 'failed', { action }, message)
    }
    if (e instanceof HttpError) return json({ error: e.message }, e.status, origin)
    return json({ error: sanitizeError(message) }, 500, origin)
  }
})
