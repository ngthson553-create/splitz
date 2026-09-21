import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../../components/PageTransition'
import { useT } from '../../lib/i18n'

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  const t = useT()
  return (
    <PageTransition>
      <div className="px-5 pt-6 pb-24 max-w-md mx-auto">
        <header className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} aria-label={t.legal.back} className="press grid place-items-center h-10 w-10 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-muted hover:text-app">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-app">{title}</h1>
        </header>
        <div className="space-y-4 text-sm text-muted leading-relaxed">{children}</div>
      </div>
    </PageTransition>
  )
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-bold text-app mt-6 first:mt-0">{children}</h2>
}

export function TermsScreen() {
  const t = useT()
  return (
    <LegalShell title={t.legal.termsTitle}>
      <p className="text-xs text-faint">{t.legal.lastUpdated}</p>
      <H>{t.legal.termsH1}</H>
      <p>{t.legal.termsP1}</p>
      <H>{t.legal.termsH2}</H>
      <p>
        {t.legal.termsP2A}
        <strong>{t.legal.termsP2Strong}</strong>
        {t.legal.termsP2B}
      </p>
      <H>{t.legal.termsH3}</H>
      <p>{t.legal.termsP3}</p>
      <H>{t.legal.termsH4}</H>
      <p>{t.legal.termsP4}</p>
      <H>{t.legal.termsH5}</H>
      <p>{t.legal.termsP5}</p>
      <H>{t.legal.termsH6}</H>
      <p>{t.legal.termsP6}</p>
    </LegalShell>
  )
}

export function PrivacyScreen() {
  const t = useT()
  return (
    <LegalShell title={t.legal.privacyTitle}>
      <p className="text-xs text-faint">{t.legal.lastUpdated}</p>
      <H>{t.legal.privacyH1}</H>
      <p>{t.legal.privacyP1}</p>
      <H>{t.legal.privacyH2}</H>
      <p>{t.legal.privacyP2}</p>
      <H>{t.legal.privacyH3}</H>
      <p>{t.legal.privacyP3}</p>
      <H>{t.legal.privacyH4}</H>
      <p>{t.legal.privacyP4}</p>
      <H>{t.legal.privacyH5}</H>
      <p>{t.legal.privacyP5}</p>
      <H>{t.legal.privacyH6}</H>
      <p>{t.legal.privacyP6}</p>
    </LegalShell>
  )
}
