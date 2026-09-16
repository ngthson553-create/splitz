import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Check, ChevronRight, Loader2, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react'
import { Avatar, Button, Field, Input } from '../../components/ui'
import { BankFields, type BankValue } from '../../components/BankFields'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../components/Toast'
import { fileToAvatarDataUrl } from '../../lib/image'
import { trackEvent } from '../../lib/analytics'

type Step = 'consent' | 'name' | 'bank' | 'tour'
const ORDER: Step[] = ['consent', 'name', 'bank', 'tour']

export function OnboardingScreen() {
  const { profile, completeOnboarding } = useAuth()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('consent')
  const [name, setName] = useState(profile?.displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatarUrl)
  const [bank, setBank] = useState<BankValue>({
    bankCode: profile?.bankCode ?? '',
    accountNumber: profile?.bankAccountNumber ?? '',
    accountName: profile?.bankAccountName ?? '',
  })
  const [saving, setSaving] = useState(false)

  const idx = ORDER.indexOf(step)

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setAvatarUrl(await fileToAvatarDataUrl(file))
    } catch {
      toast.error('Không xử lý được ảnh.')
    }
  }

  function next() {
    if (step === 'name' && !name.trim()) {
      toast.error('Nhập tên hiển thị của bạn.')
      return
    }
    if (step === 'bank') {
      if (!bank.bankCode || !bank.accountNumber.trim() || !bank.accountName.trim()) {
        toast.error('Cấu hình đủ thông tin ngân hàng để người khác chuyển tiền cho bạn.')
        return
      }
    }
    setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)])
  }

  async function finish() {
    setSaving(true)
    try {
      await completeOnboarding({
        displayName: name,
        avatarUrl,
        bankCode: bank.bankCode,
        bankAccountNumber: bank.accountNumber,
        bankAccountName: bank.accountName,
      })
      trackEvent('onboarding_completed', { has_bank: Boolean(bank.bankCode && bank.accountNumber) })
      // ready chuyển true → guard tự điều hướng vào app.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được hồ sơ.')
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col">
      <div className="app-aurora" />
      <div className="relative flex-1 flex flex-col max-w-md mx-auto w-full px-6 py-8">
        {/* Tiến độ */}
        <div className="flex gap-1.5 mb-8">
          {ORDER.map((s, i) => (
            <span
              key={s}
              className={
                'h-1.5 flex-1 rounded-full transition-colors ' +
                (i <= idx ? 'gradient-brand' : 'bg-[var(--surface-2)]')
              }
            />
          ))}
        </div>

        <div className="flex-1">
          {step === 'consent' && <ConsentStep />}
          {step === 'name' && (
            <NameStep
              name={name}
              setName={setName}
              avatarUrl={avatarUrl}
              onPickAvatar={() => fileRef.current?.click()}
            />
          )}
          {step === 'bank' && (
            <div className="space-y-5">
              <StepHead
                icon={<Wallet size={28} />}
                title="Tài khoản nhận tiền"
                desc="Bắt buộc — để bạn bè tạo QR chuyển khoản cho bạn ngay trong nhóm. Có thể quét QR ngân hàng để điền nhanh."
              />
              <BankFields value={bank} onChange={setBank} onScanError={(m) => toast.error(m)} />
            </div>
          )}
          {step === 'tour' && <TourStep />}
        </div>

        <div className="pt-6">
          {step === 'tour' ? (
            <Button fullWidth size="lg" onClick={finish} disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Bắt đầu dùng Splitz
            </Button>
          ) : (
            <Button fullWidth size="lg" onClick={next}>
              {step === 'consent' ? 'Tôi đồng ý & tiếp tục' : 'Tiếp tục'}
              <ChevronRight size={18} />
            </Button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
      </div>
    </div>
  )
}

function StepHead({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <div className="mb-2">
      <div className="grid place-items-center h-14 w-14 rounded-2xl gradient-brand text-white shadow-glow mb-4">
        {icon}
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight text-app">{title}</h2>
      <p className="mt-1.5 text-sm text-muted">{desc}</p>
    </div>
  )
}

function ConsentStep() {
  return (
    <div className="space-y-5">
      <StepHead
        icon={<ShieldCheck size={28} />}
        title="Chào mừng đến Splitz"
        desc="Trước khi bắt đầu, vui lòng đọc và đồng ý với các điều khoản của chúng tôi."
      />
      <div className="card p-4 space-y-3 text-sm text-muted">
        <p>
          Khi nhấn "Tôi đồng ý", bạn xác nhận đã đọc và chấp thuận{' '}
          <Link to="/terms" className="text-brand-600 dark:text-brand-300 font-semibold underline">
            Điều khoản sử dụng
          </Link>{' '}
          và{' '}
          <Link to="/privacy" className="text-brand-600 dark:text-brand-300 font-semibold underline">
            Chính sách bảo mật
          </Link>
          .
        </p>
        <p className="text-xs text-faint">
          Splitz là công cụ ghi chép và tính toán chia tiền. Splitz không giữ tiền và không xử lý
          thanh toán — mọi giao dịch chuyển khoản do bạn tự thực hiện qua ngân hàng.
        </p>
      </div>
    </div>
  )
}

function NameStep({
  name,
  setName,
  avatarUrl,
  onPickAvatar,
}: {
  name: string
  setName: (v: string) => void
  avatarUrl?: string
  onPickAvatar: () => void
}) {
  return (
    <div className="space-y-5">
      <StepHead
        icon={<Sparkles size={28} />}
        title="Bạn tên là gì?"
        desc="Tên này hiển thị với các thành viên khác trong nhóm. Bạn có thể đổi sau."
      />
      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={onPickAvatar} className="press relative">
          <Avatar name={name || '?'} color="indigo" size="lg" src={avatarUrl} className="h-20 w-20 text-2xl" />
          <span className="absolute -bottom-1 -right-1 grid place-items-center h-7 w-7 rounded-full gradient-brand text-white shadow-soft">
            <Camera size={14} />
          </span>
        </button>
      </div>
      <Field label="Tên hiển thị">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyễn Văn A" autoFocus />
      </Field>
    </div>
  )
}

function TourStep() {
  const items = [
    { icon: <Users size={20} />, title: 'Tạo nhóm & mời bạn bè', desc: 'Qua link, mã nhóm hoặc thêm thành viên thủ công.' },
    { icon: <Wallet size={20} />, title: 'Ghi chi & chia tự động', desc: 'Chia đều, theo phần, phần trăm hoặc theo món.' },
    { icon: <Sparkles size={20} />, title: 'Rút gọn công nợ & QR', desc: 'Tối thiểu số lượt chuyển, tạo QR thanh toán tức thì.' },
  ]
  return (
    <div className="space-y-5">
      <StepHead
        icon={<Check size={28} />}
        title="Sẵn sàng rồi!"
        desc="Vài điều Splitz có thể giúp bạn:"
      />
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.title} className="card p-4 flex items-start gap-3">
            <div className="grid place-items-center h-10 w-10 rounded-xl gradient-brand-soft text-white shrink-0">
              {it.icon}
            </div>
            <div>
              <p className="font-bold text-app text-sm">{it.title}</p>
              <p className="text-xs text-muted mt-0.5">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
