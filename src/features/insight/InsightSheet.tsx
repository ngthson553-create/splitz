import { useState } from 'react'
import { Sparkles, TrendingUp, Crown } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useSubscription } from '../../lib/subscription'
import { requestInsight, type SpendingInsight } from '../../lib/ai/insight'
import { trackEvent } from '../../lib/analytics'
import type { InsightStats } from '../../lib/insight'

/**
 * Phân tích chi tiêu bằng AI (nhận xét tự nhiên trên số liệu tính sẵn).
 * PREMIUM + Free nếm 3 lần/tháng. Gọi theo NÚT (không auto) để kiểm soát chi phí.
 */
export function InsightSheet({
  open,
  onClose,
  title,
  stats,
}: {
  open: boolean
  onClose: () => void
  title: string
  stats: InsightStats | null
}) {
  const { isPremium } = useSubscription()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [insight, setInsight] = useState<SpendingInsight | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [quotaOut, setQuotaOut] = useState(false)

  async function generate() {
    if (!stats) return
    setBusy(true)
    setQuotaOut(false)
    try {
      const res = await requestInsight(stats)
      setInsight(res.insight)
      setRemaining(res.remaining)
      trackEvent('insight_generated', { scope: stats.scope })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không tạo được phân tích.'
      if (msg.includes('hết') || msg.toLowerCase().includes('nâng cấp')) setQuotaOut(true)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-4 py-1">
        {!insight && (
          <div className="flex flex-col items-center text-center py-4 px-2">
            <div className="grid place-items-center h-16 w-16 rounded-2xl gradient-brand-soft text-white shadow-glow mb-4 animate-float">
              <TrendingUp size={26} />
            </div>
            <h3 className="font-bold text-app">Phân tích chi tiêu bằng AI</h3>
            <p className="mt-1.5 text-sm text-muted max-w-xs">
              Splitz đọc số liệu của bạn và rút ra nhận xét: chi nhiều cho việc gì, ai chi nhiều,
              xu hướng tháng này và gợi ý quyết toán.
            </p>
          </div>
        )}

        {insight && (
          <div className="space-y-3">
            <div className="rounded-2xl gradient-mesh p-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300 mb-1.5">
                <Sparkles size={13} /> Nhận xét
              </div>
              <p className="text-sm font-semibold text-app leading-snug">{insight.headline}</p>
            </div>
            <ul className="space-y-2">
              {insight.points.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-app">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                  <span className="leading-snug">{p}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-faint leading-snug pt-1">
              Số liệu do Splitz tính chính xác; phần nhận xét do AI viết nên có thể chưa hoàn hảo.
            </p>
          </div>
        )}

        {quotaOut && !isPremium && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-50/60 dark:bg-amber-500/10 p-3.5 flex items-start gap-2.5">
            <Crown size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-app">
              Bạn đã dùng hết lượt phân tích miễn phí tháng này. Nâng cấp Premium để phân tích
              không giới hạn (mở trong Cài đặt → Gói).
            </p>
          </div>
        )}

        <Button fullWidth size="lg" onClick={generate} disabled={busy || !stats}>
          <Sparkles size={17} />
          {busy ? 'Đang phân tích…' : insight ? 'Phân tích lại' : 'Tạo phân tích'}
        </Button>

        {!isPremium && remaining !== null && (
          <p className="text-[11px] text-faint text-center">
            Miễn phí — còn {remaining} lượt phân tích AI tháng này. Premium dùng không giới hạn.
          </p>
        )}
      </div>
    </Sheet>
  )
}
