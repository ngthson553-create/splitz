import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Crown, Sparkles, X } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useSubscription } from '../../lib/subscription'
import { trackEvent } from '../../lib/analytics'
import { PlanSheet } from './PlanSheet'

// Lưu trạng thái nhắc: số lần đã mở app, lần nhắc gần nhất, số lần đã bỏ qua, tắt hẳn.
type PromptState = {
  opens: number
  lastShown: number // epoch ms
  dismissed: number // số lần bỏ qua
  off: boolean // "Không nhắc nữa"
}
const KEY = 'splitz.upgradePrompt.v1'
const DAY = 86_400_000
// Giãn dần theo số lần đã bỏ qua: lần đầu chờ 1 ngày, rồi 3, rồi 7, rồi 14.
const BACKOFF_DAYS = [1, 3, 7, 14]
// Chỉ bắt đầu nhắc sau khi user đã mở app vài lần (cho trải nghiệm trước).
const MIN_OPENS = 3

function read(): PromptState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { opens: 0, lastShown: 0, dismissed: 0, off: false, ...JSON.parse(raw) }
  } catch {
    // bỏ qua
  }
  return { opens: 0, lastShown: 0, dismissed: 0, off: false }
}
function write(s: PromptState) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function UpgradePrompt() {
  const { mode } = useStore()
  const { isPremium, loading } = useSubscription()
  const [show, setShow] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)

  useEffect(() => {
    if (loading || mode !== 'cloud' || isPremium) return

    const s = read()
    if (s.off) return

    // Đếm lần mở (mỗi lần mount = 1 phiên mở app).
    s.opens += 1

    const enoughOpens = s.opens >= MIN_OPENS
    const backoff = BACKOFF_DAYS[Math.min(s.dismissed, BACKOFF_DAYS.length - 1)] * DAY
    const dueByTime = Date.now() - s.lastShown >= backoff
    // Tối đa 1 lần/ngày dù backoff nhỏ.
    const oncePerDay = Date.now() - s.lastShown >= DAY

    if (enoughOpens && dueByTime && oncePerDay) {
      s.lastShown = Date.now()
      write(s)
      // Hiện sau khoảnh khắc nhỏ để app render xong, đỡ giật.
      const t = setTimeout(() => {
        setShow(true)
        trackEvent('upgrade_prompt_shown', { opens: s.opens, dismissed: s.dismissed })
      }, 900)
      return () => clearTimeout(t)
    }
    write(s)
  }, [loading, mode, isPremium])

  function dismiss() {
    const s = read()
    s.dismissed += 1
    write(s)
    trackEvent('upgrade_prompt_dismissed', { dismissed: s.dismissed })
    setShow(false)
  }

  function never() {
    const s = read()
    s.off = true
    write(s)
    trackEvent('upgrade_prompt_muted')
    setShow(false)
  }

  function upgrade() {
    trackEvent('upgrade_prompt_cta')
    setShow(false)
    setPlanOpen(true)
  }

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {show && (
            <motion.div
              className="fixed inset-0 z-[60] grid place-items-center p-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={dismiss} />
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                className="relative w-full max-w-sm rounded-3xl p-6 overflow-hidden"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(232,200,122,0.08), transparent 30%), linear-gradient(140deg, #2b220f 0%, #14110b 55%, #08070a 100%)',
                  border: '1px solid rgba(232,200,122,0.45)',
                  boxShadow:
                    '0 1px 0 rgba(255,246,214,0.18) inset, 0 30px 80px -20px rgba(0,0,0,0.85), 0 0 40px -16px rgba(232,200,122,0.4)',
                }}
              >
                {/* ánh kim trang trí */}
                <div
                  className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-2xl"
                  style={{ background: 'radial-gradient(circle, rgba(227,197,120,0.35), transparent 70%)' }}
                />
                <button
                  onClick={dismiss}
                  aria-label="Đóng"
                  className="absolute top-4 right-4 grid place-items-center h-8 w-8 rounded-lg text-[#c8bb98] hover:text-[#f6f0e2]"
                >
                  <X size={18} />
                </button>

                <div className="relative">
                  <span
                    className="grid place-items-center h-14 w-14 rounded-2xl mb-4"
                    style={{
                      background:
                        'linear-gradient(135deg, #8a6a22 0%, #e7c97e 25%, #fff4cf 45%, #d9b462 65%, #a87f2b 100%)',
                      boxShadow:
                        '0 1px 0 rgba(255,246,214,0.6) inset, 0 12px 30px -8px rgba(212,175,95,0.55)',
                    }}
                  >
                    <Crown size={26} className="text-[#1a1408]" />
                  </span>

                  <h2 className="text-xl font-extrabold text-[#f6f0e2]">Mở khoá Splitz Premium</h2>
                  <p className="text-sm text-[#c8bb98] mt-1.5">
                    Không giới hạn nhóm, gộp công nợ liên nhóm, quỹ nhóm, chi định kỳ — cùng giao
                    diện Prestige thẻ đen viền vàng.
                  </p>

                  <ul className="mt-4 space-y-2">
                    {[
                      'Không giới hạn nhóm · 25 thành viên/nhóm',
                      'AI nhập chi không giới hạn',
                      'Giao diện Prestige độc quyền',
                    ].map((t) => (
                      <li key={t} className="flex items-center gap-2 text-sm text-[#e8dfc9]">
                        <Sparkles size={15} className="text-[#e3c578] shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={upgrade}
                    className="prestige-cta press w-full h-12 rounded-2xl mt-5 font-bold text-[#1a1408] relative overflow-hidden"
                    style={{
                      background:
                        'linear-gradient(135deg, #a87f2b 0%, #e7c97e 28%, #fff4cf 50%, #d9b462 72%, #c69a3f 100%)',
                      boxShadow:
                        '0 1px 0 rgba(255,246,214,0.7) inset, 0 16px 40px -12px rgba(212,175,95,0.6)',
                    }}
                  >
                    Xem các gói
                  </button>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <button onClick={dismiss} className="text-xs text-[#9a8e6f] hover:text-[#c8bb98]">
                      Để sau
                    </button>
                    <span className="text-[#3a342400]">·</span>
                    <button onClick={never} className="text-xs text-[#9a8e6f] hover:text-[#c8bb98]">
                      Không nhắc nữa
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <PlanSheet open={planOpen} onClose={() => setPlanOpen(false)} />
    </>
  )
}
