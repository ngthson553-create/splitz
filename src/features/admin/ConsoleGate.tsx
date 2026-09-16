import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { getMyAdminRole } from '../../lib/admin'
import { useAuth } from '../../lib/auth'
import { ConsoleAccessContext, type ConsoleAccess } from './ConsoleAccessContext'

export function ConsoleAccessGate({ children }: { children: ReactNode }) {
  const { cloud, loading, session } = useAuth()
  const [access, setAccess] = useState<ConsoleAccess | null>(null)
  const [checkedUserId, setCheckedUserId] = useState<string | null>(null)
  const userId = session?.user.id ?? null
  const userEmail = session?.user.email ?? null
  const currentAccess = access?.userId === userId ? access : null
  const checking = loading || (cloud && Boolean(userId) && checkedUserId !== userId)

  useEffect(() => {
    if (loading || !cloud || !userId) {
      return
    }

    let active = true
    getMyAdminRole()
      .then((role) => {
        if (!active) return
        setAccess(role ? { userId, role, email: userEmail } : null)
        setCheckedUserId(userId)
      })
      .catch(() => {
        if (!active) return
        setAccess(null)
        setCheckedUserId(userId)
      })

    return () => {
      active = false
    }
  }, [cloud, loading, userId, userEmail])

  if (checking) return <ConsoleGateLoading />
  if (!currentAccess) return <Navigate to="/" replace />

  return <ConsoleAccessContext.Provider value={currentAccess}>{children}</ConsoleAccessContext.Provider>
}

function ConsoleGateLoading() {
  return (
    <div className="relative min-h-dvh grid place-items-center px-5">
      <div className="app-aurora" />
      <div className="card relative w-full max-w-sm p-5 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl gradient-brand text-white shadow-glow">
          <ShieldCheck size={22} />
        </div>
        <p className="font-bold text-app">Đang mở Splitz</p>
        <p className="mt-1 text-sm text-muted">Vui lòng chờ trong giây lát.</p>
        <Loader2 size={22} className="mx-auto mt-4 animate-spin text-brand-500" />
      </div>
    </div>
  )
}
