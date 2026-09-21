import { useState } from 'react'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageTransition } from '../../components/PageTransition'
import { useT } from '../../lib/i18n'

type QA = { q: string; a: string }

export function FaqScreen() {
  const navigate = useNavigate()
  const t = useT()
  const [open, setOpen] = useState<string | null>(null)

  const FAQS: { group: string; items: QA[] }[] = [
    {
      group: t.legal.faqGroupStart,
      items: [
        { q: t.legal.faqStartQ1, a: t.legal.faqStartA1 },
        { q: t.legal.faqStartQ2, a: t.legal.faqStartA2 },
        { q: t.legal.faqStartQ3, a: t.legal.faqStartA3 },
      ],
    },
    {
      group: t.legal.faqGroupSpend,
      items: [
        { q: t.legal.faqSpendQ1, a: t.legal.faqSpendA1 },
        { q: t.legal.faqSpendQ2, a: t.legal.faqSpendA2 },
        { q: t.legal.faqSpendQ3, a: t.legal.faqSpendA3 },
      ],
    },
    {
      group: t.legal.faqGroupPlans,
      items: [
        { q: t.legal.faqPlansQ1, a: t.legal.faqPlansA1 },
        { q: t.legal.faqPlansQ2, a: t.legal.faqPlansA2 },
        { q: t.legal.faqPlansQ3, a: t.legal.faqPlansA3 },
        { q: t.legal.faqPlansQ4, a: t.legal.faqPlansA4 },
      ],
    },
    {
      group: t.legal.faqGroupSafety,
      items: [
        { q: t.legal.faqSafetyQ1, a: t.legal.faqSafetyA1 },
        { q: t.legal.faqSafetyQ2, a: t.legal.faqSafetyA2 },
      ],
    },
  ]

  return (
    <PageTransition>
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-24 max-w-md mx-auto">
        <header className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} aria-label={t.legal.back} className="press grid place-items-center h-10 w-10 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-muted hover:text-app">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight text-app">{t.legal.faqTitle}</h1>
        </header>

        <div className="space-y-5">
          {FAQS.map((section) => (
            <section key={section.group} className="space-y-2">
              <h2 className="text-[13px] font-semibold text-muted px-1">{section.group}</h2>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const key = `${section.group}-${item.q}`
                  const isOpen = open === key
                  return (
                    <div key={key} className="card overflow-hidden p-0">
                      <button
                        onClick={() => setOpen(isOpen ? null : key)}
                        className="press w-full flex items-center gap-3 p-3.5 text-left"
                      >
                        <span className="flex-1 font-semibold text-sm">{item.q}</span>
                        <ChevronDown
                          size={18}
                          className={`text-faint shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && <p className="px-3.5 pb-3.5 text-sm text-muted leading-relaxed">{item.a}</p>}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
