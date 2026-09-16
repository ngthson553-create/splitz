import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IconButton } from './ui'
import { overlayMotion, sheetMotion } from '../lib/motion'

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose()
  }

  // Portal ra body: tránh bị ancestor có transform (PageTransition/route motion) thu
  // hẹp `position: fixed` → panel lệch chỗ và backdrop che mất nút (blocker click).
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <motion.div
            variants={overlayMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            variants={sheetMotion}
            initial="hidden"
            animate="show"
            exit="exit"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
            role="dialog"
            aria-modal="true"
            className="relative w-full sm:max-w-md max-h-[88vh] flex flex-col
              glass rounded-t-3xl sm:rounded-3xl border border-[var(--border-strong)]
              shadow-glow overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0 cursor-grab active:cursor-grabbing">
              <span className="absolute left-1/2 -translate-x-1/2 top-2 h-1.5 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" />
              <h2 className="text-base font-bold text-app">{title}</h2>
              <IconButton onClick={onClose} aria-label="Đóng" className="h-9 w-9">
                <X size={18} />
              </IconButton>
            </div>
            <div className="px-5 pb-4 overflow-y-auto no-scrollbar flex-1">{children}</div>
            {footer && (
              <div className="px-5 py-3.5 border-t border-[var(--border)] shrink-0 bg-[var(--surface)]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
