import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, Inbox, Loader2, Mail, RefreshCw, Send, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input } from '../../components/ui'
import { useT, type Dict } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import {
  loadAdminEmailSnapshot,
  sendAdminTestEmail,
  type AdminEmailLog,
  type AdminEmailLogStatus,
  type AdminEmailMetric,
  type AdminEmailSnapshot,
  type AdminEmailStatus,
  type AdminEmailTemplate,
  type AdminEmailTemplateCategory,
} from '../../lib/adminEmail'

function categoryLabel(t: Dict, category: AdminEmailTemplateCategory) {
  if (category === 'auth') return 'Auth'
  if (category === 'reminder') return 'Reminder'
  if (category === 'release') return 'Release'
  return t.adminSystem.emailCategorySystem
}

export function ConsoleEmailPage() {
  const t = useT()
  const [snapshot, setSnapshot] = useState<AdminEmailSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [toEmail, setToEmail] = useState('')
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('system_test')
  const [subject, setSubject] = useState(t.adminSystem.emailDefaultSubject)
  const [message, setMessage] = useState(t.adminSystem.emailDefaultMessage)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminEmailSnapshot(undefined, { limit: 50 })
    setSnapshot(next)
    if (next) {
      setNotice(null)
      setToEmail((current) => current || next.defaultToEmail || '')
      setSelectedTemplateKey((current) => next.templates.some((item) => item.key === current) ? current : next.templates[0]?.key ?? 'system_test')
    } else {
      setNotice(t.adminSystem.emailLoadFailed)
    }
    setLoading(false)
  }, [t])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshot()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadSnapshot])

  const selectedTemplate = useMemo(
    () => snapshot?.templates.find((item) => item.key === selectedTemplateKey) ?? snapshot?.templates[0] ?? null,
    [selectedTemplateKey, snapshot?.templates],
  )
  const sentCount = snapshot?.logs.filter((log) => log.status === 'sent').length ?? 0
  const failedCount = snapshot?.logs.filter((log) => log.status === 'failed').length ?? 0

  async function onTemplateChange(key: string) {
    setSelectedTemplateKey(key)
    const template = snapshot?.templates.find((item) => item.key === key)
    if (template) setSubject(template.subject)
  }

  async function onSendTest() {
    const cleanEmail = toEmail.trim()
    const cleanSubject = subject.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setNotice(t.adminSystem.emailValidToRequired)
      return
    }
    if (!cleanSubject) {
      setNotice(t.adminSystem.emailSubjectRequired)
      return
    }
    setBusy(true)
    setNotice(null)
    const result = await sendAdminTestEmail(undefined, {
      toEmail: cleanEmail,
      templateKey: selectedTemplateKey,
      subject: cleanSubject,
      message,
    })
    setNotice(result?.status === 'sent' ? t.adminSystem.emailSent : t.adminSystem.emailSendFailed)
    if (result) await loadSnapshot()
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 7</Badge>
              <EmailStatusBadge status={snapshot?.summaryStatus ?? 'unknown'} />
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">{t.adminSystem.emailTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t.adminSystem.emailDescription}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading || busy}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {t.adminSystem.refresh}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label="Resend" value={snapshot?.provider.status ?? 'unknown'} tone={snapshot?.provider.status === 'configured' ? 'pos' : 'warn'} />
          <SummaryPill label={t.adminSystem.emailPillRecentLogs} value={String(snapshot?.logs.length ?? 0)} tone="brand" />
          <SummaryPill label={t.adminSystem.emailPillSent} value={formatNumber(sentCount)} tone="pos" />
          <SummaryPill label={t.adminSystem.statusFailed} value={formatNumber(failedCount)} tone={failedCount > 0 ? 'warn' : 'pos'} />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <MetricGrid metrics={snapshot?.metrics ?? []} loading={loading && !snapshot} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
              <Send size={20} />
            </span>
            <div>
              <h3 className="font-extrabold text-app">{t.adminSystem.emailSendTitle}</h3>
              <p className="text-xs text-muted">{t.adminSystem.emailSendHint}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <Field label={t.adminSystem.emailToLabel}>
              <Input value={toEmail} onChange={(event) => setToEmail(event.target.value)} placeholder="owner@example.com" />
            </Field>
            <Field label="Template">
              <select
                value={selectedTemplateKey}
                onChange={(event) => void onTemplateChange(event.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
              >
                {(snapshot?.templates ?? []).map((template) => (
                  <option key={template.key} value={template.key}>{template.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t.adminSystem.emailSubjectLabel}>
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </Field>
            <Field label={t.adminSystem.emailFromLabel}>
              <Input value={snapshot?.provider.from ?? t.adminSystem.emailNotConfigured} readOnly />
            </Field>
            <label className="block space-y-1.5 lg:col-span-2">
              <span className="text-[13px] font-semibold text-muted">{t.adminSystem.emailMessageLabel}</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm leading-6 text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
              />
            </label>
          </div>

          <Button className="mt-4" onClick={() => void onSendTest()} disabled={busy || loading}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} {t.adminSystem.emailSendButton}
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3 className="font-extrabold text-app">{t.adminSystem.emailHealthTitle}</h3>
              <p className="text-xs text-muted">{t.adminSystem.emailHealthHint}</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <MetaRow label={t.adminSystem.emailStatusLabel} value={snapshot?.provider.detail ?? t.adminSystem.loading} />
            <MetaRow label={t.adminSystem.emailFromLabel} value={snapshot?.provider.from ?? t.adminSystem.emailNotConfiguredLower} />
            <MetaRow label="Reply-To" value={snapshot?.provider.replyTo ?? t.adminSystem.emailNotSet} />
            <MetaRow label={t.adminSystem.emailDefaultToLabel} value={snapshot?.defaultToEmail ?? t.adminSystem.none} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-4 min-w-0">
          <TemplatePanel templates={snapshot?.templates ?? []} selected={selectedTemplate} onSelect={(key) => void onTemplateChange(key)} loading={loading && !snapshot} />
          <EmailLogTable logs={snapshot?.logs ?? []} loading={loading && !snapshot} />
        </section>

        <aside className="space-y-4">
          <TemplateDetail template={selectedTemplate} />
          <RecentErrors errors={snapshot?.recentErrors ?? []} loading={loading && !snapshot} />
        </aside>
      </div>
    </div>
  )
}

function MetricGrid({ metrics, loading }: { metrics: AdminEmailMetric[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
      </div>
    )
  }

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.id} className="p-4">
          <p className="text-xs font-bold uppercase text-faint">{metric.label}</p>
          <p className="mt-2 text-2xl font-extrabold text-app">{formatNumber(metric.value)}</p>
          {metric.detail && <p className="mt-1 truncate text-xs font-semibold text-muted">{metric.detail}</p>}
        </Card>
      ))}
    </section>
  )
}

function TemplatePanel({
  templates,
  selected,
  onSelect,
  loading,
}: {
  templates: AdminEmailTemplate[]
  selected: AdminEmailTemplate | null
  onSelect: (key: string) => void
  loading: boolean
}) {
  const t = useT()
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <FileText size={18} />
          </span>
          <div>
            <h3 className="font-extrabold text-app">{t.adminSystem.emailTemplatesTitle}</h3>
            <p className="text-sm text-muted">{t.adminSystem.emailTemplatesHint}</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title={t.adminSystem.emailTemplatesEmptyTitle} description={t.adminSystem.emailTemplatesEmptyDescription} />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {templates.map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => onSelect(template.key)}
              aria-pressed={selected?.key === template.key}
              className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(12rem,1fr)_8rem_minmax(13rem,1fr)] lg:items-center ${selected?.key === template.key ? 'bg-brand-500/8' : ''}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-app">{template.name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{template.key}</span>
              </span>
              <span><Badge tone="muted">{categoryLabel(t, template.category)}</Badge></span>
              <span className="min-w-0 text-sm font-semibold text-muted truncate">{template.subject}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function EmailLogTable({ logs, loading }: { logs: AdminEmailLog[]; loading: boolean }) {
  const t = useT()
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <Inbox size={18} />
          </span>
          <div>
            <h3 className="font-extrabold text-app">{t.adminSystem.emailLogTitle}</h3>
            <p className="text-sm text-muted">{t.adminSystem.emailLogHint}</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<Mail size={28} />} title={t.adminSystem.emailLogEmptyTitle} description={t.adminSystem.emailLogEmptyDescription} />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {logs.map((log) => (
            <div key={log.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_7rem_9rem] lg:items-center">
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-app">{log.subject}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{log.templateKey ?? 'custom'} · {formatDate(log.createdAt)}</span>
              </span>
              <span className="min-w-0 text-sm font-semibold text-muted truncate">{log.toEmail}</span>
              <span><EmailLogStatusBadge status={log.status} /></span>
              <span className="min-w-0 truncate text-xs font-semibold text-faint">{log.providerMessageId ?? log.errorMessage ?? log.provider}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function TemplateDetail({ template }: { template: AdminEmailTemplate | null }) {
  const t = useT()
  return (
    <Card className="p-5 xl:sticky xl:top-6">
      {template ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{t.adminSystem.emailDetailLabel}</p>
              <h3 className="mt-1 truncate text-lg font-extrabold text-app">{template.name}</h3>
            </div>
            <Badge tone={template.active ? 'pos' : 'muted'}>{template.active ? t.adminSystem.on : t.adminSystem.off}</Badge>
          </div>
          <MetaRow label="Category" value={categoryLabel(t, template.category)} />
          <MetaRow label={t.adminSystem.emailFieldSubject} value={template.subject} />
          <MetaRow label="Updated" value={template.updatedAt ? formatDate(template.updatedAt) : t.adminSystem.noneYet} />
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm leading-6 text-muted">{template.description}</p>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <FileText size={20} />
          </div>
          <p className="mt-3 font-bold text-app">{t.adminSystem.emailDetailEmptyTitle}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{t.adminSystem.emailDetailEmptyDescription}</p>
        </div>
      )}
    </Card>
  )
}

function RecentErrors({ errors, loading }: { errors: { id: string; action: string | null; message: string | null; createdAt: string }[]; loading: boolean }) {
  const t = useT()
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-neg">
          <TriangleAlert size={18} />
        </span>
        <div>
          <h3 className="font-extrabold text-app">{t.adminSystem.emailErrorsTitle}</h3>
          <p className="text-xs text-muted">{t.adminSystem.emailErrorsHint}</p>
        </div>
      </div>
      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : errors.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm font-semibold text-muted">{t.adminSystem.emailErrorsEmpty}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {errors.map((error) => (
            <div key={error.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="truncate text-sm font-bold text-app">{error.action ?? 'email'}</p>
              <p className="mt-1 break-words text-xs font-semibold text-neg">{error.message ?? 'unknown_error'}</p>
              <p className="mt-1 text-xs text-faint">{formatDate(error.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-app">{value}</p>
    </div>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'warn' }) {
  const valueClass = tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-neg' : 'text-brand-600 dark:text-brand-300'
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-xs font-bold uppercase text-faint">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-extrabold ${valueClass}`}>{value}</p>
    </div>
  )
}

function EmailStatusBadge({ status }: { status: AdminEmailStatus }) {
  const t = useT()
  const tone = status === 'ok' || status === 'configured' ? 'pos' : status === 'unknown' ? 'muted' : 'neg'
  return <Badge tone={tone}>{status === 'configured' || status === 'ok' ? t.adminSystem.statusConfigured : status === 'missing' ? t.adminSystem.statusMissing : status === 'failed' ? t.adminSystem.statusFailed : t.adminSystem.statusUnknown}</Badge>
}

function EmailLogStatusBadge({ status }: { status: AdminEmailLogStatus }) {
  const tone = status === 'sent' ? 'pos' : status === 'failed' ? 'neg' : 'muted'
  return <Badge tone={tone}>{status}</Badge>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(getIntlLocale()).format(value)
}
