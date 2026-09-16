import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, Inbox, Loader2, Mail, RefreshCw, Send, ShieldCheck, TriangleAlert } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input } from '../../components/ui'
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

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const NUMBER_FORMAT = new Intl.NumberFormat('vi-VN')

export function ConsoleEmailPage() {
  const [snapshot, setSnapshot] = useState<AdminEmailSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [toEmail, setToEmail] = useState('')
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('system_test')
  const [subject, setSubject] = useState('Test Splitz Email')
  const [message, setMessage] = useState('Đây là email test từ Splitz Console để kiểm tra Resend production.')

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminEmailSnapshot(undefined, { limit: 50 })
    setSnapshot(next)
    if (next) {
      setNotice(null)
      setToEmail((current) => current || next.defaultToEmail || '')
      setSelectedTemplateKey((current) => next.templates.some((item) => item.key === current) ? current : next.templates[0]?.key ?? 'system_test')
    } else {
      setNotice('Không tải được Email snapshot. Kiểm tra quyền admin hoặc Edge Function admin-email.')
    }
    setLoading(false)
  }, [])

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
      setNotice('Cần nhập email nhận test hợp lệ.')
      return
    }
    if (!cleanSubject) {
      setNotice('Cần nhập subject test email.')
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
    setNotice(result?.status === 'sent' ? 'Đã gửi test email và ghi audit.' : 'Không gửi được test email. Kiểm tra Resend config/log lỗi.')
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
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">Email / Resend</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Kiểm tra Resend, gửi test email, xem template vận hành và log gửi đã sanitize qua Edge Function admin-only.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading || busy}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Làm mới
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label="Resend" value={snapshot?.provider.status ?? 'unknown'} tone={snapshot?.provider.status === 'configured' ? 'pos' : 'warn'} />
          <SummaryPill label="Log gần đây" value={String(snapshot?.logs.length ?? 0)} tone="brand" />
          <SummaryPill label="Đã gửi" value={NUMBER_FORMAT.format(sentCount)} tone="pos" />
          <SummaryPill label="Lỗi" value={NUMBER_FORMAT.format(failedCount)} tone={failedCount > 0 ? 'warn' : 'pos'} />
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
              <h3 className="font-extrabold text-app">Gửi test email</h3>
              <p className="text-xs text-muted">Chỉ gửi tới email chỉ định, action được audit.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <Field label="Email nhận test">
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
            <Field label="Tiêu đề email">
              <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
            </Field>
            <Field label="Người gửi">
              <Input value={snapshot?.provider.from ?? 'Chưa cấu hình'} readOnly />
            </Field>
            <label className="block space-y-1.5 lg:col-span-2">
              <span className="text-[13px] font-semibold text-muted">Nội dung test</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm leading-6 text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
              />
            </label>
          </div>

          <Button className="mt-4" onClick={() => void onSendTest()} disabled={busy || loading}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Gửi test email
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3 className="font-extrabold text-app">Sức khỏe Resend</h3>
              <p className="text-xs text-muted">Không hiển thị API key hoặc secret.</p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <MetaRow label="Trạng thái" value={snapshot?.provider.detail ?? 'Đang tải'} />
            <MetaRow label="Người gửi" value={snapshot?.provider.from ?? 'chưa cấu hình'} />
            <MetaRow label="Reply-To" value={snapshot?.provider.replyTo ?? 'Không cấu hình'} />
            <MetaRow label="Email mặc định" value={snapshot?.defaultToEmail ?? 'Không có'} />
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
          <p className="mt-2 text-2xl font-extrabold text-app">{NUMBER_FORMAT.format(metric.value)}</p>
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
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <FileText size={18} />
          </span>
          <div>
            <h3 className="font-extrabold text-app">Template email</h3>
            <p className="text-sm text-muted">Reminder, release và system email.</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title="Chưa có template" description="Email template sẽ xuất hiện sau migration Phase 7." />
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
              <span><Badge tone="muted">{categoryLabel(template.category)}</Badge></span>
              <span className="min-w-0 text-sm font-semibold text-muted truncate">{template.subject}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function EmailLogTable({ logs, loading }: { logs: AdminEmailLog[]; loading: boolean }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <Inbox size={18} />
          </span>
          <div>
            <h3 className="font-extrabold text-app">Log gửi email</h3>
            <p className="text-sm text-muted">Log gửi email gần nhất, đã redact secret.</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<Mail size={28} />} title="Chưa có email log" description="Test email và reminder email mới sẽ được ghi tại đây." />
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
  return (
    <Card className="p-5 xl:sticky xl:top-6">
      {template ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Chi tiết template</p>
              <h3 className="mt-1 truncate text-lg font-extrabold text-app">{template.name}</h3>
            </div>
            <Badge tone={template.active ? 'pos' : 'muted'}>{template.active ? 'Đang bật' : 'Đã tắt'}</Badge>
          </div>
          <MetaRow label="Category" value={categoryLabel(template.category)} />
          <MetaRow label="Tiêu đề" value={template.subject} />
          <MetaRow label="Updated" value={template.updatedAt ? formatDate(template.updatedAt) : 'Chưa có'} />
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm leading-6 text-muted">{template.description}</p>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <FileText size={20} />
          </div>
          <p className="mt-3 font-bold text-app">Chưa chọn template</p>
          <p className="mt-1 text-sm leading-6 text-muted">Chọn template để xem subject và mô tả.</p>
        </div>
      )}
    </Card>
  )
}

function RecentErrors({ errors, loading }: { errors: { id: string; action: string | null; message: string | null; createdAt: string }[]; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-neg">
          <TriangleAlert size={18} />
        </span>
        <div>
          <h3 className="font-extrabold text-app">Lỗi gần đây</h3>
          <p className="text-xs text-muted">Từ email_delivery_logs và audit.</p>
        </div>
      </div>
      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : errors.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm font-semibold text-muted">Chưa có lỗi email gần đây.</p>
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
  const tone = status === 'ok' || status === 'configured' ? 'pos' : status === 'unknown' ? 'muted' : 'neg'
  return <Badge tone={tone}>{status === 'configured' || status === 'ok' ? 'Đã cấu hình' : status === 'missing' ? 'Thiếu cấu hình' : status === 'failed' ? 'Lỗi' : 'Chưa rõ'}</Badge>
}

function EmailLogStatusBadge({ status }: { status: AdminEmailLogStatus }) {
  const tone = status === 'sent' ? 'pos' : status === 'failed' ? 'neg' : 'muted'
  return <Badge tone={tone}>{status}</Badge>
}

function categoryLabel(category: AdminEmailTemplateCategory) {
  if (category === 'auth') return 'Auth'
  if (category === 'reminder') return 'Reminder'
  if (category === 'release') return 'Release'
  return 'Hệ thống'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date)
}
