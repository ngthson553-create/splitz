import { getSupabase, isSupabaseConfigured } from './supabase/client'

const REMOTE_PREFIX = 'sys:'

export type RemoteSystemNotification = {
  id: string
  kind: 'system'
  title: string
  body?: string
  createdAt: string
  read: boolean
  href?: string
}

type RpcResult = PromiseLike<{ data: unknown; error: unknown }>

type SystemNotificationsRpcClient = {
  rpc: (
    name:
      | 'list_my_system_notifications'
      | 'mark_my_system_notification_read'
      | 'mark_all_my_system_notifications_read',
    params?: Record<string, unknown>,
  ) => RpcResult
}

function getClient(client?: SystemNotificationsRpcClient | null): SystemNotificationsRpcClient | null {
  return client ?? (isSupabaseConfigured ? getSupabase() : null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function deliveryIdFromNotificationId(id: string): string | null {
  return id.startsWith(REMOTE_PREFIX) ? id.slice(REMOTE_PREFIX.length) : null
}

function normalizeSystemNotification(row: unknown): RemoteSystemNotification | null {
  if (!isRecord(row)) return null
  const id = text(row.id)
  const title = text(row.title)
  const sentAt = text(row.sent_at)
  if (!id || !title || !sentAt) return null
  const body = text(row.body)
  const href = text(row.href)
  return {
    id: `${REMOTE_PREFIX}${id}`,
    kind: 'system',
    title,
    body: body ?? undefined,
    href: href ?? undefined,
    createdAt: sentAt,
    read: Boolean(text(row.read_at)),
  }
}

export function isRemoteSystemNotificationId(id: string): boolean {
  return id.startsWith(REMOTE_PREFIX)
}

export async function listSystemNotifications(
  client?: SystemNotificationsRpcClient | null,
): Promise<RemoteSystemNotification[]> {
  const api = getClient(client)
  if (!api) return []
  try {
    const { data, error } = await api.rpc('list_my_system_notifications', { p_limit: 50 })
    if (error || !Array.isArray(data)) return []
    return data.map(normalizeSystemNotification).filter((item): item is RemoteSystemNotification => Boolean(item))
  } catch {
    return []
  }
}

export async function markSystemNotificationRead(
  client: SystemNotificationsRpcClient | null | undefined,
  id: string,
): Promise<boolean> {
  const api = getClient(client)
  const deliveryId = deliveryIdFromNotificationId(id)
  if (!api || !deliveryId) return false
  try {
    const { data, error } = await api.rpc('mark_my_system_notification_read', { p_delivery_id: deliveryId })
    return !error && Boolean(text(data))
  } catch {
    return false
  }
}

export async function markAllSystemNotificationsRead(
  client?: SystemNotificationsRpcClient | null,
): Promise<boolean> {
  const api = getClient(client)
  if (!api) return false
  try {
    const { error } = await api.rpc('mark_all_my_system_notifications_read')
    return !error
  } catch {
    return false
  }
}
