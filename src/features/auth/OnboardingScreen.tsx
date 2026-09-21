import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Check, ChevronRight, Loader2, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react'
import { Avatar, Button, Field, Input } from '../../components/ui'
import { BankFields, type BankValue } from '../../components/BankFields'
import { useAuth } from '../../lib/auth'
import { useT } from '../../lib/i18n'
import { useToast } from '../../components/Toast'
import { fileToAvatarDataUrl } from '../../lib/image'
import { trackEvent } from '../../lib/analytics'

type Step = 'consent' | 'name' | 'bank' | 'tour'
const ORDER: Step[] = ['consent', 'name', 'bank', 'tour']

export function OnboardingScreen() {
  const { profile, completeOnboarding } = useAuth()
  const toast = useToast()
  const t = useT()
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
      toast.error(t.auth.avatarError)
    }
  }

  function next() {
    if (step === 'name' && !name.trim()) {
      toast.error(t.auth.nameRequired)
      return
    }
    if (step === 'bank') {
      if (!bank.bankCode || !bank.accountNumber.trim() || !bank.accountName.trim()) {
        toast.error(t.auth.bankRequired)
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
      toast.error(e instanceof Error ? e.message : t.auth.profileSaveFailed)
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
                title={t.auth.bankTitle}
                desc={t.auth.bankDesc}
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
              {t.auth.startButton}
            </Button>
          ) : (
            <Button fullWidth size="lg" onClick={next}>
              {step === 'consent' ? t.auth.agreeContinue : t.auth.continueLabel}
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
  const t = useT()
  return (
    <div className="space-y-5">
      <StepHead
        icon={<ShieldCheck size={28} />}
        title={t.auth.welcomeTitle}
        desc={t.auth.welcomeDesc}
      />
      <div className="card p-4 space-y-3 text-sm text-muted">
        <p>
          {t.auth.consentPrefix}{' '}
          <Link to="/terms" className="text-brand-600 dark:text-brand-300 font-semibold underline">
            {t.auth.termsLink}
          </Link>{' '}
          {t.auth.consentAnd}{' '}
          <Link to="/privacy" className="text-brand-600 dark:text-brand-300 font-semibold underline">
            {t.auth.privacyLink}
          </Link>
          .
        </p>
        <p className="text-xs text-faint">{t.auth.consentDisclaimer}</p>
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
  const t = useT()
  return (
    <div className="space-y-5">
      <StepHead
        icon={<Sparkles size={28} />}
        title={t.auth.nameTitle}
        desc={t.auth.nameDesc}
      />
      <div className="flex flex-col items-center gap-3">
        <button type="button" onClick={onPickAvatar} className="press relative">
          <Avatar name={name || '?'} color="indigo" size="lg" src={avatarUrl} className="h-20 w-20 text-2xl" />
          <span className="absolute -bottom-1 -right-1 grid place-items-center h-7 w-7 rounded-full gradient-brand text-white shadow-soft">
            <Camera size={14} />
          </span>
        </button>
      </div>
      <Field label={t.auth.displayNameLabel}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.auth.namePlaceholder} autoFocus />
      </Field>
    </div>
  )
}

function TourStep() {
  const t = useT()
  const items = [
    { icon: <Users size={20} />, title: t.auth.tour1Title, desc: t.auth.tour1Desc },
    { icon: <Wallet size={20} />, title: t.auth.tour2Title, desc: t.auth.tour2Desc },
    { icon: <Sparkles size={20} />, title: t.auth.tour3Title, desc: t.auth.tour3Desc },
  ]
  return (
    <div className="space-y-5">
      <StepHead
        icon={<Check size={28} />}
        title={t.auth.readyTitle}
        desc={t.auth.readyDesc}
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
