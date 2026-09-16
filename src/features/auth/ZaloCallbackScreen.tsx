import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Button, Field, Input } from '../../components/ui'
import { useToast } from '../../components/Toast'
import {
  applySession,
  completeGoogleLink,
  exchangeZaloCode,
  fetchZaloProfile,
  hasPendingGoogleLink,
  initZaloLogin,
  linkZaloViaGoogle,
  sendZaloEmailOtp,
  verifyZaloOtp,
} from '../../lib/zalo'

type Phase = 'working' | 'need_email' | 'otp' | 'error'

export function ZaloCallbackScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const ran = useRef(false)

  const [phase, setPhase] = useState<Phase>('working')
  const [errorMsg, setErrorMsg] = useState('')
  const [zaloToken, setZaloToken] = useState('')
  const [email, setEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    // Quay về sau khi đăng nhập Google (liên kết lần đầu, khỏi OTP).
    if (params.get('zalolink') === '1' && hasPendingGoogleLink()) {
      ;(async () => {
        try {
          await completeGoogleLink()
          navigate('/', { replace: true })
        } catch (e) {
          setPhase('error')
          setErrorMsg(e instanceof Error ? e.message : 'Liên kết Google thất bại.')
        }
      })()
      return
    }

    const code = params.get('code')
    const state = params.get('state') ?? ''
    const oauthError = params.get('error')

    if (oauthError || !code) {
      setPhase('error')
      setErrorMsg('Bạn đã huỷ hoặc Zalo không trả mã đăng nhập.')
      return
    }

    ;(async () => {
      try {
        // 1) Edge đổi code → access_token
        const accessToken = await exchangeZaloCode(code, state)
        // 2) CLIENT (IP VN) gọi /me lấy id/name/avatar
        const profile = await fetchZaloProfile(accessToken)
        // 3) Edge quyết định: cần email hay đã liên kết → tự gửi OTP
        const res = await initZaloLogin(profile)
        setZaloToken(res.zaloToken)
        if (res.status === 'otp') {
          setMaskedEmail(res.email)
          setPhase('otp')
          if (res.sendError) {
            toast.error('Chưa gửi được mã. Bấm “Gửi lại mã” hoặc đổi email.')
          }
        } else {
          setPhase('need_email')
        }
      } catch (e) {
        setPhase('error')
        setErrorMsg(e instanceof Error ? e.message : 'Đăng nhập Zalo thất bại.')
      }
    })()
  }, [params])

  async function onGoogleLink() {
    setBusy(true)
    try {
      await linkZaloViaGoogle(zaloToken)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không mở được đăng nhập Google.')
      setBusy(false)
    }
  }

  async function onSendOtp() {
    if (!email.trim()) return toast.error('Nhập email của bạn.')
    setBusy(true)
    try {
      const r = await sendZaloEmailOtp(zaloToken, email.trim())
      setZaloToken(r.zaloToken)
      setMaskedEmail(r.email)
      setPhase('otp')
      toast.success('Đã gửi mã xác thực tới email.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không gửi được mã.')
    } finally {
      setBusy(false)
    }
  }

  async function onVerify() {
    if (!otp.trim()) return toast.error('Nhập mã OTP.')
    setBusy(true)
    try {
      const session = await verifyZaloOtp(zaloToken, otp.trim())
      await applySession(session)
      navigate('/', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xác thực thất bại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col">
      <div className="app-aurora" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        {phase === 'working' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 size={28} className="animate-spin text-brand-500" />
            <p className="text-sm text-muted">Đang xác thực với Zalo…</p>
          </div>
        )}

        {phase === 'need_email' && (
          <div className="w-full space-y-5">
            <Head
              icon={<Mail size={28} />}
              title="Xác thực email"
              desc="Để định danh tài khoản, dùng Google (nhanh nhất) hoặc nhập email để nhận mã xác thực."
            />
            <Button fullWidth size="lg" variant="secondary" onClick={onGoogleLink} disabled={busy}>
              <GoogleMark /> Tiếp tục với Google
            </Button>
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-faint">hoặc dùng email</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
                autoFocus
              />
            </Field>
            <Button fullWidth size="lg" onClick={onSendOtp} disabled={busy}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              Gửi mã xác thực
            </Button>
          </div>
        )}

        {phase === 'otp' && (
          <div className="w-full space-y-5">
            <Head
              icon={<ShieldCheck size={28} />}
              title="Nhập mã OTP"
              desc={`Mã xác thực đã gửi tới ${maskedEmail || 'email của bạn'}. Nhập mã để hoàn tất.`}
            />
            <Field label="Mã OTP">
              <Input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
                placeholder="VD: 123456"
                autoFocus
              />
            </Field>
            <Button fullWidth size="lg" onClick={onVerify} disabled={busy}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              Xác nhận & đăng nhập
            </Button>
            <button
              type="button"
              onClick={() => setPhase('need_email')}
              className="press w-full text-sm text-muted hover:text-app"
            >
              Đổi email khác
            </button>
          </div>
        )}

        {phase === 'error' && (
          <div className="w-full space-y-5 text-center">
            <Head icon={<ShieldCheck size={28} />} title="Đăng nhập thất bại" desc={errorMsg} center />
            <Button fullWidth size="lg" onClick={() => navigate('/', { replace: true })}>
              Về trang đăng nhập
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Head({
  icon,
  title,
  desc,
  center,
}: {
  icon: ReactNode
  title: string
  desc: string
  center?: boolean
}) {
  return (
    <div className={center ? 'flex flex-col items-center text-center' : ''}>
      <div className="grid place-items-center h-14 w-14 rounded-2xl gradient-brand text-white shadow-glow mb-4">
        {icon}
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight text-app">{title}</h2>
      <p className="mt-1.5 text-sm text-muted">{desc}</p>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}
