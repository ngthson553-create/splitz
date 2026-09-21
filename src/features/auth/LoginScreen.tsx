import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Wallet } from 'lucide-react'
import { Button } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useT } from '../../lib/i18n'
import { useToast } from '../../components/Toast'
import { trackEvent } from '../../lib/analytics'

export function LoginScreen() {
  const { signInWithGoogle, signInWithZalo, zaloEnabled } = useAuth()
  const toast = useToast()
  const t = useT()
  const [busy, setBusy] = useState(false)

  async function onGoogle() {
    trackEvent('sign_in_initiated', { provider: 'google' })
    setBusy(true)
    try {
      await signInWithGoogle()
      // Trình duyệt sẽ điều hướng sang Google; nếu quay lại đây tức là có lỗi.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.auth.signInFailed)
      setBusy(false)
    }
  }

  async function onZalo() {
    trackEvent('sign_in_initiated', { provider: 'zalo' })
    setBusy(true)
    try {
      await signInWithZalo()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.auth.zaloSignInFailed)
      setBusy(false)
    }
  }

  return (
    <div className="relative min-h-dvh flex flex-col">
      <div className="app-aurora" />
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        <div className="grid place-items-center h-20 w-20 rounded-3xl gradient-brand text-white shadow-glow mb-6 animate-float">
          <Wallet size={40} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Splitz</h1>
        <p className="mt-2 text-sm text-muted text-center max-w-xs">
          {t.auth.tagline}
        </p>

        <div className="w-full mt-10 space-y-3">
          <Button fullWidth size="lg" onClick={onGoogle} disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
            {t.auth.continueWithGoogle}
          </Button>

          {zaloEnabled ? (
            <button
              type="button"
              onClick={onZalo}
              disabled={busy}
              className="w-full h-12 px-5 rounded-2xl inline-flex items-center justify-center gap-2 font-semibold text-[15px] text-white shadow-soft hover:brightness-110 disabled:opacity-50"
              style={{ background: '#0068FF' }}
            >
              <ZaloIcon />
              {t.auth.continueWithZalo}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full h-12 px-5 rounded-2xl inline-flex items-center justify-center gap-2 font-semibold text-[15px] bg-[var(--surface-solid)] border border-[var(--border)] text-faint cursor-not-allowed"
            >
              <ZaloIcon />
              {t.auth.continueWithZalo}
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] text-muted">
                {t.auth.comingSoon}
              </span>
            </button>
          )}
        </div>

        <p className="mt-8 text-xs text-faint text-center max-w-xs leading-relaxed">
          {t.auth.agreePrefix}{' '}
          <Link to="/terms" className="text-brand-600 dark:text-brand-300 font-semibold underline">
            {t.auth.termsLink}
          </Link>{' '}
          {t.auth.agreeAnd}{' '}
          <Link to="/privacy" className="text-brand-600 dark:text-brand-300 font-semibold underline">
            {t.auth.privacyLink}
          </Link>{' '}
          {t.auth.agreeSuffix}
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#fff" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.63z" />
      <path fill="#fff" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#fff" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#fff" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

function ZaloIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.7 1.4 5.1 3.6 6.7-.1.9-.5 2.1-1.1 3.1-.2.3.1.7.5.6 1.9-.5 3.3-1.2 4.1-1.7.9.2 1.9.3 2.9.3 5.52 0 10-3.94 10-8.8S17.52 2 12 2z" />
    </svg>
  )
}
