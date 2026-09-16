import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminEmailStatus = 'ok' | 'configured' | 'missing' | 'failed' | 'unknown'
export type AdminEmailTemplateCategory = 'auth' | 'reminder' | 'system' | 'release'
export type AdminEmailLogStatus = 'queued' | 'sent' | 'failed' | 'skipped'

export type AdminEmailProviderConfig = {
  status: AdminEmailStatus
  from: string | null
  replyTo: string | null
  detail: string
}

export type AdminEmailMetric = {
  id: string
  label: string
  value: number
  detail: string | null
}

export type AdminEmailTemplate = {
  key: string
  name: string
  category: AdminEmailTemplateCategory
  subject: string
  description: string
  active: boolean
  updatedAt: string | null
}

export type AdminEmailLog = {
  id: string
  templateKey: string | null
  toEmail: string
  fromEmail: string | null
  subject: string
  status: AdminEmailLogStatus
  provider: string
  providerMessageId: string | null
  errorMessage: string | null
  sentAt: string | null
  createdAt: string
}

export type AdminEmailError = {
  id: string
  source: string
  action: string | null
  message: string | null
  createdAt: string
}

export type AdminEmailSnapshot = {
  checkedAt: string
  summaryStatus: AdminEmailStatus
  defaultToEmail: string | null
  provider: AdminEmailProviderConfig
  metrics: AdminEmailMetric[]
  templates: AdminEmailTemplate[]
  logs: AdminEmailLog[]
  recentErrors: AdminEmailError[]
}

export type AdminEmailSnapshotFilters = {
  limit?: number
}

export type AdminEmailTestInput = {
  toEmail: string
  templateKey?: string | null
  subject?: string | null
  message?: string | null
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminEmailClient = {
  functions: {
    invoke: (name: 'admin-email', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminEmailClient | null): AdminEmailClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminEmailClient) : null)
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

function normalizeStatus(value: unknown): AdminEmailStatus {
  return value === 'ok' || value === 'configured' || value === 'missing' || value === 'failed' ? value : 'unknown'
}

function normalizeTemplateCategory(value: unknown): AdminEmailTemplateCategory | null {
  return value === 'auth' || value === 'reminder' || value === 'system' || value === 'release' ? value : null
}

function normalizeLogStatus(value: unknown): AdminEmailLogStatus | null {
  return value === 'queued' || value === 'sent' || value === 'failed' || value === 'skipped' ? value : null
}

function normalizeProvider(row: unknown): AdminEmailProviderConfig | null {
  if (!isRecord(row)) return null
  const from = text(row.from)
  const detail = text(row.detail)
  if (!detail) return null
  return {
    status: normalizeStatus(row.status),
    from,
    replyTo: text(row.reply_to),
    detail,
  }
}

function normalizeMetric(row: unknown): AdminEmailMetric | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const label = text(row.label)
  if (!id || !label) return null
  return {
    id,
    label,
    value: numberValue(row.value),
    detail: text(row.detail),
  }
}

function normalizeTemplate(row: unknown): AdminEmailTemplate | null {
  if (!isRecord(row)) return null
  const key = text(row.key)
  const name = text(row.name)
  const category = normalizeTemplateCategory(row.category)
  const subject = text(row.subject)
  const description = text(row.description)
  if (!key || !name || !category || !subject || !description) return null
  return {
    key,
    name,
    category,
    subject,
    description,
    active: boolValue(row.active),
    updatedAt: text(row.updated_at),
  }
}

function normalizeLog(row: unknown): AdminEmailLog | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const toEmail = text(row.to_email)
  const fromEmail = text(row.from_email)
  const subject = text(row.subject)
  const provider = text(row.provider)
  const status = normalizeLogStatus(row.status)
  const createdAt = text(row.created_at)
  if (!id || !toEmail || !subject || !provider || !status || !createdAt) return null
  return {
    id,
    templateKey: text(row.template_key),
    toEmail,
    fromEmail,
    subject,
    status,
    provider,
    providerMessageId: text(row.provider_message_id),
    errorMessage: text(row.error_message),
    sentAt: text(row.sent_at),
    createdAt,
  }
}

function normalizeError(row: unknown): AdminEmailError | null {
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

function normalizeSnapshot(row: unknown): AdminEmailSnapshot | null {
  if (!isRecord(row)) return null
  const checkedAt = text(row.checked_at)
  const provider = normalizeProvider(row.provider)
  if (!checkedAt || !provider) return null
  return {
    checkedAt,
    summaryStatus: normalizeStatus(row.summary_status),
    defaultToEmail: text(row.default_to_email),
    provider,
    metrics: Array.isArray(row.metrics) ? row.metrics.map(normalizeMetric).filter(Boolean) as AdminEmailMetric[] : [],
    templates: Array.isArray(row.templates) ? row.templates.map(normalizeTemplate).filter(Boolean) as AdminEmailTemplate[] : [],
    logs: Array.isArray(row.logs) ? row.logs.map(normalizeLog).filter(Boolean) as AdminEmailLog[] : [],
    recentErrors: Array.isArray(row.recent_errors) ? row.recent_errors.map(normalizeError).filter(Boolean) as AdminEmailError[] : [],
  }
}

async function invokeAdminEmail(
  client: AdminEmailClient | null | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-email', { body })
    if (error || !isRecord(data)) return null
    return data
  } catch {
    return null
  }
}

export async function loadAdminEmailSnapshot(
  client?: AdminEmailClient | null,
  filters: AdminEmailSnapshotFilters = {},
): Promise<AdminEmailSnapshot | null> {
  const data = await invokeAdminEmail(client, {
    action: 'snapshot',
    limit: filters.limit ?? 50,
  })
  return normalizeSnapshot(data)
}

export async function sendAdminTestEmail(
  client: AdminEmailClient | null | undefined,
  input: AdminEmailTestInput,
): Promise<{ logId: string; status: AdminEmailLogStatus; providerMessageId: string | null } | null> {
  const data = await invokeAdminEmail(client, {
    action: 'send_test',
    to_email: normalizedText(input.toEmail),
    template_key: normalizedText(input.templateKey),
    subject: normalizedText(input.subject),
    message: normalizedText(input.message),
  })
  if (!data) return null
  const logId = text(data.log_id)
  const status = normalizeLogStatus(data.status)
  if (!logId || !status) return null
  return {
    logId,
    status,
    providerMessageId: text(data.provider_message_id),
  }
}
