import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Bell,
  CheckCircle2,
  CircleDashed,
  Clock3,
  CreditCard,
  Database,
  Loader2,
  Mail,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Ticket,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { Badge, Button, Card, EmptyState } from '../../components/ui'
import {
  getAdminHealthSnapshot,
  type AdminHealthCard,
  type AdminHealthError,
  type AdminHealthJob,
  type AdminHealthJobStatus,
  type AdminHealthMetric,
  type AdminHealthSnapshot,
  type AdminHealthStatus,
} from '../../lib/adminHealth'

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const NUMBER_FORMAT = new Intl.NumberFormat('vi-VN')

const JOB_STATUS_OPTIONS: { value: AdminHealthJobStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả tác vụ' },
  { value: 'queued', label: 'Đang chờ' },
  { value: 'running', label: 'Đang chạy' },
  { value: 'succeeded', label: 'Thành công' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const HEALTH_ICONS: Record<string, LucideIcon> = {
  supabase: Database,
  auth: ShieldCheck,
  edge: Server,
  resend: Mail,
  ai: Sparkles,
  payos: CreditCard,
  redeem: Ticket,
  push: Bell,
  jobs: Clock3,
  errors: TriangleAlert,
}

export function ConsoleHealthPage() {
  const [snapshot, setSnapshot] = useState<AdminHealthSnapshot | null>(null)
  const [jobStatus, setJobStatus] = useState<AdminHealthJobStatus>('all')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await getAdminHealthSnapshot(undefined, { jobStatus })
    setSnapshot(next)
    setSelectedJobId((current) => {
      if (current && next?.jobs.some((job) => job.id === current)) return current
      return next?.jobs[0]?.id ?? null
    })
    setNotice(next ? null : 'Không tải được snapshot sức khỏe. Kiểm tra quyền admin hoặc Edge Function admin-health.')
    setLoading(false)
  }, [jobStatus])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshot()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadSnapshot])

  const selectedJob = useMemo(
    () => snapshot?.jobs.find((job) => job.id === selectedJobId) ?? snapshot?.jobs[0] ?? null,
    [snapshot?.jobs, selectedJobId],
  )
  const failedJobs = snapshot?.jobs.filter((job) => job.status === 'failed').length ?? 0
  const failedCards = snapshot?.cards.filter((card) => card.status === 'failed' || card.status === 'missing').length ?? 0

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 5</Badge>
              <HealthStatusBadge status={snapshot?.summaryStatus ?? 'unknown'} />
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">Dashboard vận hành</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Snapshot sức khỏe được đọc qua Edge Function admin-only, chỉ hiển thị trạng thái đã sanitize và ghi audit `health_check`.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Chạy health check
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <SummaryPill label="Dịch vụ cần chú ý" value={String(failedCards)} tone={failedCards > 0 ? 'warn' : 'pos'} />
          <SummaryPill label="Tác vụ lỗi" value={String(failedJobs)} tone={failedJobs > 0 ? 'warn' : 'pos'} />
          <SummaryPill label="Check gần nhất" value={snapshot ? formatDate(snapshot.checkedAt) : loading ? 'Đang kiểm tra' : 'Chưa có'} tone="brand" />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <MetricGrid metrics={snapshot?.metrics ?? []} loading={loading && !snapshot} />
      <HealthCardGrid cards={snapshot?.cards ?? []} loading={loading && !snapshot} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <JobMonitor
          jobs={snapshot?.jobs ?? []}
          selectedJob={selectedJob}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
          status={jobStatus}
          onStatusChange={setJobStatus}
          loading={loading && !snapshot}
        />
        <aside className="space-y-4">
          <JobDetail job={selectedJob} />
          <RecentErrors errors={snapshot?.recentErrors ?? []} loading={loading && !snapshot} />
        </aside>
      </div>
    </div>
  )
}

function MetricGrid({ metrics, loading }: { metrics: AdminHealthMetric[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
      </div>
    )
  }

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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

function HealthCardGrid({ cards, loading }: { cards: AdminHealthCard[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
      </div>
    )
  }

  if (cards.length === 0) {
    return <EmptyState icon={<Activity size={28} />} title="Chưa có health card" description="Chạy health check để lấy trạng thái hệ thống." />
  }

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = HEALTH_ICONS[card.id] ?? Activity
        return (
          <Card key={card.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
                <Icon size={19} />
              </span>
              <HealthStatusBadge status={card.status} />
            </div>
            <h3 className="mt-4 font-extrabold text-app">{card.label}</h3>
            <p className="mt-1 min-h-[2.5rem] text-sm leading-5 text-muted">{card.detail}</p>
            <div className="mt-3 space-y-1 text-xs font-semibold text-faint">
              {card.lastSuccessAt && <p>Thành công: {formatDate(card.lastSuccessAt)}</p>}
              {card.lastErrorAt && <p>Lỗi: {formatDate(card.lastErrorAt)}</p>}
              {card.lastError && <p className="break-words text-neg">{card.lastError}</p>}
            </div>
          </Card>
        )
      })}
    </section>
  )
}

function JobMonitor({
  jobs,
  selectedJob,
  selectedJobId,
  onSelectJob,
  status,
  onStatusChange,
  loading,
}: {
  jobs: AdminHealthJob[]
  selectedJob: AdminHealthJob | null
  selectedJobId: string | null
  onSelectJob: (id: string) => void
  status: AdminHealthJobStatus
  onStatusChange: (status: AdminHealthJobStatus) => void
  loading: boolean
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-extrabold text-app">Lịch chạy</h3>
            <p className="mt-1 text-sm text-muted">Notification jobs và admin job runs gần nhất.</p>
          </div>
          <label className="block min-w-48 text-sm font-semibold text-muted">
            <span className="sr-only">Lọc trạng thái tác vụ</span>
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value as AdminHealthJobStatus)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
            >
              {JOB_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={<Clock3 size={28} />} title="Chưa có tác vụ" description="Health check và notification job sẽ xuất hiện tại đây." />
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {jobs.map((job) => (
            <button
              key={`${job.source}-${job.id}`}
              type="button"
              onClick={() => onSelectJob(job.id)}
              aria-pressed={selectedJob?.id === job.id || selectedJobId === job.id}
              className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(11rem,1fr)_8rem_8rem_7rem] lg:items-center ${selectedJob?.id === job.id ? 'bg-brand-500/8' : ''}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-app">{job.jobType}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{sourceLabel(job.source)} · {formatDate(job.createdAt)}</span>
              </span>
              <span className="text-sm font-bold text-app">{job.targetCount} đối tượng</span>
              <span className="text-sm font-semibold text-muted">{job.targetType ?? 'hệ thống'}</span>
              <span className="lg:justify-self-end"><JobStatusBadge status={job.status} /></span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function JobDetail({ job }: { job: AdminHealthJob | null }) {
  if (!job) {
    return (
      <Card className="p-5 text-center xl:sticky xl:top-6">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
          <Clock3 size={20} />
        </div>
        <p className="mt-3 font-bold text-app">Chưa chọn tác vụ</p>
        <p className="mt-1 text-sm leading-6 text-muted">Chọn một tác vụ để xem tóm tắt và lỗi.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-faint">Chi tiết tác vụ</p>
          <h3 className="mt-1 truncate text-lg font-extrabold text-app">{job.jobType}</h3>
        </div>
        <JobStatusBadge status={job.status} />
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <MetaRow label="Nguồn" value={sourceLabel(job.source)} />
        <MetaRow label="Đối tượng" value={`${job.targetType ?? 'hệ thống'}${job.targetValue ? ` · ${job.targetValue}` : ''}`} />
        <MetaRow label="Tạo lúc" value={formatDate(job.createdAt)} />
        {job.finishedAt && <MetaRow label="Kết thúc" value={formatDate(job.finishedAt)} />}
        {job.errorMessage && <MetaRow label="Lỗi" value={job.errorMessage} danger />}
      </div>
      <pre className="mt-4 max-h-52 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-muted">
        {formatJson(job.resultSummary)}
      </pre>
    </Card>
  )
}

function RecentErrors({ errors, loading }: { errors: AdminHealthError[]; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-neg">
          <TriangleAlert size={18} />
        </span>
        <div>
          <h3 className="font-extrabold text-app">Lỗi gần đây</h3>
          <p className="text-xs text-muted">Từ audit và job log, đã sanitize.</p>
        </div>
      </div>
      {loading ? (
        <div className="mt-4 space-y-2">
          {[0, 1].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
        </div>
      ) : errors.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm font-semibold text-muted">
          Chưa có lỗi gần đây.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {errors.map((error) => (
            <div key={`${error.source}-${error.id}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-bold text-app">{error.action ?? error.source}</p>
                <span className="shrink-0 text-xs font-semibold text-faint">{formatDate(error.createdAt)}</span>
              </div>
              <p className="mt-1 break-words text-xs font-semibold text-neg">{error.message ?? 'unknown_error'}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'warn' }) {
  const valueClass = tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-neg' : 'text-brand-600 dark:text-brand-300'
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-xs font-bold uppercase text-faint">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${valueClass}`}>{value}</p>
    </div>
  )
}

function MetaRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-xs font-bold uppercase text-faint">{label}</p>
      <p className={`mt-0.5 break-words font-semibold ${danger ? 'text-neg' : 'text-app'}`}>{value}</p>
    </div>
  )
}

function HealthStatusBadge({ status }: { status: AdminHealthStatus }) {
  const icon = status === 'ok' || status === 'configured' ? <CheckCircle2 size={13} /> : status === 'unknown' ? <CircleDashed size={13} /> : <TriangleAlert size={13} />
  const tone = status === 'ok' ? 'pos' : status === 'configured' ? 'brand' : status === 'unknown' ? 'muted' : 'neg'
  return <Badge tone={tone}>{icon}{HEALTH_STATUS_LABEL[status]}</Badge>
}

function JobStatusBadge({ status }: { status: Exclude<AdminHealthJobStatus, 'all'> }) {
  const tone = status === 'succeeded' ? 'pos' : status === 'failed' ? 'neg' : status === 'running' ? 'brand' : 'muted'
  return <Badge tone={tone}>{JOB_STATUS_LABEL[status]}</Badge>
}

function sourceLabel(source: string) {
  return source === 'notification_jobs' ? 'Tác vụ thông báo' : 'Tác vụ admin'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date)
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return String(value ?? '')
  }
}

const HEALTH_STATUS_LABEL: Record<AdminHealthStatus, string> = {
  ok: 'OK',
  configured: 'Đã cấu hình',
  missing: 'Thiếu cấu hình',
  failed: 'Lỗi',
  unknown: 'Chưa rõ',
}

const JOB_STATUS_LABEL: Record<Exclude<AdminHealthJobStatus, 'all'>, string> = {
  queued: 'Đang chờ',
  running: 'Đang chạy',
  succeeded: 'Thành công',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
}
