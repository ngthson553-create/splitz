import { getSupabase, isSupabaseConfigured } from './supabase/client'
import { t } from './i18n'

export type AdminConfigStatus = 'configured' | 'missing' | 'failed' | 'unknown'
export type AdminConfigFlagCategory = 'ai' | 'growth' | 'ops' | 'auth' | 'system'
export type AdminConfigFlagKey =
  | 'ai_parse_expense'
  | 'ai_ocr_receipt'
  | 'ai_insight'
  | 'payments'
  | 'redeem'
  | 'debt_reminder'
  | 'zalo_login'

export type AdminConfigFlag = {
  key: AdminConfigFlagKey
  label: string
  description: string
  enabled: boolean
  category: AdminConfigFlagCategory
  dangerous: boolean
  updatedAt: string | null
}

export type AdminConfigLimits = {
  freeMaxGroups: number
  freeMaxMembers: number
  premiumMaxGroups: number | null
  premiumMaxMembers: number
  parseFree: number
  ocrFree: number
  insightFree: number
  debtCooldownHours: number
  redeemDurationDays: number
  redeemMaxUses: number
}

export type AdminConfigMaintenanceSeverity = 'info' | 'warning' | 'critical'

export type AdminConfigMaintenance = {
  enabled: boolean
  title: string
  message: string
  severity: AdminConfigMaintenanceSeverity
  startsAt: string | null
  endsAt: string | null
  updatedAt?: string | null
}

export type AdminConfigDisclaimer = {
  payment: string
  legal: string
  updatedAt: string | null
}

export type AdminConfigRecentChange = {
  id: string
  action: string
  actorEmail: string | null
  createdAt: string
}

export type AdminConfigSnapshot = {
  checkedAt: string
  summaryStatus: AdminConfigStatus
  flags: AdminConfigFlag[]
  limits: AdminConfigLimits
  maintenance: AdminConfigMaintenance
  disclaimer: AdminConfigDisclaimer
  recentChanges: AdminConfigRecentChange[]
}

export type AdminConfigSaveFlagsInput = {
  flags: Partial<Record<AdminConfigFlagKey, boolean>>
  reason: string
}

export type AdminConfigSaveLimitsInput = {
  limits: AdminConfigLimits
  reason: string
}

export type AdminConfigSaveMaintenanceInput = {
  maintenance: Omit<AdminConfigMaintenance, 'updatedAt'>
  reason: string
}

export type AdminConfigSaveDisclaimerInput = {
  disclaimer: Omit<AdminConfigDisclaimer, 'updatedAt'>
  reason: string
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminConfigClient = {
  functions: {
    invoke: (name: 'admin-config', options: { body: Record<string, unknown> }) => FunctionResult
  }
}

function getClient(client?: AdminConfigClient | null): AdminConfigClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminConfigClient) : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function cleanText(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? ''
  return clean.length > 0 ? clean : null
}

function boolValue(value: unknown): boolean {
  return value === true || value === 'true'
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(n) ? n : 0
}

function optionalNumber(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : null
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

function normalizeStatus(value: unknown): AdminConfigStatus {
  return value === 'configured' || value === 'missing' || value === 'failed' ? value : 'unknown'
}

function normalizeFlagKey(value: unknown): AdminConfigFlagKey | null {
  return value === 'ai_parse_expense'
    || value === 'ai_ocr_receipt'
    || value === 'ai_insight'
    || value === 'payments'
    || value === 'redeem'
    || value === 'debt_reminder'
    || value === 'zalo_login'
    ? value
    : null
}

function normalizeCategory(value: unknown): AdminConfigFlagCategory {
  return value === 'ai' || value === 'growth' || value === 'ops' || value === 'auth' || value === 'system' ? value : 'system'
}

function normalizeSeverity(value: unknown): AdminConfigMaintenanceSeverity {
  return value === 'warning' || value === 'critical' ? value : 'info'
}

function limitedInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.trunc(value), min), max)
}

function normalizeFlag(row: unknown): AdminConfigFlag | null {
  if (!isRecord(row)) return null
  const key = normalizeFlagKey(row.key)
  const label = text(row.label)
  const description = text(row.description)
  if (!key || !label || !description) return null
  return {
    key,
    label,
    description,
    enabled: boolValue(row.enabled),
    category: normalizeCategory(row.category),
    dangerous: boolValue(row.dangerous),
    updatedAt: text(row.updated_at),
  }
}

function normalizeLimits(row: unknown): AdminConfigLimits {
  const value = isRecord(row) ? row : {}
  return {
    freeMaxGroups: numberValue(value.free_max_groups) || 3,
    freeMaxMembers: numberValue(value.free_max_members) || 8,
    premiumMaxGroups: optionalNumber(value.premium_max_groups),
    premiumMaxMembers: numberValue(value.premium_max_members) || 25,
    parseFree: numberValue(value.parse_free) || 15,
    ocrFree: numberValue(value.ocr_free) || 3,
    insightFree: numberValue(value.insight_free) || 3,
    debtCooldownHours: numberValue(value.debt_cooldown_hours) || 24,
    redeemDurationDays: numberValue(value.redeem_duration_days) || 30,
    redeemMaxUses: numberValue(value.redeem_max_uses) || 1,
  }
}

function normalizeMaintenance(row: unknown): AdminConfigMaintenance {
  const value = isRecord(row) ? row : {}
  return {
    enabled: boolValue(value.enabled),
    title: text(value.title) ?? t().adminSystem.maintenanceTitle,
    message: text(value.message) ?? '',
    severity: normalizeSeverity(value.severity),
    startsAt: text(value.starts_at),
    endsAt: text(value.ends_at),
    updatedAt: text(value.updated_at),
  }
}

function normalizeDisclaimer(row: unknown): AdminConfigDisclaimer {
  const value = isRecord(row) ? row : {}
  return {
    payment: text(value.payment) ?? '',
    legal: text(value.legal) ?? '',
    updatedAt: text(value.updated_at),
  }
}

function normalizeRecentChange(row: unknown): AdminConfigRecentChange | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const action = text(row.action)
  const createdAt = text(row.created_at)
  if (!id || !action || !createdAt) return null
  return {
    id,
    action,
    actorEmail: text(row.actor_email),
    createdAt,
  }
}

function normalizeSnapshot(row: unknown): AdminConfigSnapshot | null {
  if (!isRecord(row)) return null
  const checkedAt = text(row.checked_at)
  if (!checkedAt) return null
  return {
    checkedAt,
    summaryStatus: normalizeStatus(row.summary_status),
    flags: Array.isArray(row.flags) ? row.flags.map(normalizeFlag).filter(Boolean) as AdminConfigFlag[] : [],
    limits: normalizeLimits(row.limits),
    maintenance: normalizeMaintenance(row.maintenance),
    disclaimer: normalizeDisclaimer(row.disclaimer),
    recentChanges: Array.isArray(row.recent_changes) ? row.recent_changes.map(normalizeRecentChange).filter(Boolean) as AdminConfigRecentChange[] : [],
  }
}

async function invokeAdminConfig(
  client: AdminConfigClient | null | undefined,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-config', { body })
    if (error || !isRecord(data)) return null
    return data
  } catch {
    return null
  }
}

function reasonText(reason: string): string | null {
  return cleanText(reason)?.slice(0, 300) ?? null
}

function snakeLimits(input: AdminConfigLimits) {
  return {
    free_max_groups: limitedInt(input.freeMaxGroups, 1, 999),
    free_max_members: limitedInt(input.freeMaxMembers, 1, 999),
    premium_max_groups: input.premiumMaxGroups == null ? null : limitedInt(input.premiumMaxGroups, 1, 9999),
    premium_max_members: limitedInt(input.premiumMaxMembers, 1, 999),
    parse_free: limitedInt(input.parseFree, 0, 9999),
    ocr_free: limitedInt(input.ocrFree, 0, 9999),
    insight_free: limitedInt(input.insightFree, 0, 9999),
    debt_cooldown_hours: limitedInt(input.debtCooldownHours, 1, 720),
    redeem_duration_days: limitedInt(input.redeemDurationDays, 1, 3650),
    redeem_max_uses: limitedInt(input.redeemMaxUses, 1, 100000),
  }
}

function snakeMaintenance(input: Omit<AdminConfigMaintenance, 'updatedAt'>) {
  return {
    enabled: input.enabled,
    title: cleanText(input.title) ?? t().adminSystem.maintenanceTitle,
    message: cleanText(input.message) ?? '',
    severity: input.severity,
    starts_at: cleanText(input.startsAt),
    ends_at: cleanText(input.endsAt),
  }
}

export async function loadAdminConfigSnapshot(client?: AdminConfigClient | null): Promise<AdminConfigSnapshot | null> {
  const data = await invokeAdminConfig(client, { action: 'snapshot' })
  return normalizeSnapshot(data)
}

export async function saveAdminFeatureFlags(
  client: AdminConfigClient | null | undefined,
  input: AdminConfigSaveFlagsInput,
): Promise<boolean> {
  const data = await invokeAdminConfig(client, {
    action: 'save_flags',
    flags: input.flags,
    reason: reasonText(input.reason),
  })
  return data?.saved === true
}

export async function saveAdminLimits(
  client: AdminConfigClient | null | undefined,
  input: AdminConfigSaveLimitsInput,
): Promise<boolean> {
  const data = await invokeAdminConfig(client, {
    action: 'save_limits',
    limits: snakeLimits(input.limits),
    reason: reasonText(input.reason),
  })
  return data?.saved === true
}

export async function saveAdminMaintenance(
  client: AdminConfigClient | null | undefined,
  input: AdminConfigSaveMaintenanceInput,
): Promise<boolean> {
  const data = await invokeAdminConfig(client, {
    action: 'save_maintenance',
    maintenance: snakeMaintenance(input.maintenance),
    reason: reasonText(input.reason),
  })
  return data?.saved === true
}

export async function saveAdminDisclaimer(
  client: AdminConfigClient | null | undefined,
  input: AdminConfigSaveDisclaimerInput,
): Promise<boolean> {
  const data = await invokeAdminConfig(client, {
    action: 'save_disclaimer',
    disclaimer: {
      payment: cleanText(input.disclaimer.payment) ?? '',
      legal: cleanText(input.disclaimer.legal) ?? '',
    },
    reason: reasonText(input.reason),
  })
  return data?.saved === true
}
