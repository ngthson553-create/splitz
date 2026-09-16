import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '../../lib/auth'
import { LoginScreen } from './LoginScreen'
import { OnboardingScreen } from './OnboardingScreen'

/**
 * Cổng vào: chặn truy cập app khi chưa đăng nhập / chưa onboarding.
 * Chế độ local (không cấu hình Supabase) → bỏ qua, vào thẳng app (dev/demo).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { cloud, loading, session, profile } = useAuth()

  if (!cloud) return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="app-aurora" />
        <Loader2 size={28} className="animate-spin text-brand-500 relative" />
      </div>
    )
  }

  if (!session) return <LoginScreen />
  if (!profile?.onboardedAt) return <OnboardingScreen />

  return <>{children}</>
}
