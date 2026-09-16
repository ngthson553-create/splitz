import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { ArrowLeft, Camera, Cloud, Crown, HardDrive, Lock, LogOut, Moon, Shield, Sun, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../lib/theme'
import { useStore } from '../../lib/store'
import { useProfile } from '../../lib/profile'
import { useAuth } from '../../lib/auth'
import { useSubscription } from '../../lib/subscription'
import { BankFields, type BankValue } from '../../components/BankFields'
import { Avatar, Badge, Button, Card, Field, Input } from '../../components/ui'
import { PageTransition } from '../../components/PageTransition'
import { useConfirm } from '../../components/ConfirmDialog'
import { useToast } from '../../components/Toast'
import { fileToAvatarDataUrl } from '../../lib/image'

// ── Shell chung cho các trang con Cài đặt ──
function SettingsShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <PageTransition>
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-24 space-y-5">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            aria-label="Quay lại"
            className="press grid place-items-center h-10 w-10 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-muted hover:text-app"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        </header>
        {children}
      </div>
    </PageTransition>
  )
}

// ── Hồ sơ: avatar + tên + (cloud) email + đăng xuất ──
export function ProfileSettingsScreen() {
  const { mode } = useStore()
  const { profile, setName, setAvatar } = useProfile()
  const auth = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [nameDraft, setNameDraft] = useState(profile.name)
  useEffect(() => setNameDraft(profile.name), [profile.name])

  const isCloud = mode === 'cloud'

  function saveName() {
    setName(nameDraft)
    toast.success('Đã lưu hồ sơ')
  }

  async function onPickAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Vui lòng chọn tệp ảnh')
    try {
      const url = await fileToAvatarDataUrl(file)
      setAvatar(url)
      toast.success('Đã cập nhật ảnh đại diện')
    } catch {
      toast.error('Không xử lý được ảnh')
    }
  }

  async function doSignOut() {
    const ok = await confirm({
      title: 'Đăng xuất?',
      description: 'Bạn sẽ cần đăng nhập lại để tiếp tục dùng Splitz.',
      confirmLabel: 'Đăng xuất',
      danger: true,
    })
    if (!ok) return
    await auth.signOut()
  }

  return (
    <SettingsShell title="Hồ sơ">
      <Card className="flex flex-col items-center text-center gap-3 py-6">
        <button onClick={() => fileRef.current?.click()} className="press relative" aria-label="Đổi ảnh đại diện">
          <Avatar name={nameDraft || '?'} color="indigo" size="lg" src={profile.avatarUrl} className="!h-20 !w-20 !text-2xl" />
          <span className="absolute -bottom-1 -right-1 grid place-items-center h-7 w-7 rounded-full gradient-brand text-white ring-2 ring-[var(--surface-solid)]">
            <Camera size={14} />
          </span>
        </button>
        {profile.avatarUrl && (
          <button
            onClick={() => {
              setAvatar(undefined)
              toast.success('Đã gỡ ảnh đại diện')
            }}
            className="press inline-flex items-center gap-1 text-xs text-faint hover:text-neg"
          >
            <X size={13} /> Gỡ ảnh
          </button>
        )}
        {isCloud && auth.session?.user.email && (
          <p className="text-sm text-muted">{auth.session.user.email}</p>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
      </Card>

      <Card>
        <Field label="Tên hiển thị" hint="Tên này hiển thị cho các thành viên trong nhóm của bạn.">
          <div className="flex gap-2">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Nhập tên của bạn"
            />
            <Button onClick={saveName} disabled={nameDraft.trim() === profile.name}>
              Lưu
            </Button>
          </div>
        </Field>
      </Card>

      {isCloud && (
        <Button variant="secondary" fullWidth onClick={doSignOut}>
          <LogOut size={16} /> Đăng xuất
        </Button>
      )}
    </SettingsShell>
  )
}

// ── Tài khoản nhận tiền (cloud) ──
export function BankSettingsScreen() {
  const { mode } = useStore()
  const { profile, updateProfile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [bank, setBank] = useState<BankValue>({ bankCode: '', accountNumber: '', accountName: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setBank({
        bankCode: profile.bankCode ?? '',
        accountNumber: profile.bankAccountNumber ?? '',
        accountName: profile.bankAccountName ?? '',
      })
    }
  }, [profile])

  useEffect(() => {
    if (mode !== 'cloud') navigate('/settings', { replace: true })
  }, [mode, navigate])

  const changed =
    bank.bankCode !== (profile?.bankCode ?? '') ||
    bank.accountNumber !== (profile?.bankAccountNumber ?? '') ||
    bank.accountName !== (profile?.bankAccountName ?? '')

  async function save() {
    if (!bank.bankCode || !bank.accountNumber.trim() || !bank.accountName.trim()) {
      toast.error('Điền đủ thông tin ngân hàng.')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        bankCode: bank.bankCode,
        bankAccountNumber: bank.accountNumber,
        bankAccountName: bank.accountName,
      })
      toast.success('Đã lưu tài khoản nhận tiền')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsShell title="Tài khoản nhận tiền">
      <Card className="space-y-3">
        <p className="text-sm text-muted">
          Thông tin này để các thành viên cùng nhóm tạo mã QR chuyển khoản cho bạn.
        </p>
        <BankFields value={bank} onChange={setBank} onScanError={(m) => toast.error(m)} />
        <Button fullWidth onClick={save} disabled={!changed || saving}>
          Lưu tài khoản
        </Button>
      </Card>
    </SettingsShell>
  )
}

// ── Giao diện ──
export function AppearanceSettingsScreen() {
  const { theme, setTheme, toggle } = useTheme()
  const { isPremium } = useSubscription()
  const toast = useToast()

  function pickPrestige() {
    if (!isPremium) {
      toast.error('Giao diện Prestige chỉ dành cho thành viên Premium.')
      return
    }
    setTheme('prestige')
  }

  return (
    <SettingsShell title="Giao diện">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-10 w-10 rounded-xl gradient-brand-soft text-white shadow-soft">
              {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            </div>
            <div>
              <p className="font-bold">
                {theme === 'prestige' ? 'Prestige' : theme === 'dark' ? 'Tối' : 'Sáng'}
              </p>
              <p className="text-sm text-muted">Chọn phong cách hiển thị</p>
            </div>
          </div>
          {theme !== 'prestige' && (
            <button
              onClick={toggle}
              aria-label="Chuyển chế độ sáng tối"
              className="press relative h-8 w-14 rounded-full surface-sunken border border-[var(--border)]"
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full gradient-brand shadow-soft transition-all ${
                  theme === 'dark' ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <ThemeSwatch label="Sáng" active={theme === 'light'} onClick={() => setTheme('light')}>
            <div className="h-12 rounded-lg bg-gradient-to-br from-[#eaf1ff] to-[#c7dbff] border border-black/5" />
          </ThemeSwatch>
          <ThemeSwatch label="Tối" active={theme === 'dark'} onClick={() => setTheme('dark')}>
            <div className="h-12 rounded-lg bg-gradient-to-br from-[#16235c] to-[#070b1a] border border-white/10" />
          </ThemeSwatch>
          <ThemeSwatch
            label="Prestige"
            active={theme === 'prestige'}
            locked={!isPremium}
            onClick={pickPrestige}
          >
            <div
              className="relative h-12 rounded-lg border border-[#e8c87a]/50 grid place-items-center overflow-hidden"
              style={{
                background:
                  'linear-gradient(180deg, rgba(232,200,122,0.12), transparent 45%), linear-gradient(140deg, #2b220f, #120f09 60%, #08070a)',
                boxShadow: 'inset 0 1px 0 rgba(255,246,214,0.25)',
              }}
            >
              <span
                className="grid place-items-center h-7 w-7 rounded-full"
                style={{ background: 'linear-gradient(135deg, #8a6a22, #fff4cf 45%, #d9b462)' }}
              >
                <Crown size={14} className="text-[#1a1408]" />
              </span>
            </div>
          </ThemeSwatch>
        </div>

        {!isPremium && (
          <p className="text-xs text-faint flex items-center gap-1.5">
            <Lock size={12} /> Giao diện Prestige (thẻ đen · viền vàng) dành riêng cho Premium.
          </p>
        )}
      </Card>
    </SettingsShell>
  )
}

function ThemeSwatch({
  label,
  active,
  locked,
  onClick,
  children,
}: {
  label: string
  active: boolean
  locked?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`press rounded-xl p-2 border text-center transition ${
        active ? 'border-brand-400 ring-2 ring-brand-400/30' : 'border-[var(--border)]'
      }`}
    >
      <div className="relative">
        {children}
        {locked && (
          <span className="absolute top-1 right-1 grid place-items-center h-5 w-5 rounded-full bg-black/55 text-[#e3c578]">
            <Lock size={11} />
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold mt-1.5">{label}</p>
    </button>
  )
}

// ── Dữ liệu & lưu trữ ──
export function DataSettingsScreen() {
  const { mode, groups, reload } = useStore()
  const confirm = useConfirm()
  const toast = useToast()

  async function clearLocal() {
    if (mode !== 'local') return
    const ok = await confirm({
      title: 'Xoá toàn bộ dữ liệu?',
      description: 'Mọi nhóm trên máy này sẽ bị xoá. Hành động không thể hoàn tác.',
      confirmLabel: 'Xoá hết',
      danger: true,
    })
    if (!ok) return
    localStorage.removeItem('splitz.groups.v1')
    await reload()
    toast.success('Đã xoá dữ liệu trên máy')
  }

  return (
    <SettingsShell title="Dữ liệu & lưu trữ">
      <Card className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center h-10 w-10 rounded-xl surface-sunken text-brand-600 dark:text-brand-300">
            {mode === 'cloud' ? <Cloud size={18} /> : <HardDrive size={18} />}
          </div>
          <div className="flex-1">
            <p className="font-bold">{mode === 'cloud' ? 'Đồng bộ cloud' : 'Lưu trên thiết bị'}</p>
            <p className="text-sm text-muted">
              {mode === 'cloud' ? 'Dữ liệu đồng bộ qua Supabase' : `Đang lưu ${groups.length} nhóm trên trình duyệt`}
            </p>
          </div>
          <Badge tone={mode === 'cloud' ? 'pos' : 'muted'}>{mode === 'cloud' ? 'Cloud' : 'Local'}</Badge>
        </div>
        {mode === 'local' && (
          <>
            <p className="text-xs text-faint">Đăng nhập (sắp có) để đồng bộ nhiều thiết bị.</p>
            <Button variant="danger" size="sm" onClick={clearLocal} disabled={groups.length === 0}>
              <Trash2 size={16} /> Xoá dữ liệu trên máy
            </Button>
          </>
        )}
      </Card>

      <Card className="space-y-2.5">
        <div className="flex items-center gap-2 font-bold">
          <Shield size={18} className="text-brand-600 dark:text-brand-300" /> Minh bạch & an toàn
        </div>
        <p className="text-sm text-muted">
          Splitz không giữ tiền, không làm trung gian thanh toán. Mã QR được tạo trực tiếp từ thông tin tài khoản người nhận. Luôn kiểm tra tên người nhận trong app ngân hàng trước khi chuyển.
        </p>
      </Card>
    </SettingsShell>
  )
}
