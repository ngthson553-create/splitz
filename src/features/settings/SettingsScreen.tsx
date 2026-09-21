import { useEffect, useState, type ReactNode } from 'react'
import {
  Bell,
  ChevronRight,
  Crown,
  HelpCircle,
  Info,
  Languages,
  LogIn,
  Moon,
  Palette,
  Shield,
  Sun,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../lib/theme'
import { useT } from '../../lib/i18n'
import { formatDate } from '../../lib/format'
import { useStore } from '../../lib/store'
import { useProfile } from '../../lib/profile'
import { useAuth } from '../../lib/auth'
import { useSubscription, PLAN_LABEL } from '../../lib/subscription'
import { PlanSheet } from './PlanSheet'
import { isPushConfigured, isPushEnabled, enablePush, disablePush } from '../../lib/webpush'
import { Avatar, Badge, Card } from '../../components/ui'
import { PageTransition } from '../../components/PageTransition'
import { useToast } from '../../components/Toast'

export function SettingsScreen() {
  const { mode } = useStore()
  const { profile } = useProfile()
  const { session } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const isCloud = mode === 'cloud'

  return (
    <PageTransition>
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 space-y-5">
        <header>
          <h1 className="text-xl font-extrabold tracking-tight">{t.settings.title}</h1>
        </header>

        {/* Thẻ hồ sơ — bấm vào để chỉnh */}
        <button
          onClick={() => navigate('/settings/profile')}
          className="card press hover-lift w-full p-4 flex items-center gap-3 text-left"
        >
          <Avatar name={profile.name || '?'} color="indigo" size="lg" src={profile.avatarUrl} />
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{profile.name || t.settings.unnamed}</p>
            <p className="text-sm text-muted truncate">
              {isCloud ? (session?.user.email ?? t.settings.cloudAccount) : t.settings.localProfile}
            </p>
          </div>
          <ChevronRight size={18} className="text-faint shrink-0" />
        </button>

        {/* Tài khoản & gói */}
        {isCloud ? (
          <Section title={t.settings.sectionAccount}>
            <NavRow icon={<Wallet size={18} />} label={t.settings.bankAccount} to="/settings/bank" />
            <PlanRow />
            <NotificationRow />
          </Section>
        ) : (
          <Section title={t.settings.sectionAccount}>
            <Card className="flex items-center gap-3 rounded-none border-0 shadow-none p-3.5">
              <span className="grid place-items-center h-9 w-9 rounded-xl gradient-brand-soft text-white shadow-soft shrink-0">
                <LogIn size={17} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.settings.signIn}</p>
                <p className="text-xs text-muted">{t.settings.signInHint}</p>
              </div>
              <Badge tone="muted">{t.settings.notEnabled}</Badge>
            </Card>
          </Section>
        )}

        {/* Ứng dụng */}
        <Section title={t.settings.sectionApp}>
          <ThemeRow />
          <NavRow icon={<Palette size={18} />} label={t.settings.appearance} to="/settings/appearance" />
          <NavRow icon={<Languages size={18} />} label={t.settings.language} to="/settings/language" />
          <NavRow icon={<Shield size={18} />} label={t.settings.data} to="/settings/data" />
        </Section>

        {/* Hỗ trợ & pháp lý */}
        <Section title={t.settings.sectionSupport}>
          <NavRow icon={<HelpCircle size={18} />} label={t.settings.faq} to="/faq" />
          <NavRow icon={<Shield size={18} />} label={t.settings.terms} to="/terms" />
          <NavRow icon={<Shield size={18} />} label={t.settings.privacy} to="/privacy" />
        </Section>

        <p className="text-center text-xs text-faint flex items-center justify-center gap-1.5 pt-1">
          <Info size={13} /> {t.settings.tagline}
        </p>
      </div>
    </PageTransition>
  )
}

// ── Khối mục có tiêu đề ──
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-faint px-1">{title}</h2>
      <Card className="p-0 overflow-hidden divide-y divide-[var(--border)]">{children}</Card>
    </section>
  )
}

// ── Dòng điều hướng ──
function NavRow({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="press w-full flex items-center gap-3 p-3.5 text-left hover:bg-[var(--surface-2)]"
    >
      <span className="grid place-items-center h-9 w-9 rounded-xl surface-sunken text-brand-600 dark:text-brand-300 shrink-0">
        {icon}
      </span>
      <span className="flex-1 font-semibold text-sm">{label}</span>
      <ChevronRight size={16} className="text-faint" />
    </button>
  )
}

// ── Dòng gói (mở PlanSheet) ──
function PlanRow() {
  const { info, isPremium, expiringSoon, daysLeft } = useSubscription()
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="press w-full flex items-center gap-3 p-3.5 text-left hover:bg-[var(--surface-2)]"
      >
        <span className="grid place-items-center h-9 w-9 rounded-xl gradient-brand text-white shadow-soft shrink-0">
          <Crown size={17} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{t.settings.planLabel({ plan: PLAN_LABEL[info.plan] })}</p>
          <p className="text-xs text-muted truncate">
            {expiringSoon
              ? t.settings.expiringInDays({ n: daysLeft ?? 0 })
              : isPremium
                ? info.periodEnd
                  ? t.settings.expiresOn({ date: formatDate(info.periodEnd) })
                  : t.settings.planActive
                : t.settings.quotaLine({
                    groups: `${info.groupCount}/${info.maxGroups ?? '∞'}`,
                    members: String(info.maxMembers),
                  })}
          </p>
        </div>
        <Badge tone={expiringSoon ? 'neg' : isPremium ? 'pos' : 'muted'}>
          {isPremium ? 'Premium' : 'Free'}
        </Badge>
      </button>
      <PlanSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

// ── Dòng thông báo đẩy (toggle inline) ──
function NotificationRow() {
  const toast = useToast()
  const t = useT()
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void isPushEnabled().then(setEnabled)
  }, [])
  if (!isPushConfigured) return null

  async function toggle() {
    setBusy(true)
    try {
      if (enabled) {
        await disablePush()
        setEnabled(false)
        toast.success(t.settings.pushDisabledToast)
      } else {
        await enablePush()
        setEnabled(true)
        toast.success(t.settings.pushEnabledToast)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.settings.pushToggleFailed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full flex items-center gap-3 p-3.5">
      <span className="grid place-items-center h-9 w-9 rounded-xl surface-sunken text-brand-600 dark:text-brand-300 shrink-0">
        <Bell size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{t.settings.pushTitle}</p>
        <p className="text-xs text-muted">{t.settings.pushDesc}</p>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={t.settings.pushToggleAria}
        className="press relative h-8 w-14 rounded-full surface-sunken border border-[var(--border)] disabled:opacity-50 shrink-0"
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full gradient-brand shadow-soft transition-all ${
            enabled ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

// ── Dòng chuyển nhanh sáng/tối (toggle inline) ──
function ThemeRow() {
  const { theme, toggle } = useTheme()
  const t = useT()
  return (
    <div className="w-full flex items-center gap-3 p-3.5">
      <span className="grid place-items-center h-9 w-9 rounded-xl surface-sunken text-brand-600 dark:text-brand-300 shrink-0">
        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">
          {t.settings.themeMode({ mode: theme === 'dark' ? t.settings.themeDark : t.settings.themeLight })}
        </p>
        <p className="text-xs text-muted">{t.settings.themeQuickToggle}</p>
      </div>
      <button
        onClick={toggle}
        aria-label={t.settings.themeToggleAria}
        className="press relative h-8 w-14 rounded-full surface-sunken border border-[var(--border)] shrink-0"
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full gradient-brand shadow-soft transition-all ${
            theme === 'dark' ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}
