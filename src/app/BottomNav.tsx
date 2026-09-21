import clsx from 'clsx'
import { type ReactNode } from 'react'
import { Bell, Home, LayoutGrid, Plus, Settings, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useT } from '../lib/i18n'
import { useNotifications } from '../lib/notifications'

function Item({
  to,
  icon,
  label,
  badge,
}: {
  to: string
  icon: ReactNode
  label: string
  badge?: number
}) {
  return (
    <NavLink
      to={to}
      end
      aria-label={label}
      className={({ isActive }) =>
        clsx(
          'relative flex items-center justify-center flex-1 h-full press transition',
          isActive ? 'text-brand-600 dark:text-brand-300' : 'text-faint',
        )
      }
    >
      {({ isActive }) => (
        <span className="relative grid place-items-center">
          {isActive && (
            <span className="absolute -bottom-2 h-1 w-1 rounded-full bg-brand-500" />
          )}
          {icon}
          {badge != null && badge > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 grid place-items-center rounded-full bg-neg text-white text-[10px] font-bold leading-none ring-2 ring-[var(--nav-ring)] tnum">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>
      )}
    </NavLink>
  )
}

export function BottomNav({ onCreate }: { onCreate: () => void }) {
  const t = useT()
  const { unread } = useNotifications()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      style={{ background: 'linear-gradient(to top, var(--bg) 55%, transparent)' }}
    >
      <div
        className="relative flex items-stretch h-14 rounded-3xl glass border border-[var(--border-strong)] px-1"
        style={{ background: 'var(--nav)' }}
      >
        <Item to="/" icon={<Home size={22} />} label={t.home.navHome} />
        <Item to="/groups" icon={<LayoutGrid size={22} />} label={t.home.groups} />

        {/* Khe giữa cho nút + nổi */}
        <div className="relative flex-1 flex items-center justify-center">
          <button
            onClick={onCreate}
            aria-label={t.home.addExpense}
            className="press absolute -top-5 grid place-items-center h-12 w-12 rounded-2xl gradient-brand text-white shadow-glow hover:brightness-110"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>

        <Item to="/notifications" icon={<Bell size={22} />} label={t.home.navNotifications} badge={unread} />
        <Item to="/settings" icon={<Settings size={22} />} label={t.home.navSettings} />
      </div>
    </nav>
  )
}

function DesktopItem({
  to,
  icon,
  label,
  badge,
}: {
  to: string
  icon: ReactNode
  label: string
  badge?: number
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        clsx(
          'press relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition',
          isActive
            ? 'bg-[var(--surface-solid)] text-app shadow-soft border border-[var(--border)]'
            : 'text-muted hover:bg-[var(--surface-2)] hover:text-app',
        )
      }
    >
      <span className="grid place-items-center h-9 w-9 rounded-xl surface-sunken text-brand-600 dark:text-brand-300 shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="min-w-5 h-5 px-1.5 grid place-items-center rounded-full bg-neg text-white text-[11px] font-bold leading-none tnum">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export function DesktopNav({ onCreate }: { onCreate: () => void }) {
  const t = useT()
  const { unread } = useNotifications()

  return (
    <aside className="hidden lg:flex lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)] lg:flex-col lg:rounded-[1.75rem] lg:glass lg:border lg:border-[var(--border-strong)] lg:p-4">
      <div className="px-2 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-2xl gradient-brand text-white shadow-glow">
            <Sparkles size={20} />
          </span>
          <div>
            <p className="text-xl font-extrabold tracking-tight text-gradient">Splitz</p>
            <p className="text-xs text-muted">{t.home.navTagline}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onCreate}
        className="press mb-4 flex items-center justify-center gap-2 rounded-2xl gradient-brand px-4 py-3 text-sm font-extrabold text-white shadow-glow hover:brightness-110"
      >
        <Plus size={18} strokeWidth={2.5} /> {t.home.recordExpense}
      </button>

      <nav className="space-y-1.5">
        <DesktopItem to="/" icon={<Home size={19} />} label={t.home.navHome} />
        <DesktopItem to="/groups" icon={<LayoutGrid size={19} />} label={t.home.groups} />
        <DesktopItem to="/notifications" icon={<Bell size={19} />} label={t.home.navNotifications} badge={unread} />
        <DesktopItem to="/settings" icon={<Settings size={19} />} label={t.home.navSettings} />
      </nav>

      <div className="mt-auto rounded-2xl surface-sunken border border-[var(--border)] p-3">
        <p className="text-xs font-semibold text-muted">{t.home.notHoldingFunds}</p>
        <p className="mt-1 text-xs leading-relaxed text-faint">
          {t.home.transparencyNote}
        </p>
      </div>
    </aside>
  )
}
