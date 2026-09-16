import { useState } from 'react'
import { Check, Crown, Loader2, Ticket, Users } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Button, Field, Input, Segmented } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useSubscription, PLAN_LABEL } from '../../lib/subscription'
import { createPayosLink, redeemCode } from '../../lib/data/billing'
import { trackEvent } from '../../lib/analytics'

const PRICES = {
  personal: { month: 14000, year: 99000 },
  team: { month: 49000, year: 399000 },
}
const FEATURES = ['Không giới hạn nhóm', 'Tối đa 25 thành viên/nhóm', 'AI nhập chi không giới hạn', 'Xuất PDF, đa tiền tệ']

export function PlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const { info, reload } = useSubscription()
  const [cycle, setCycle] = useState<'month' | 'year'>('year')
  const [plan, setPlan] = useState<'personal' | 'team'>('personal')
  const [paying, setPaying] = useState(false)
  const [code, setCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  async function pay() {
    setPaying(true)
    trackEvent('subscription_checkout_started', { plan, cycle, price_vnd: price })
    try {
      const url = await createPayosLink(plan, cycle)
      window.location.assign(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tạo được thanh toán.')
      setPaying(false)
    }
  }

  async function onRedeem() {
    if (!code.trim()) return
    setRedeeming(true)
    try {
      const granted = await redeemCode(code.trim())
      trackEvent('promo_code_redeemed', { granted_plan: granted })
      await reload()
      toast.success(`Đã kích hoạt gói ${PLAN_LABEL[granted as 'personal' | 'team'] ?? granted}`)
      setCode('')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mã không hợp lệ.')
    } finally {
      setRedeeming(false)
    }
  }

  const price = PRICES[plan][cycle]

  return (
    <Sheet open={open} onClose={onClose} title="Nâng cấp Premium">
      <div className="space-y-5 py-1">
        <div className="text-center">
          <div className="grid place-items-center h-14 w-14 mx-auto rounded-2xl gradient-brand text-white shadow-glow mb-2">
            <Crown size={26} />
          </div>
          <p className="text-sm text-muted">
            Gói hiện tại: <span className="font-bold text-app">{PLAN_LABEL[info.plan]}</span>
          </p>
        </div>

        <Segmented<'personal' | 'team'>
          value={plan}
          onChange={setPlan}
          options={[
            { value: 'personal', label: 'Cá nhân' },
            { value: 'team', label: (<span className="inline-flex items-center gap-1"><Users size={13} /> Team</span>) },
          ]}
        />
        <Segmented<'month' | 'year'>
          value={cycle}
          onChange={setCycle}
          options={[
            { value: 'month', label: 'Tháng' },
            { value: 'year', label: 'Năm (rẻ hơn)' },
          ]}
        />

        <div className="card p-4 space-y-2">
          <p className="text-center text-3xl font-extrabold text-gradient tnum">
            {price.toLocaleString('vi-VN')}đ
            <span className="text-sm text-muted font-semibold">/{cycle === 'month' ? 'tháng' : 'năm'}</span>
          </p>
          <ul className="space-y-1.5 pt-1">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check size={15} className="text-pos shrink-0" /> {f}
              </li>
            ))}
            {plan === 'team' && (
              <li className="flex items-center gap-2 text-sm">
                <Check size={15} className="text-pos shrink-0" /> 5 ghế premium cho cả nhóm
              </li>
            )}
          </ul>
        </div>

        <Button fullWidth size="lg" onClick={pay} disabled={paying}>
          {paying ? <Loader2 size={18} className="animate-spin" /> : null}
          Thanh toán qua PayOS
        </Button>

        <div className="pt-2 border-t border-[var(--border)]">
          <Field label="Có mã kích hoạt?">
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã"
              />
              <Button variant="secondary" onClick={onRedeem} disabled={!code.trim() || redeeming}>
                {redeeming ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
                Kích hoạt
              </Button>
            </div>
          </Field>
        </div>

        <p className="text-xs text-faint text-center">
          Thanh toán xử lý qua PayOS. Gói gia hạn bán tự động — bạn chủ động thanh toán mỗi chu kỳ.
        </p>
      </div>
    </Sheet>
  )
}
