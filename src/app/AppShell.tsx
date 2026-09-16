import { AnimatePresence } from 'framer-motion'
import { cloneElement, createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { BottomNav, DesktopNav } from './BottomNav'
import { CreateGroupSheet } from '../features/home/CreateGroupSheet'
import { QuickAddExpense } from '../features/expense/QuickAddExpense'
import { ConfirmProvider } from '../components/ConfirmDialog'
import { InstallPrompt } from '../components/InstallPrompt'
import { MaintenanceBanner } from '../components/MaintenanceBanner'
import { UpgradePrompt } from '../features/settings/UpgradePrompt'
import { PremiumThemeSync } from '../features/settings/PremiumThemeSync'
import { PENDING_INVITE_KEY } from '../features/groups/JoinScreen'

type ShellContextValue = {
  openCreateGroup: () => void
  openQuickAdd: () => void
}
const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell phải nằm trong AppShell.')
  return ctx
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const outlet = useOutlet()

  // Sau khi đăng nhập + onboarding xong, quay lại lời mời đang chờ (nếu có).
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_INVITE_KEY)
    if (pending) {
      localStorage.removeItem(PENDING_INVITE_KEY)
      navigate(`/join/${pending}`, { replace: true })
    }
  }, [navigate])

  return (
    <ConfirmProvider>
        <ShellContext.Provider
          value={{
            openCreateGroup: () => setCreateOpen(true),
            openQuickAdd: () => setQuickAddOpen(true),
          }}
        >
          <div className="app-aurora" />
          <div className="relative mx-auto w-full max-w-md min-h-dvh lg:max-w-[1440px] lg:px-6 lg:py-6">
            <div className="lg:grid lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-6">
              <DesktopNav onCreate={() => setQuickAddOpen(true)} />
              <main className="min-w-0 flex-1 pb-24 lg:pb-0">
                <MaintenanceBanner />
                <AnimatePresence mode="wait" initial={false}>
                  {outlet && cloneElement(outlet, { key: location.pathname })}
                </AnimatePresence>
                {children}
              </main>
            </div>
            <BottomNav onCreate={() => setQuickAddOpen(true)} />
          </div>
          <CreateGroupSheet open={createOpen} onClose={() => setCreateOpen(false)} />
          <InstallPrompt />
          <UpgradePrompt />
          <PremiumThemeSync />
          <QuickAddExpense
            open={quickAddOpen}
            onClose={() => setQuickAddOpen(false)}
            onCreateGroup={() => setCreateOpen(true)}
          />
        </ShellContext.Provider>
    </ConfirmProvider>
  )
}
