import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'
import { spring } from '../lib/motion'
import { t, useT } from '../lib/i18n'

type ToastTone = 'success' | 'error' | 'info'
type ToastItem = { id: number; message: string; tone: ToastTone }

type ToastContextValue = {
  show: (message: string, tone?: ToastTone) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx)
    throw new Error(t().errors.hookOutsideProvider.replace('{fn}', 'useToast').replace('{provider}', 'ToastProvider'))
  return ctx
}

const ICON: Record<ToastTone, ReactNode> = {
  success: <Check size={16} strokeWidth={3} />,
  error: <TriangleAlert size={16} />,
  info: <Info size={16} />,
}
const TONE: Record<ToastTone, string> = {
  success: 'text-pos',
  error: 'text-neg',
  info: 'text-brand-600 dark:text-brand-300',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const t = useT()
  const closeLabel = t.common.close

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = ++seq.current
      setItems((prev) => [...prev, { id, message, tone }])
      window.setTimeout(() => remove(id), 3000)
    },
    [remove],
  )

  const value: ToastContextValue = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: spring }}
              exit={{ opacity: 0, y: -12, scale: 0.95, transition: { duration: 0.18 } }}
              className="pointer-events-auto w-full max-w-sm glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-[var(--border-strong)] shadow-glow"
            >
              <span className={TONE[item.tone]}>{ICON[item.tone]}</span>
              <p className="flex-1 text-sm font-medium text-app">{item.message}</p>
              <button
                onClick={() => remove(item.id)}
                className="press text-faint hover:text-app"
                aria-label={closeLabel}
              >
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
