import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, CircleDashed, Clock3, LockKeyhole, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Segmented } from '../../components/ui'
import { useT, t } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import { listAdminAuditLogs, type AdminAuditLog, type AdminAuditStatus } from '../../lib/adminAudit'
import { consoleModuleGroups, consoleModules, pathForConsoleModule, type ConsoleModule } from './consoleModules'
import { ConsoleAiPage } from './ConsoleAiPage'
import { ConsoleBillingPage } from './ConsoleBillingPage'
import { ConsoleConfigPage } from './ConsoleConfigPage'
import { ConsoleDataQualityPage } from './ConsoleDataQualityPage'
import { ConsoleEmailPage } from './ConsoleEmailPage'
import { ConsoleHealthPage } from './ConsoleHealthPage'
import { ConsoleJobsPage } from './ConsoleJobsPage'
import { ConsoleNotificationsPage } from './ConsoleNotificationsPage'
import { ConsoleRedeemPage } from './ConsoleRedeemPage'
import { ConsoleReleasesPage } from './ConsoleReleasesPage'
import { ConsoleSupportPage } from './ConsoleSupportPage'
import { ConsoleAdminAccessPage } from './ConsoleAdminAccessPage'

export { ConsoleAiPage } from './ConsoleAiPage'
export { ConsoleBillingPage } from './ConsoleBillingPage'
export { ConsoleConfigPage } from './ConsoleConfigPage'
export { ConsoleDataQualityPage } from './ConsoleDataQualityPage'
export { ConsoleEmailPage } from './ConsoleEmailPage'
export { ConsoleHealthPage } from './ConsoleHealthPage'
export { ConsoleJobsPage } from './ConsoleJobsPage'
export { ConsoleNotificationsPage } from './ConsoleNotificationsPage'
export { ConsoleRedeemPage } from './ConsoleRedeemPage'
export { ConsoleReleasesPage } from './ConsoleReleasesPage'
export { ConsoleSupportPage } from './ConsoleSupportPage'
export { ConsoleAdminAccessPage } from './ConsoleAdminAccessPage'

type AuditStatusFilter = 'all' | AdminAuditStatus

function getHomeModule(id: string): ConsoleModule {
  const module = consoleModules.find((item) => item.id === id)
  if (!module) throw new Error(`Missing console module: ${id}`)
  return module
}

type GuidedTask = {
  id: string
  moduleId: string
  title: string
  description: string
  badge: string
  beforeYouStart: string[]
  steps: string[]
  confirmNote: string
  actionLabel: string
}

type SmartIssue = {
  id: string
  moduleId: string
  priority: 'high' | 'medium' | 'low'
  title: string
  signal: string
  nextStep: string
  actionLabel: string
}

// Việc nhanh dựng theo ngôn ngữ hiện hành — gọi lại mỗi lần render.
function guidedTasks(): GuidedTask[] {
  const d = t().adminPages
  return [
    { id: 'redeem', moduleId: 'redeem', ...d.guided.redeem },
    { id: 'notifications', moduleId: 'notifications', ...d.guided.notifications },
    { id: 'support', moduleId: 'support', ...d.guided.support },
    { id: 'config', moduleId: 'config', ...d.guided.config },
    { id: 'releases', moduleId: 'releases', ...d.guided.releases },
    { id: 'email', moduleId: 'email', ...d.guided.email },
  ]
}

function getGuidedTask(id: string) {
  const task = guidedTasks().find((item) => item.id === id)
  if (!task) throw new Error(`Missing guided task: ${id}`)
  return task
}

// Ưu tiên của ngày dựng theo ngôn ngữ hiện hành.
function smartIssues(): SmartIssue[] {
  const d = t().adminPages
  return [
    { id: 'health', moduleId: 'health', priority: 'high', ...d.issues.health },
    { id: 'jobs', moduleId: 'jobs', priority: 'high', ...d.issues.jobs },
    { id: 'data-quality', moduleId: 'data-quality', priority: 'medium', ...d.issues.dataQuality },
    { id: 'audit', moduleId: 'audit', priority: 'low', ...d.issues.audit },
  ]
}

function priorityLabel(priority: SmartIssue['priority']) {
  const d = t().adminPages.priority
  if (priority === 'high') return d.high
  if (priority === 'medium') return d.medium
  return d.low
}

function priorityTone(priority: SmartIssue['priority']): 'brand' | 'pos' | 'muted' {
  if (priority === 'high') return 'brand'
  if (priority === 'medium') return 'muted'
  return 'pos'
}

// Formatter ngày audit dùng locale theo ngôn ngữ app (không hard-code vi-VN).
let auditDateLocale = ''
let auditDateFormatter: Intl.DateTimeFormat | null = null
function getAuditDateFormatter(): Intl.DateTimeFormat {
  const locale = getIntlLocale()
  if (!auditDateFormatter || auditDateLocale !== locale) {
    auditDateLocale = locale
    auditDateFormatter = new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }
  return auditDateFormatter
}

export function ConsoleHomePage() {
  const t = useT()
  const d = t.adminPages.home
  const [selectedTaskId, setSelectedTaskId] = useState('redeem')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const selectedTask = getGuidedTask(selectedTaskId)
  const selectedTaskModule = getHomeModule(selectedTask.moduleId)
  const issues = smartIssues()
  const tasks = guidedTasks()
  const quickGuides = [d.guideNoLinkInApp, d.guideNoSecretFrontend, d.guideUserRedirect]

  return (
    <div className="space-y-5">
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <Card className="relative overflow-hidden p-5 lg:p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-brand-400/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 18</Badge>
              <Badge tone="muted">{d.advancedModeBadge}</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-app lg:text-3xl">{d.today}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {d.intro}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <StatusPill label={d.securityLabel} value={d.securityValue} tone="pos" />
              <StatusPill label={d.auditLabel} value={d.auditValue} tone="pos" />
              <StatusPill label={d.priorityLabel} value={d.priorityValue} tone="brand" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
              <ShieldCheck size={20} />
            </span>
            <div>
              <p className="font-bold text-app">{d.quickGuideTitle}</p>
              <p className="text-xs text-muted">{d.quickGuideSubtitle}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {quickGuides.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-pos" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-app">{d.prioritiesTitle}</h2>
            <p className="text-xs text-muted">{d.prioritiesDescription}</p>
          </div>
          <Badge tone="muted">{d.noHiddenScan}</Badge>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {issues.map((issue) => {
            const module = getHomeModule(issue.moduleId)
            return (
              <Card key={issue.id} className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
                      <module.icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={priorityTone(issue.priority)}>{priorityLabel(issue.priority)}</Badge>
                        <Badge tone="muted">{module.label}</Badge>
                      </div>
                      <h3 className="mt-2 text-sm font-extrabold text-app">{issue.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted">{issue.signal}</p>
                    </div>
                  </div>
                  <Link
                    to={pathForConsoleModule(module)}
                    className="press inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-solid)] px-3 text-xs font-bold text-app shadow-soft transition hover:border-brand-400/40"
                  >
                    {issue.actionLabel} <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{d.suggestedNextStep}</p>
                  <p className="mt-1 text-sm leading-6 text-app">{issue.nextStep}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-app">{d.quickTasksTitle}</h2>
            <p className="text-xs text-muted">{d.quickTasksDescription}</p>
          </div>
          <Badge tone="brand">{d.guidedBadge}</Badge>
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {tasks.map((task) => {
              const module = getHomeModule(task.moduleId)
              const active = task.id === selectedTaskId
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => setSelectedTaskId(task.id)}
                  aria-pressed={active}
                  className={`card press hover-lift block p-4 text-left transition ${active ? 'ring-2 ring-brand-400/40' : ''}`}
                >
                  <div className="flex min-h-28 flex-col justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
                        <module.icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-extrabold text-app">{task.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{task.description}</span>
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-300">
                      {task.badge} <ArrowRight size={14} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <Card className="p-5 lg:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{d.guidedFlowBadge}</Badge>
              <Badge tone="muted">{selectedTask.badge}</Badge>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
                <selectedTaskModule.icon size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-extrabold text-app">{selectedTask.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{selectedTask.description}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{d.beforeYouStart}</p>
                <ul className="mt-2 space-y-2 text-sm text-muted">
                  {selectedTask.beforeYouStart.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-pos" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{d.steps}</p>
                <ol className="mt-2 space-y-2 text-sm text-muted">
                  {selectedTask.steps.map((item, index) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/12 text-[11px] font-bold text-brand-600 dark:text-brand-300">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-brand-400/20 bg-brand-500/8 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{d.confirmReminder}</p>
              <p className="mt-1 text-sm leading-6 text-app">{selectedTask.confirmNote}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={pathForConsoleModule(selectedTaskModule)}
                className="press inline-flex h-10 items-center justify-center gap-2 rounded-2xl gradient-brand px-4 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
              >
                {selectedTask.actionLabel} <ArrowRight size={16} />
              </Link>
              <Badge tone="muted">{d.noHiddenActions}</Badge>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-brand-600 dark:text-brand-300" />
            <h2 className="font-bold text-app">{d.quickHealthTitle}</h2>
          </div>
          <div className="mt-4 space-y-2">
            <StatusPill label={d.healthSystemLabel} value={d.healthSystemValue} tone="brand" />
            <StatusPill label={d.healthJobsLabel} value={d.healthJobsValue} tone="muted" />
            <StatusPill label={d.healthDataLabel} value={d.healthDataValue} tone="pos" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 size={18} className="text-brand-600 dark:text-brand-300" />
                <h2 className="font-bold text-app">{d.advancedTitle}</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">
                {advancedOpen
                  ? d.advancedDeepOnly
                  : d.advancedOffHint}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAdvancedOpen((value) => !value)}
              aria-pressed={advancedOpen}
            >
              {advancedOpen ? d.hideAdvanced : d.showAdvanced}
            </Button>
          </div>
          {advancedOpen ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone="pos">{d.advancedOnBadge}</Badge>
                <Badge tone="muted">{t.adminPages.home.moduleCount({ n: consoleModules.length })}</Badge>
                <Badge tone="brand">{d.advancedShortBadge}</Badge>
                <Badge tone="muted">{d.notForDailyTasks}</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {consoleModuleGroups.map((group) => (
                  <div key={group} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{t.adminPages.group[group]}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {consoleModules
                        .filter((module) => module.group === group)
                        .map((module) => (
                          <Link
                            key={module.id}
                            to={pathForConsoleModule(module)}
                            className="press inline-flex min-h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 py-2 text-xs font-bold text-muted transition hover:text-app"
                          >
                            <module.icon size={14} />
                            <span>{module.label}</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-2xl border border-brand-400/20 bg-brand-500/8 p-4">
              <p className="text-sm font-semibold text-app">{d.advancedClosedTitle}</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {d.advancedDeepOnly}
              </p>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}

export function ConsoleModulePage({ module }: { module: ConsoleModule }) {
  const t = useT()
  const d = t.adminPages.modulePage

  if (module.id === 'ai') return <ConsoleAiPage />
  if (module.id === 'billing') return <ConsoleBillingPage />
  if (module.id === 'config') return <ConsoleConfigPage />
  if (module.id === 'data-quality') return <ConsoleDataQualityPage />
  if (module.id === 'email') return <ConsoleEmailPage />
  if (module.id === 'health') return <ConsoleHealthPage />
  if (module.id === 'jobs') return <ConsoleJobsPage />
  if (module.id === 'notifications') return <ConsoleNotificationsPage />
  if (module.id === 'redeem') return <ConsoleRedeemPage />
  if (module.id === 'releases') return <ConsoleReleasesPage />
  if (module.id === 'support') return <ConsoleSupportPage />
  if (module.id === 'admin-access') return <ConsoleAdminAccessPage />
  if (module.id === 'audit') return <ConsoleAuditPage />

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
              <module.icon size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{t.adminPages.group[module.group]}</Badge>
                <Badge tone="muted">{d.notImplementedBadge}</Badge>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-app">{module.label}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{module.summary}</p>
            </div>
          </div>
          <Button variant="secondary" disabled>
            <LockKeyhole size={16} /> {d.actionLocked}
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <CircleDashed size={18} className="text-brand-600 dark:text-brand-300" />
            <h3 className="font-bold text-app">{d.scopeTitle}</h3>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {module.bullets.map((item) => (
              <div key={item} className="surface-sunken rounded-2xl border border-[var(--border)] p-3 text-sm font-semibold text-app">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="font-bold text-app">{d.phaseStatusTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {d.phaseStatusDescription}
          </p>
          <div className="mt-4 space-y-2 text-xs font-semibold text-muted">
            <StatusPill label={d.apiLabel} value={d.apiNotCalled} tone="muted" />
            <StatusPill label={d.auditLabel} value={d.auditPhaseValue} tone="brand" />
            <StatusPill label={d.confirmLabel} value={d.confirmLaterValue} tone="pos" />
          </div>
        </Card>
      </div>
    </div>
  )
}

export function ConsoleAuditPage() {
  const t = useT()
  const d = t.adminPages.audit
  const [status, setStatus] = useState<AuditStatusFilter>('all')
  const [action, setAction] = useState('')
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const auditStatusOptions: { value: AuditStatusFilter; label: string }[] = [
    { value: 'all', label: d.filterAll },
    { value: 'success', label: d.success },
    { value: 'failed', label: d.failed },
  ]

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const rows = await listAdminAuditLogs(undefined, {
      status: status === 'all' ? undefined : status,
      action,
      limit: 50,
    })
    setLogs(rows)
    setSelectedId((current) => (current && rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null))
    setLoading(false)
  }, [action, status])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLogs()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadLogs])

  const selected = useMemo(
    () => logs.find((row) => row.id === selectedId) ?? logs[0] ?? null,
    [logs, selectedId],
  )
  const successCount = logs.filter((row) => row.status === 'success').length
  const failedCount = logs.filter((row) => row.status === 'failed').length

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{d.phaseBadge}</Badge>
              <Badge tone="pos">{d.rpcBadge}</Badge>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-app">{d.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {d.description}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadLogs()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} /> {d.refresh}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <StatusPill label={d.viewingLabel} value={String(logs.length)} tone="brand" />
          <StatusPill label={d.success} value={String(successCount)} tone="pos" />
          <StatusPill label={d.failed} value={String(failedCount)} tone={failedCount > 0 ? 'muted' : 'pos'} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-3 min-w-0">
          <Card className="p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <Input
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  placeholder={d.filterPlaceholder}
                  className="pl-9"
                />
              </label>
              <Segmented options={auditStatusOptions} value={status} onChange={setStatus} />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            {loading && logs.length === 0 ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck size={28} />}
                title={d.emptyTitle}
                description={d.emptyDescription}
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setSelectedId(log.id)}
                    aria-pressed={selected?.id === log.id}
                    className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(11rem,0.8fr)_minmax(12rem,1fr)_minmax(9rem,0.65fr)_8rem] lg:items-center ${
                      selected?.id === log.id ? 'bg-brand-500/8' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-app">{log.action}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{formatAuditDate(log.createdAt)}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-app">{log.actorEmail ?? d.unknownActor}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{log.actorRole ?? d.unknownRole}</span>
                    </span>
                    <span className="min-w-0 text-xs text-muted">
                      <span className="block truncate">{log.targetType ?? d.systemTarget}</span>
                      <span className="mt-0.5 block truncate font-semibold text-app">{log.targetId ?? log.id}</span>
                    </span>
                    <span className="lg:justify-self-end">
                      <AuditStatusBadge status={log.status} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </section>

        <AuditDetailPanel log={selected} />
      </div>
    </div>
  )
}

function AuditDetailPanel({ log }: { log: AdminAuditLog | null }) {
  const t = useT()
  const d = t.adminPages.audit
  return (
    <aside className="card h-fit p-5 xl:sticky xl:top-6">
      {log ? (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{d.detailTitle}</p>
              <h3 className="mt-1 truncate text-lg font-extrabold text-app">{log.action}</h3>
            </div>
            <AuditStatusBadge status={log.status} />
          </div>

          <div className="grid gap-2 text-sm">
            <AuditMetaRow label={d.actorLabel} value={log.actorEmail ?? log.actorUserId ?? d.unknown} />
            <AuditMetaRow label={d.roleLabel} value={log.actorRole ?? d.unknownRoleShort} />
            <AuditMetaRow label={d.timeLabel} value={formatAuditDate(log.createdAt)} />
            <AuditMetaRow label={d.targetLabel} value={`${log.targetType ?? d.systemTarget} / ${log.targetId ?? log.id}`} />
          </div>

          {log.errorMessage && (
            <div className="rounded-2xl border border-neg/20 bg-neg/10 p-3 text-sm text-neg">
              <div className="mb-1 flex items-center gap-2 font-bold">
                <AlertCircle size={16} /> {d.errorLabel}
              </div>
              <p className="break-words leading-6">{log.errorMessage}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">{d.payloadSummary}</p>
            <pre className="max-h-[24rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-xs leading-5 text-app">
              {formatAuditPayload(log.payloadSummary)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <Clock3 size={20} />
          </div>
          <p className="mt-3 font-bold text-app">{d.noLogTitle}</p>
          <p className="mt-1 text-sm leading-6 text-muted">{d.noLogDescription}</p>
        </div>
      )}
    </aside>
  )
}

function AuditMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-app">{value}</p>
    </div>
  )
}

function AuditStatusBadge({ status }: { status: AdminAuditStatus }) {
  const t = useT()
  const d = t.adminPages.audit
  return <Badge tone={status === 'success' ? 'pos' : 'neg'}>{status === 'success' ? d.success : d.failed}</Badge>
}

function formatAuditDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : getAuditDateFormatter().format(date)
}

function formatAuditPayload(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return String(value ?? '')
  }
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'brand' | 'pos' | 'muted'
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${tone === 'pos' ? 'text-pos' : tone === 'brand' ? 'text-brand-600 dark:text-brand-300' : 'text-muted'}`}>
        {value}
      </p>
    </div>
  )
}
