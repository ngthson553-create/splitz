import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Ban, CheckCircle2, Clock3, RefreshCw, Search, ShieldCheck, UserPlus } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Input, Segmented } from '../../components/ui'
import { t, useT } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import {
  disableAdminAccess,
  loadAdminAccessSnapshot,
  normalizeAdminAccessRole,
  searchAdminAccessProfiles,
  upsertAdminAccess,
  type AdminAccessCandidate,
  type AdminAccessRole,
  type AdminAccessSnapshot,
  type AdminAccessStatus,
} from '../../lib/adminAccess'

const ROLE_OPTIONS: { value: AdminAccessRole; label: string }[] = [
  { value: 'support', label: 'Support' },
  { value: 'readonly', label: 'Readonly' },
  { value: 'operator', label: 'Operator' },
  { value: 'owner', label: 'Owner' },
]

const ROLE_LABEL: Record<AdminAccessRole, string> = {
  owner: 'Owner',
  operator: 'Operator',
  support: 'Support',
  readonly: 'Readonly',
}

function formatDate(value: string | null | undefined) {
  const unknown = t().adminOps.access.unknown
  if (!value) return unknown
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? unknown : new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function roleTone(role: AdminAccessRole): 'brand' | 'pos' | 'muted' {
  if (role === 'owner') return 'brand'
  if (role === 'operator') return 'pos'
  return 'muted'
}

export function ConsoleAdminAccessPage() {
  const t = useT()
  const [snapshot, setSnapshot] = useState<AdminAccessSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<AdminAccessCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedRole, setSelectedRole] = useState<AdminAccessRole>('support')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [disableTarget, setDisableTarget] = useState<string | null>(null)
  const [disableReason, setDisableReason] = useState('')
  const [disableConfirmed, setDisableConfirmed] = useState(false)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminAccessSnapshot()
    setSnapshot(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSnapshot()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadSnapshot])

  const summary = snapshot?.summary ?? { total: 0, active: 0, disabled: 0, owners: 0 }
  const adminIds = useMemo(() => new Set((snapshot?.admins ?? []).map((admin) => admin.userId)), [snapshot])
  const statusLabel: Record<AdminAccessStatus, string> = {
    active: t.adminOps.access.statusActive,
    disabled: t.adminOps.access.statusDisabled,
  }

  async function handleSearch() {
    const clean = query.trim()
    if (!clean) {
      setNotice(t.adminOps.access.queryRequired)
      setCandidates([])
      return
    }
    setSearching(true)
    setNotice(null)
    const rows = await searchAdminAccessProfiles(undefined, clean)
    setCandidates(rows)
    setSearching(false)
    if (rows.length === 0) setNotice(t.adminOps.access.noProfiles)
  }

  async function handleGrant(candidate: AdminAccessCandidate) {
    if (!reason.trim() || !confirmed) {
      setNotice(t.adminOps.access.grantRequirements)
      return
    }
    const ok = await upsertAdminAccess(undefined, {
      userId: candidate.userId,
      role: normalizeAdminAccessRole(selectedRole),
      status: 'active',
      reason: reason.trim(),
    })
    setNotice(ok ? t.adminOps.access.grantSubmitted : t.adminOps.access.grantFailed)
    if (ok) {
      setReason('')
      setConfirmed(false)
      await loadSnapshot()
    }
  }

  async function handleDisable(userId: string) {
    if (disableTarget !== userId) {
      setDisableTarget(userId)
      setDisableReason('')
      setDisableConfirmed(false)
      setNotice(t.adminOps.access.disableHint)
      return
    }
    if (!disableReason.trim() || !disableConfirmed) {
      setNotice(t.adminOps.access.disableRequirements)
      return
    }
    const ok = await disableAdminAccess(undefined, { userId, reason: disableReason.trim() })
    setNotice(ok ? t.adminOps.access.disabled : t.adminOps.access.disableFailed)
    if (ok) {
      setDisableTarget(null)
      setDisableReason('')
      setDisableConfirmed(false)
      await loadSnapshot()
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
              <ShieldCheck size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">Owner-only</Badge>
                <Badge tone="muted">{t.adminOps.access.badgeHidden}</Badge>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-app">{t.adminOps.access.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                {t.adminOps.access.description}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading}>
            <RefreshCw size={16} /> {t.adminOps.access.reload}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label={t.adminOps.access.labelTotal} value={summary.total} />
          <SummaryPill label={t.adminOps.access.labelActive} value={summary.active} tone="pos" />
          <SummaryPill label={t.adminOps.access.labelDisabled} value={summary.disabled} tone="muted" />
          <SummaryPill label="Owner" value={summary.owners} tone="brand" />
        </div>
      </Card>

      {notice && (
        <div className="rounded-2xl border border-brand-400/20 bg-brand-500/8 p-4 text-sm font-semibold text-app">
          <div className="flex items-start gap-2">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
            <span>{notice}</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-app">{t.adminOps.access.listTitle}</h3>
              <p className="text-xs text-muted">{t.adminOps.access.listSubtitle}</p>
            </div>
            <Badge tone="muted">{t.adminOps.access.updatedAt({ time: formatDate(snapshot?.checkedAt) })}</Badge>
          </div>

          {loading ? (
            <EmptyState icon={<Clock3 size={24} />} title={t.adminOps.access.loadingTitle} description={t.adminOps.access.loadingDescription} />
          ) : snapshot && snapshot.admins.length > 0 ? (
            <div className="mt-4 space-y-3">
              {snapshot.admins.map((admin) => (
                <div key={admin.userId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar name={admin.displayName ?? admin.email} src={admin.avatarUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-app">{admin.email}</p>
                        <p className="text-xs text-muted">{admin.displayName ?? t.adminOps.access.noDisplayName}</p>
                        <p className="mt-1 text-xs text-faint">{t.adminOps.access.createdBy({ name: admin.createdByEmail ?? t.adminOps.access.unknownCreator, time: formatDate(admin.createdAt) })}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      <Badge tone={roleTone(admin.role)}>{ROLE_LABEL[admin.role]}</Badge>
                      <Badge tone={admin.status === 'active' ? 'pos' : 'muted'}>{statusLabel[admin.status]}</Badge>
                    </div>
                  </div>

                  {admin.status === 'active' && (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      {disableTarget === admin.userId && (
                        <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <Input value={disableReason} onChange={(event) => setDisableReason(event.target.value)} placeholder={t.adminOps.access.disableReasonPlaceholder} />
                          <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-xs font-semibold text-muted">
                            <input type="checkbox" checked={disableConfirmed} onChange={(event) => setDisableConfirmed(event.target.checked)} />
                            {t.adminOps.access.confirm}
                          </label>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => void handleDisable(admin.userId)}>
                        <Ban size={15} /> {t.adminOps.access.disable}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<ShieldCheck size={24} />} title={t.adminOps.access.emptyTitle} description={t.adminOps.access.emptyDescription} />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-brand-600 dark:text-brand-300" />
              <h3 className="font-bold text-app">{t.adminOps.access.addTitle}</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">{t.adminOps.access.addSubtitle}</p>

            <div className="mt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.adminOps.access.queryPlaceholder} />
                <Button variant="secondary" onClick={() => void handleSearch()} disabled={searching}>
                  <Search size={16} /> {t.adminOps.access.searchProfile}
                </Button>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-semibold text-muted">{t.adminOps.access.roleLabel}</p>
                <Segmented options={ROLE_OPTIONS} value={selectedRole} onChange={setSelectedRole} />
              </div>

              <label className="block space-y-1.5">
                <span className="text-[13px] font-semibold text-muted">{t.adminOps.access.reasonLabel}</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-3.5 py-3 text-sm text-app outline-none transition placeholder:text-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                  placeholder={t.adminOps.access.reasonPlaceholder}
                />
              </label>

              <label className="flex items-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-semibold text-muted">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" />
                <span>{t.adminOps.access.confirmText}</span>
              </label>
            </div>

            <div className="mt-4 space-y-2">
              {candidates.map((candidate) => (
                <div key={candidate.userId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar name={candidate.displayName ?? candidate.email} src={candidate.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-app">{candidate.email}</p>
                        <p className="text-xs text-muted">{candidate.displayName ?? t.adminOps.access.noName} · {formatDate(candidate.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {(candidate.alreadyAdmin || adminIds.has(candidate.userId)) && <Badge tone="muted">{t.adminOps.access.alreadyAdmin}</Badge>}
                      <Button size="sm" onClick={() => void handleGrant(candidate)}>
                        <CheckCircle2 size={15} /> {t.adminOps.access.grant}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-brand-600 dark:text-brand-300" />
              <h3 className="font-bold text-app">{t.adminOps.access.recentAuditTitle}</h3>
            </div>
            <div className="mt-4 space-y-2">
              {(snapshot?.recentChanges ?? []).length > 0 ? (
                snapshot?.recentChanges.map((change) => (
                  <div key={change.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="text-sm font-bold text-app">{change.action}</p>
                    <p className="mt-1 text-xs text-muted">{change.actorEmail ?? 'Admin'} · {formatDate(change.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">{t.adminOps.access.noRecentAudit}</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SummaryPill({ label, value, tone = 'muted' }: { label: string; value: number; tone?: 'brand' | 'pos' | 'muted' }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-app">{value}</p>
      <div className="mt-2"><Badge tone={tone}>Snapshot</Badge></div>
    </div>
  )
}
