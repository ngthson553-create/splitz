import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock3, Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Segmented } from '../../components/ui'
import { t, useT } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import { getAdminHealthSnapshot, type AdminHealthJob, type AdminHealthJobStatus, type AdminHealthSnapshot } from '../../lib/adminHealth'

export function ConsoleJobsPage() {
  const t = useT()
  const [snapshot, setSnapshot] = useState<AdminHealthSnapshot | null>(null)
  const [status, setStatus] = useState<AdminHealthJobStatus>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await getAdminHealthSnapshot(undefined, { jobStatus: status })
    setSnapshot(next)
    setSelectedId((current) => (current && next?.jobs.some((job) => job.id === current) ? current : next?.jobs[0]?.id ?? null))
    setNotice(next ? null : t.adminOps.jobs.loadFailed)
    setLoading(false)
  }, [status, t])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshot()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadSnapshot])

  const selected = useMemo(
    () => snapshot?.jobs.find((job) => job.id === selectedId) ?? snapshot?.jobs[0] ?? null,
    [selectedId, snapshot?.jobs],
  )
  const queued = snapshot?.jobs.filter((job) => job.status === 'queued').length ?? 0
  const running = snapshot?.jobs.filter((job) => job.status === 'running').length ?? 0
  const failed = snapshot?.jobs.filter((job) => job.status === 'failed').length ?? 0
  const statusOptions: { value: AdminHealthJobStatus; label: string }[] = [
    { value: 'all', label: t.adminOps.shared.jobStatus.all },
    { value: 'queued', label: t.adminOps.shared.jobStatus.queued },
    { value: 'running', label: t.adminOps.shared.jobStatus.running },
    { value: 'succeeded', label: t.adminOps.shared.jobStatus.succeeded },
    { value: 'failed', label: t.adminOps.shared.jobStatus.failed },
    { value: 'cancelled', label: t.adminOps.shared.jobStatus.cancelled },
  ]

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 5</Badge>
              <Badge tone="pos">{t.adminOps.shared.readOnly}</Badge>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-app lg:text-3xl">{t.adminOps.shared.scheduleTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t.adminOps.jobs.description}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {t.adminOps.shared.refresh}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
            <SummaryPill label={t.adminOps.shared.jobStatus.queued} value={String(queued)} tone={queued > 0 ? 'warn' : 'pos'} />
            <SummaryPill label={t.adminOps.shared.jobStatus.running} value={String(running)} tone={running > 0 ? 'brand' : 'pos'} />
            <SummaryPill label={t.adminOps.shared.jobStatus.failed} value={String(failed)} tone={failed > 0 ? 'warn' : 'pos'} />
            <SummaryPill label={t.adminOps.shared.labelChecked} value={snapshot ? formatDate(snapshot.checkedAt) : t.adminOps.shared.none} tone="brand" />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div>
            <p className="text-sm font-bold text-app">{t.adminOps.jobs.filterTitle}</p>
            <p className="text-xs text-muted">{t.adminOps.jobs.filterSubtitle}</p>
          </div>
          <Segmented options={statusOptions} value={status} onChange={setStatus} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-[var(--border)] p-4">
            <h3 className="font-extrabold text-app">{t.adminOps.jobs.listTitle}</h3>
            <p className="mt-1 text-sm text-muted">{t.adminOps.jobs.recentCount({ n: snapshot?.jobs.length ?? 0 })}</p>
          </div>
          {loading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
            </div>
          ) : (snapshot?.jobs.length ?? 0) === 0 ? (
            <EmptyState icon={<Clock3 size={28} />} title={t.adminOps.jobs.emptyTitle} description={t.adminOps.jobs.emptyDescription} />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {snapshot!.jobs.map((job) => (
                <button
                  key={`${job.source}-${job.id}`}
                  type="button"
                  onClick={() => setSelectedId(job.id)}
                  aria-pressed={selected?.id === job.id}
                  className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(12rem,1fr)_8rem_8rem_7rem] lg:items-center ${selected?.id === job.id ? 'bg-brand-500/8' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-app">{job.jobType}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">{sourceLabel(job.source)} · {formatDate(job.createdAt)}</span>
                  </span>
                    <span className="text-sm font-bold text-app">{t.adminOps.shared.targetCount({ n: job.targetCount })}</span>
                    <span className="text-sm font-semibold text-muted">{job.targetType ?? t.adminOps.shared.targetSystem}</span>
                  <span className="lg:justify-self-end"><JobStatusBadge status={job.status} /></span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <aside className="space-y-4">
          <JobDetail job={selected} />
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--surface-2)] text-muted">
                <ShieldAlert size={20} />
              </span>
              <div>
                <h3 className="font-extrabold text-app">{t.adminOps.jobs.lockedTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t.adminOps.jobs.lockedDescription}
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function JobDetail({ job }: { job: AdminHealthJob | null }) {
  const t = useT()
  return (
    <Card className="p-5 xl:sticky xl:top-6">
      {job ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{t.adminOps.shared.taskDetail}</p>
              <h3 className="mt-1 truncate text-lg font-extrabold text-app">{job.jobType}</h3>
            </div>
            <JobStatusBadge status={job.status} />
          </div>

          <div className="grid gap-2 text-sm">
            <MetaRow label={t.adminOps.shared.labelSource} value={sourceLabel(job.source)} />
            <MetaRow label={t.adminOps.shared.labelTarget} value={`${job.targetType ?? t.adminOps.shared.targetSystem}${job.targetValue ? ` · ${job.targetValue}` : ''}`} />
            <MetaRow label={t.adminOps.shared.labelCreatedAt} value={formatDate(job.createdAt)} />
            {job.startedAt && <MetaRow label={t.adminOps.jobs.labelStarted} value={formatDate(job.startedAt)} />}
            {job.finishedAt && <MetaRow label={t.adminOps.shared.labelFinishedAt} value={formatDate(job.finishedAt)} />}
            {job.errorMessage && <MetaRow label={t.adminOps.shared.labelError} value={job.errorMessage} danger />}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{t.adminOps.jobs.resultSummaryTitle}</p>
            <pre className="max-h-[18rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-xs leading-5 text-app">
              {formatJson(job.resultSummary)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <Clock3 size={20} />
          </div>
          <p className="mt-3 font-bold text-app">{t.adminOps.jobs.noJobSelectedTitle}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{t.adminOps.jobs.noJobSelectedDescription}</p>
        </div>
      )}
    </Card>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'warn' }) {
  const valueClass = tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-neg' : 'text-brand-600 dark:text-brand-300'
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${valueClass}`}>{value}</p>
    </div>
  )
}

function MetaRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className={`mt-0.5 break-words font-semibold ${danger ? 'text-neg' : 'text-app'}`}>{value}</p>
    </div>
  )
}

function JobStatusBadge({ status }: { status: Exclude<AdminHealthJobStatus, 'all'> }) {
  const t = useT()
  const label: Record<Exclude<AdminHealthJobStatus, 'all'>, string> = {
    queued: t.adminOps.shared.jobStatus.queued,
    running: t.adminOps.shared.jobStatus.running,
    succeeded: t.adminOps.shared.jobStatus.succeeded,
    failed: t.adminOps.shared.jobStatus.failed,
    cancelled: t.adminOps.shared.jobStatus.cancelled,
  }
  const tone = status === 'succeeded' ? 'pos' : status === 'failed' ? 'neg' : status === 'running' ? 'brand' : 'muted'
  return <Badge tone={tone}>{label[status]}</Badge>
}

function sourceLabel(source: string) {
  return source === 'notification_jobs' ? t().adminOps.shared.sourceNotificationJobs : t().adminOps.shared.sourceAdmin
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return String(value ?? '')
  }
}
