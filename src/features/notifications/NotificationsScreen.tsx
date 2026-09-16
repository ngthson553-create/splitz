import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Activity, BellOff, Receipt, Settings as SettingsIcon } from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'
import { EmptyState, Segmented } from '../../components/ui'
import { useNotifications, type AppNotification, type NotificationKind } from '../../lib/notifications'
import { formatRelative } from '../../lib/format'
import { fadeUpItem, stagger } from '../../lib/motion'

export function NotificationsScreen() {
  const { items, unreadByKind, markAllRead } = useNotifications()
  const [tab, setTab] = useState<NotificationKind>('activity')
  const navigate = useNavigate()

  const filtered = useMemo(
    () => items.filter((n) => n.kind === tab),
    [items, tab],
  )

  return (
    <PageTransition>
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold tracking-tight">Thông báo</h1>
          {unreadByKind[tab] > 0 && (
            <button
              onClick={() => markAllRead(tab)}
              className="text-xs font-semibold text-brand-600 dark:text-brand-300 press"
            >
              Đánh dấu đã đọc
            </button>
          )}
        </header>

        <Segmented<NotificationKind>
          value={tab}
          onChange={setTab}
          options={[
            {
              value: 'activity',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  Hoạt động
                  {unreadByKind.activity > 0 && <Dot n={unreadByKind.activity} />}
                </span>
              ),
            },
            {
              value: 'system',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  Hệ thống
                  {unreadByKind.system > 0 && <Dot n={unreadByKind.system} />}
                </span>
              ),
            },
          ]}
        />

        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              variants={stagger}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
            >
              {filtered.length === 0 ? (
                <EmptyState
                  icon={tab === 'activity' ? <Activity size={24} /> : <BellOff size={24} />}
                  title={tab === 'activity' ? 'Chưa có hoạt động' : 'Không có thông báo hệ thống'}
                  description={
                    tab === 'activity'
                      ? 'Khi nhóm có khoản chi mới, sửa hoặc xoá, chúng sẽ xuất hiện ở đây.'
                      : 'Cập nhật về tài khoản và phiên bản app sẽ hiển thị tại đây.'
                  }
                />
              ) : (
                <div className="space-y-2">
                  {filtered.map((n) => (
                    <motion.div key={n.id} variants={fadeUpItem}>
                      <NotificationRow
                        notification={n}
                        onClick={() => {
                          if (n.href) navigate(n.href)
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  )
}

function Dot({ n }: { n: number }) {
  return (
    <span className="grid place-items-center min-w-4 h-4 px-1 rounded-full bg-neg text-white text-[10px] font-bold leading-none tnum">
      {n > 9 ? '9+' : n}
    </span>
  )
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: AppNotification
  onClick: () => void
}) {
  const { markRead } = useNotifications()
  const isActivity = notification.kind === 'activity'

  return (
    <button
      onClick={() => {
        if (!notification.read) markRead(notification.id)
        onClick()
      }}
      className="card press w-full flex items-center gap-3 p-3 text-left"
    >
      <span
        className={`grid place-items-center h-9 w-9 rounded-xl shrink-0 ${
          isActivity
            ? 'surface-sunken text-brand-600 dark:text-brand-300'
            : 'gradient-brand-soft text-white'
        }`}
      >
        {isActivity ? <Receipt size={16} /> : <SettingsIcon size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{notification.title}</p>
        {notification.body && <p className="text-xs text-muted truncate">{notification.body}</p>}
        <p className="text-[11px] text-faint mt-0.5">{formatRelative(notification.createdAt)}</p>
      </div>
      {!notification.read && <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
    </button>
  )
}
