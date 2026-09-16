import { useEffect, useState, type ReactNode } from 'react'
import {
  Bell,
  ChevronRight,
  Crown,
  HelpCircle,
  Info,
  LogIn,
  Moon,
  Palette,
  Shield,
  Sun,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../lib/theme'
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
  const isCloud = mode === 'cloud'

  return (
    <PageTransition>
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 space-y-5">
        <header>
          <h1 className="text-xl font-extrabold tracking-tight">Cài đặt</h1>
        </header>

        {/* Thẻ hồ sơ — bấm vào để chỉnh */}
        <button
          onClick={() => navigate('/settings/profile')}
          className="card press hover-lift w-full p-4 flex items-center gap-3 text-left"
        >
          <Avatar name={profile.name || '?'} color="indigo" size="lg" src={profile.avatarUrl} />
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate">{profile.name || 'Chưa đặt tên'}</p>
            <p className="text-sm text-muted truncate">
              {isCloud ? (session?.user.email ?? 'Tài khoản cloud') : 'Hồ sơ cục bộ'}
            </p>
          </div>
          <ChevronRight size={18} className="text-faint shrink-0" />
        </button>

        {/* Tài khoản & gói */}
        {isCloud ? (
          <Section title="Tài khoản">
            <NavRow icon={<Wallet size={18} />} label="Tài khoản nhận tiền" to="/settings/bank" />
            <PlanRow />
            <NotificationRow />
          </Section>
        ) : (
          <Section title="Tài khoản">
            <Card className="flex items-center gap-3 rounded-none border-0 shadow-none p-3.5">
              <span className="grid place-items-center h-9 w-9 rounded-xl gradient-brand-soft text-white shadow-soft shrink-0">
                <LogIn size={17} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Đăng nhập</p>
                <p className="text-xs text-muted">Google · Zalo — đồng bộ nhiều thiết bị</p>
              </div>
              <Badge tone="muted">Chưa bật</Badge>
            </Card>
          </Section>
        )}

        {/* Ứng dụng */}
        <Section title="Ứng dụng">
          <ThemeRow />
          <NavRow icon={<Palette size={18} />} label="Giao diện" to="/settings/appearance" />
          <NavRow icon={<Shield size={18} />} label="Dữ liệu & lưu trữ" to="/settings/data" />
        </Section>

        {/* Hỗ trợ & pháp lý */}
        <Section title="Hỗ trợ & pháp lý">
          <NavRow icon={<HelpCircle size={18} />} label="Hỏi đáp" to="/faq" />
          <NavRow icon={<Shield size={18} />} label="Điều khoản sử dụng" to="/terms" />
          <NavRow icon={<Shield size={18} />} label="Chính sách bảo mật" to="/privacy" />
        </Section>

        <p className="text-center text-xs text-faint flex items-center justify-center gap-1.5 pt-1">
          <Info size={13} /> Splitz v0.1 · Chia tiền nhóm sòng phẳng
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
          <p className="font-semibold text-sm">Gói {PLAN_LABEL[info.plan]}</p>
          <p className="text-xs text-muted truncate">
            {expiringSoon
              ? `Sắp hết hạn trong ${daysLeft} ngày`
              : isPremium
                ? info.periodEnd
                  ? `Hết hạn ${new Date(info.periodEnd).toLocaleDateString('vi-VN')}`
                  : 'Đang kích hoạt'
                : `${info.groupCount}/${info.maxGroups ?? '∞'} nhóm · ${info.maxMembers} thành viên`}
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
        toast.success('Đã tắt thông báo đẩy')
      } else {
        await enablePush()
        setEnabled(true)
        toast.success('Đã bật thông báo đẩy')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không đổi được thông báo.')
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
        <p className="font-semibold text-sm">Thông báo đẩy</p>
        <p className="text-xs text-muted">Nhắc gia hạn gói, hoạt động nhóm</p>
      </div>
      <button
        onClick={toggle}
        disabled={busy}
        aria-label="Bật/tắt thông báo"
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
  return (
    <div className="w-full flex items-center gap-3 p-3.5">
      <span className="grid place-items-center h-9 w-9 rounded-xl surface-sunken text-brand-600 dark:text-brand-300 shrink-0">
        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Chế độ {theme === 'dark' ? 'Tối' : 'Sáng'}</p>
        <p className="text-xs text-muted">Chạm để chuyển nhanh</p>
      </div>
      <button
        onClick={toggle}
        aria-label="Chuyển chế độ sáng tối"
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
