import { getSupabase, isSupabaseConfigured } from './supabase/client'

export type AdminNotificationTargetType = 'all' | 'free' | 'premium' | 'user' | 'group'
export type AdminNotificationStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
export type AdminNotificationChannel = 'in_app' | 'web_push'
export type AdminNotificationDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export type AdminNotificationChannels = {
  inApp: boolean
  webPush: boolean
}

export type AdminNotificationTargetInput = {
  targetType: AdminNotificationTargetType
  targetValue?: string | null
  channels: AdminNotificationChannels
}

export type AdminNotificationSendInput = AdminNotificationTargetInput & {
  title: string
  body: string
  href?: string | null
}

export type AdminNotificationPreview = {
  targetCount: number
  pushSubscriberCount: number
}

export type AdminNotificationSendResult = {
  notificationId: string
  jobId: string | null
  targetCount: number
  inAppSent: number
  pushSent: number
  pushFailed: number
}

export type AdminNotificationCampaign = {
  id: string
  title: string
  body: string
  href: string | null
  targetType: AdminNotificationTargetType
  targetValue: string | null
  status: AdminNotificationStatus
  channelInApp: boolean
  channelWebPush: boolean
  targetCount: number
  inAppSent: number
  pushSent: number
  pushFailed: number
  createdAt: string
  sentAt: string | null
}

export type AdminNotificationDelivery = {
  id: string
  notificationId: string
  userId: string | null
  userEmail: string | null
  channel: AdminNotificationChannel
  status: AdminNotificationDeliveryStatus
  errorMessage: string | null
  sentAt: string | null
  readAt: string | null
  createdAt: string
}

export type AdminNotificationListFilters = {
  status?: AdminNotificationStatus | 'all'
  limit?: number
}

type FunctionResult = PromiseLike<{ data: unknown; error: unknown }>
type RpcResult = PromiseLike<{ data: unknown; error: unknown }>

type AdminNotificationsClient = {
  functions: {
    invoke: (name: 'admin-notifications', options: { body: Record<string, unknown> }) => FunctionResult
  }
  rpc: (
    name: 'admin_list_system_notifications' | 'admin_list_notification_deliveries',
    params?: Record<string, unknown>,
  ) => RpcResult
}

function getClient(client?: AdminNotificationsClient | null): AdminNotificationsClient | null {
  return client ?? (isSupabaseConfigured ? (getSupabase() as AdminNotificationsClient) : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function numberValue(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0
  return Number.isFinite(n) ? n : 0
}

function boolValue(value: unknown): boolean {
  return value === true || value === 'true'
}

function normalizeTarget(value: unknown): AdminNotificationTargetType | null {
  return value === 'all' || value === 'free' || value === 'premium' || value === 'user' || value === 'group' ? value : null
}

function normalizeStatus(value: unknown): AdminNotificationStatus | null {
  return value === 'draft' || value === 'scheduled' || value === 'sending' || value === 'sent' || value === 'failed' || value === 'cancelled'
    ? value
    : null
}

function normalizeDeliveryStatus(value: unknown): AdminNotificationDeliveryStatus | null {
  return value === 'pending' || value === 'sent' || value === 'failed' || value === 'skipped' ? value : null
}

function normalizeChannel(value: unknown): AdminNotificationChannel | null {
  return value === 'in_app' || value === 'web_push' ? value : null
}

function normalizedText(value: string | null | undefined): string | null {
  const clean = value?.trim() ?? ''
  return clean.length > 0 ? clean : null
}

function limitedInt(value: number | undefined, min: number, max: number) {
  const n = Number.isFinite(value) ? Math.trunc(value as number) : min
  return Math.min(Math.max(n, min), max)
}

function edgeBody(input: AdminNotificationTargetInput) {
  return {
    target_type: input.targetType,
    target_value: normalizedText(input.targetValue),
    channels: {
      in_app: input.channels.inApp,
      web_push: input.channels.webPush,
    },
  }
}

function normalizeCampaign(row: unknown): AdminNotificationCampaign | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const title = text(row.title)
  const body = text(row.body)
  const targetType = normalizeTarget(row.target_type)
  const status = normalizeStatus(row.status)
  const createdAt = text(row.created_at)
  if (!id || !title || !body || !targetType || !status || !createdAt) return null
  return {
    id,
    title,
    body,
    href: text(row.href),
    targetType,
    targetValue: text(row.target_value),
    status,
    channelInApp: boolValue(row.channel_in_app),
    channelWebPush: boolValue(row.channel_web_push),
    targetCount: numberValue(row.target_count),
    inAppSent: numberValue(row.in_app_sent),
    pushSent: numberValue(row.push_sent),
    pushFailed: numberValue(row.push_failed),
    createdAt,
    sentAt: text(row.sent_at),
  }
}

function normalizeDelivery(row: unknown): AdminNotificationDelivery | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const notificationId = text(row.notification_id)
  const channel = normalizeChannel(row.channel)
  const status = normalizeDeliveryStatus(row.status)
  const createdAt = text(row.created_at)
  if (!id || !notificationId || !channel || !status || !createdAt) return null
  return {
    id,
    notificationId,
    userId: text(row.user_id),
    userEmail: text(row.user_email),
    channel,
    status,
    errorMessage: text(row.error_message),
    sentAt: text(row.sent_at),
    readAt: text(row.read_at),
    createdAt,
  }
}

export async function previewAdminNotificationTarget(
  client: AdminNotificationsClient | null | undefined,
  input: AdminNotificationTargetInput,
): Promise<AdminNotificationPreview | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-notifications', {
      body: { action: 'preview', ...edgeBody(input) },
    })
    if (error || !isRecord(data)) return null
    return {
      targetCount: numberValue(data.target_count),
      pushSubscriberCount: numberValue(data.push_subscriber_count),
    }
  } catch {
    return null
  }
}

export async function sendAdminNotificationNow(
  client: AdminNotificationsClient | null | undefined,
  input: AdminNotificationSendInput,
): Promise<AdminNotificationSendResult | null> {
  const api = getClient(client)
  if (!api) return null
  try {
    const { data, error } = await api.functions.invoke('admin-notifications', {
      body: {
        action: 'send_now',
        title: normalizedText(input.title),
        body: normalizedText(input.body),
        href: normalizedText(input.href),
        ...edgeBody(input),
      },
    })
    if (error || !isRecord(data)) return null
    const notificationId = text(data.notification_id)
    if (!notificationId) return null
    return {
      notificationId,
      jobId: text(data.job_id),
      targetCount: numberValue(data.target_count),
      inAppSent: numberValue(data.in_app_sent),
      pushSent: numberValue(data.push_sent),
      pushFailed: numberValue(data.push_failed),
    }
  } catch {
    return null
  }
}

export async function listAdminNotifications(
  client?: AdminNotificationsClient | null,
  filters: AdminNotificationListFilters = {},
): Promise<AdminNotificationCampaign[]> {
  const api = getClient(client)
  if (!api) return []
  try {
    const { data, error } = await api.rpc('admin_list_system_notifications', {
      p_status: filters.status && filters.status !== 'all' ? filters.status : null,
      p_limit: limitedInt(filters.limit, 1, 100),
    })
    if (error || !Array.isArray(data)) return []
    return data.map(normalizeCampaign).filter((item): item is AdminNotificationCampaign => Boolean(item))
  } catch {
    return []
  }
}

export async function listAdminNotificationDeliveries(
  client?: AdminNotificationsClient | null,
  notificationId?: string | null,
  limit = 100,
): Promise<AdminNotificationDelivery[]> {
  const api = getClient(client)
  if (!api) return []
  try {
    const { data, error } = await api.rpc('admin_list_notification_deliveries', {
      p_notification_id: normalizedText(notificationId),
      p_limit: limitedInt(limit, 1, 200),
    })
    if (error || !Array.isArray(data)) return []
    return data.map(normalizeDelivery).filter((item): item is AdminNotificationDelivery => Boolean(item))
  } catch {
    return []
  }
}
