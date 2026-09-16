import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './auth'
import { newId } from './id'
import {
  isRemoteSystemNotificationId,
  listSystemNotifications,
  markAllSystemNotificationsRead,
  markSystemNotificationRead,
} from './systemNotifications'

export type NotificationKind = 'activity' | 'system'

export type AppNotification = {
  id: string
  kind: NotificationKind
  title: string
  body?: string
  /** ISO datetime. */
  createdAt: string
  read: boolean
  /** Điều hướng khi bấm (vd /g/<id>). */
  href?: string
}

type NewNotification = Omit<AppNotification, 'id' | 'createdAt' | 'read'>

type NotificationsValue = {
  items: AppNotification[]
  unread: number
  unreadByKind: Record<NotificationKind, number>
  add: (n: NewNotification) => void
  markRead: (id: string) => void
  markAllRead: (kind?: NotificationKind) => void
  clear: () => void
}

const KEY = 'splitz.notifications.v1'
const NotificationsContext = createContext<NotificationsValue | null>(null)

function readAll(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : []
  } catch {
    return []
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { cloud, session } = useAuth()
  const [localItems, setLocalItems] = useState<AppNotification[]>(() =>
    typeof window === 'undefined' ? [] : readAll(),
  )
  const [remoteItems, setRemoteItems] = useState<AppNotification[]>([])

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(localItems))
  }, [localItems])

  // Đồng bộ giữa nhiều tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLocalItems(readAll())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      if (!cloud || !session) {
        if (active) setRemoteItems([])
        return
      }
      void listSystemNotifications().then((rows) => {
        if (active) setRemoteItems(rows)
      })
    }, 0)
    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [cloud, session])

  const add = useCallback((n: NewNotification) => {
    setLocalItems((prev) => [
      { ...n, id: newId('ntf'), createdAt: new Date().toISOString(), read: false },
      ...prev,
    ])
  }, [])

  const markRead = useCallback((id: string) => {
    if (isRemoteSystemNotificationId(id)) {
      setRemoteItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      void markSystemNotificationRead(undefined, id)
      return
    }
    setLocalItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllRead = useCallback((kind?: NotificationKind) => {
    if (!kind || kind === 'system') {
      setRemoteItems((prev) => prev.map((n) => ({ ...n, read: true })))
      void markAllSystemNotificationsRead()
    }
    setLocalItems((prev) => prev.map((n) => (!kind || n.kind === kind ? { ...n, read: true } : n)))
  }, [])

  const clear = useCallback(() => setLocalItems([]), [])

  const value = useMemo<NotificationsValue>(() => {
    const items = [...remoteItems, ...localItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    const unreadByKind: Record<NotificationKind, number> = { activity: 0, system: 0 }
    let unread = 0
    for (const n of items) {
      if (!n.read) {
        unread += 1
        unreadByKind[n.kind] += 1
      }
    }
    return { items, unread, unreadByKind, add, markRead, markAllRead, clear }
  }, [localItems, remoteItems, add, markRead, markAllRead, clear])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications phải nằm trong NotificationsProvider.')
  return ctx
}
