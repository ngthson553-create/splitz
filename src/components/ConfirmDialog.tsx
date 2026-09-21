import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from './ui'
import { overlayMotion, spring } from '../lib/motion'
import { t, useT } from '../lib/i18n'

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext)
  if (!ctx)
    throw new Error(
      t().errors.hookOutsideProvider.replace('{fn}', 'useConfirm').replace('{provider}', 'ConfirmProvider'),
    )
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const t = useT()

  const confirm = useCallback<ConfirmContextValue>((options) => {
    setState(options)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((result: boolean) => {
    resolver.current?.(result)
    resolver.current = null
    setState(null)
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {createPortal(
      <AnimatePresence>
        {state && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center px-6">
            <motion.div
              variants={overlayMotion}
              initial="hidden"
              animate="show"
              exit="exit"
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
              onClick={() => close(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: spring }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              role="alertdialog"
              aria-modal="true"
              className="relative w-full max-w-xs glass rounded-3xl border border-[var(--border-strong)] shadow-glow p-5 text-center"
            >
              <h3 className="font-bold text-app">{state.title}</h3>
              {state.description && (
                <p className="mt-1.5 text-sm text-muted">{state.description}</p>
              )}
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" fullWidth onClick={() => close(false)}>
                  {state.cancelLabel ?? t.common.cancel}
                </Button>
                <Button
                  variant={state.danger ? 'danger' : 'primary'}
                  fullWidth
                  onClick={() => close(true)}
                >
                  {state.confirmLabel ?? t.common.confirm}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </ConfirmContext.Provider>
  )
}
