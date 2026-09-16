import { createContext, useContext } from 'react'
import type { AdminRole } from '../../lib/admin'

export type ConsoleAccess = {
  userId: string
  role: AdminRole
  email: string | null
}

export const ConsoleAccessContext = createContext<ConsoleAccess | null>(null)

export function useConsoleAccess(): ConsoleAccess {
  const ctx = useContext(ConsoleAccessContext)
  if (!ctx) throw new Error('useConsoleAccess phải nằm trong ConsoleAccessProvider.')
  return ctx
}
