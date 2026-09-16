import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import { spring } from '../lib/motion'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'splitz.install.dismissed'

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return
    // Đã cài (standalone) thì không gợi ý.
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function install() {
    if (!evt) return
    await evt.prompt()
    await evt.userChoice
    setVisible(false)
    setEvt(null)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: spring }}
          exit={{ y: 80, opacity: 0, transition: { duration: 0.2 } }}
          className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md px-5"
        >
          <div className="glass rounded-2xl border border-[var(--border-strong)] shadow-glow p-3 flex items-center gap-3">
            <span className="grid place-items-center h-10 w-10 rounded-xl gradient-brand text-white shadow-soft shrink-0">
              <Download size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm">Cài Splitz vào màn hình chính</p>
              <p className="text-xs text-muted">Mở nhanh như app, dùng được khi offline.</p>
            </div>
            <button
              onClick={install}
              className="press gradient-brand text-white font-semibold text-sm rounded-xl h-9 px-3.5 shadow-soft shrink-0"
            >
              Cài
            </button>
            <button
              onClick={dismiss}
              className="press grid place-items-center h-8 w-8 rounded-lg text-faint hover:text-app shrink-0"
              aria-label="Bỏ qua"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
