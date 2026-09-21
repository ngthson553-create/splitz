import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bug, DatabaseZap, FileWarning, Loader2, LockKeyhole, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Segmented } from '../../components/ui'
import { useT, type Dict } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import {
  loadAdminDataQualitySnapshot,
  type AdminDataQualityIssue,
  type AdminDataQualitySeverity,
  type AdminDataQualitySnapshot,
} from '../../lib/adminDataQuality'

type SeverityFilter = AdminDataQualitySeverity | 'all'

function scannerLabel(t: Dict, scanner: string) {
  const labels: Record<string, string> = {
    groups_without_owner: t.adminSystem.dqScannerGroups,
    expenses_missing_party: t.adminSystem.dqScannerExpenses,
    expired_active_subscription: t.adminSystem.dqScannerSubscription,
    stale_pending_payment: t.adminSystem.dqScannerPendingPayment,
    redeem_count_mismatch: t.adminSystem.dqScannerRedeem,
    push_failure_rate: t.adminSystem.dqScannerPush,
    scanner_error: t.adminSystem.dqScannerError,
  }
  return labels[scanner] ?? scanner.replaceAll('_', ' ')
}

export function ConsoleDataQualityPage() {
  const t = useT()
  const [snapshot, setSnapshot] = useState<AdminDataQualitySnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [scanner, setScanner] = useState('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminDataQualitySnapshot()
    setSnapshot(next)
    setSelectedId((current) => (current && next?.issues.some((issue) => issue.id === current) ? current : next?.issues[0]?.id ?? null))
    setNotice(next ? null : t.adminSystem.dqLoadFailed)
    setLoading(false)
  }, [t])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshot()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadSnapshot])

  const severityOptions: { value: SeverityFilter; label: string }[] = [
    { value: 'all', label: t.adminSystem.all },
    { value: 'critical', label: t.adminSystem.severityCritical },
    { value: 'warning', label: t.adminSystem.severityWarning },
    { value: 'info', label: t.adminSystem.severityInfo },
  ]

  const scannerOptions = useMemo(() => {
    const scanners = new Set(snapshot?.issues.map((issue) => issue.scanner) ?? [])
    return [
      { value: 'all', label: t.adminSystem.dqAllScanners },
      ...Array.from(scanners).sort().map((value) => ({ value, label: scannerLabel(t, value) })),
    ]
  }, [snapshot?.issues, t])

  const filteredIssues = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (snapshot?.issues ?? []).filter((issue) => {
      if (severity !== 'all' && issue.severity !== severity) return false
      if (scanner !== 'all' && issue.scanner !== scanner) return false
      if (!q) return true
      return [issue.title, issue.detail, issue.targetType, issue.targetId, scannerLabel(t, issue.scanner)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [query, scanner, severity, snapshot?.issues, t])

  const selected = useMemo(
    () => filteredIssues.find((issue) => issue.id === selectedId) ?? filteredIssues[0] ?? snapshot?.issues[0] ?? null,
    [filteredIssues, selectedId, snapshot?.issues],
  )

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 12</Badge>
              <Badge tone="pos">{t.adminSystem.dqBadge}</Badge>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">{t.adminSystem.dqTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t.adminSystem.dqDescription}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {t.adminSystem.dqRunScan}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          <SummaryPill label={t.adminSystem.dqPillTotal} value={formatNumber(snapshot?.summary.totalIssues ?? 0)} tone={(snapshot?.summary.totalIssues ?? 0) > 0 ? 'brand' : 'pos'} />
          <SummaryPill label={t.adminSystem.severityCritical} value={formatNumber(snapshot?.summary.critical ?? 0)} tone={(snapshot?.summary.critical ?? 0) > 0 ? 'neg' : 'pos'} />
          <SummaryPill label={t.adminSystem.severityWarning} value={formatNumber(snapshot?.summary.warning ?? 0)} tone={(snapshot?.summary.warning ?? 0) > 0 ? 'warn' : 'pos'} />
          <SummaryPill label={t.adminSystem.severityInfo} value={formatNumber(snapshot?.summary.info ?? 0)} tone="muted" />
          <SummaryPill label={t.adminSystem.dqPillScanners} value={formatNumber(snapshot?.summary.scannersRun ?? 0)} tone="brand" />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 space-y-3">
          <Card className="p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_21rem_16rem] lg:items-center">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.adminSystem.dqSearchPlaceholder} className="pl-9" />
              </label>
              <Segmented options={severityOptions} value={severity} onChange={setSeverity} />
              <select
                value={scanner}
                onChange={(event) => setScanner(event.target.value)}
                className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
              >
                {scannerOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            {loading && !snapshot ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
              </div>
            ) : filteredIssues.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck size={28} />}
                title={t.adminSystem.dqEmptyTitle}
                description={t.adminSystem.dqEmptyDescription}
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filteredIssues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} active={selected?.id === issue.id} onClick={() => setSelectedId(issue.id)} />
                ))}
              </div>
            )}
          </Card>
        </section>

        <aside className="space-y-4">
          <IssueDetail issue={selected} scanId={snapshot?.scanId ?? null} checkedAt={snapshot?.checkedAt ?? null} />
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--surface-2)] text-muted">
                <LockKeyhole size={20} />
              </span>
              <div>
                <h3 className="font-extrabold text-app">{t.adminSystem.dqCleanupTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {t.adminSystem.dqCleanupDescription}
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function IssueRow({ issue, active, onClick }: { issue: AdminDataQualityIssue; active: boolean; onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(12rem,0.8fr)_minmax(14rem,1fr)_minmax(8rem,0.55fr)_7rem] lg:items-center ${active ? 'bg-brand-500/8' : ''}`}
    >
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <SeverityIcon severity={issue.severity} />
          <span className="truncate text-sm font-extrabold text-app">{issue.title}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-muted">{issue.detail ?? scannerLabel(t, issue.scanner)}</span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-app">{scannerLabel(t, issue.scanner)}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{formatDate(issue.detectedAt)}</span>
      </span>
      <span className="min-w-0 text-xs text-muted">
        <span className="block truncate">{issue.targetType ?? t.adminSystem.dqSystemTarget}</span>
        <span className="mt-0.5 block truncate font-semibold text-app">{issue.targetId ?? issue.id}</span>
      </span>
      <span className="lg:justify-self-end"><SeverityBadge severity={issue.severity} /></span>
    </button>
  )
}

function IssueDetail({ issue, scanId, checkedAt }: { issue: AdminDataQualityIssue | null; scanId: string | null; checkedAt: string | null }) {
  const t = useT()
  return (
    <Card className="p-5 xl:sticky xl:top-6">
      {issue ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{t.adminSystem.dqDetailLabel}</p>
              <h3 className="mt-1 text-lg font-extrabold text-app">{issue.title}</h3>
            </div>
            <SeverityBadge severity={issue.severity} />
          </div>

          <p className="text-sm leading-6 text-muted">{issue.detail ?? t.adminSystem.dqDetailEmpty}</p>

          <div className="grid gap-2 text-sm">
            <MetaRow label={t.adminSystem.dqFieldScanner} value={scannerLabel(t, issue.scanner)} />
            <MetaRow label={t.adminSystem.dqFieldTarget} value={`${issue.targetType ?? t.adminSystem.dqSystemTarget} / ${issue.targetId ?? issue.id}`} />
            <MetaRow label={t.adminSystem.dqFieldScanId} value={scanId ?? t.adminSystem.dqScanIdMissing} />
            <MetaRow label={t.adminSystem.dqFieldCheckedAt} value={checkedAt ? formatDate(checkedAt) : formatDate(issue.detectedAt)} />
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{t.adminSystem.dqMetadataLabel}</p>
            <pre className="max-h-[18rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-xs leading-5 text-app">
              {JSON.stringify(issue.metadata, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <DatabaseZap size={20} />
          </div>
          <p className="mt-3 font-bold text-app">{t.adminSystem.dqNoIssuesTitle}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{t.adminSystem.dqNoIssuesDescription}</p>
        </div>
      )}
    </Card>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'neg' | 'warn' | 'muted' }) {
  const color = tone === 'pos'
    ? 'text-pos'
    : tone === 'neg'
      ? 'text-neg'
      : tone === 'warn'
        ? 'text-amber-600 dark:text-amber-300'
        : tone === 'brand'
          ? 'text-brand-600 dark:text-brand-300'
          : 'text-muted'
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${color}`}>{value}</p>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-app">{value}</p>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: AdminDataQualitySeverity }) {
  const t = useT()
  if (severity === 'critical') return <Badge tone="neg">{t.adminSystem.severityCritical}</Badge>
  if (severity === 'warning') return <Badge tone="muted" className="text-amber-600 dark:text-amber-300">{t.adminSystem.severityWarning}</Badge>
  return <Badge tone="brand">{t.adminSystem.severityInfo}</Badge>
}

function SeverityIcon({ severity }: { severity: AdminDataQualitySeverity }) {
  if (severity === 'critical') return <AlertTriangle size={16} className="shrink-0 text-neg" />
  if (severity === 'warning') return <FileWarning size={16} className="shrink-0 text-amber-600 dark:text-amber-300" />
  return <Bug size={16} className="shrink-0 text-brand-600 dark:text-brand-300" />
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(getIntlLocale()).format(value)
}
