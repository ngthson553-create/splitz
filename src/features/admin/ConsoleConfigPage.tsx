import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Save, ShieldAlert, SlidersHorizontal, ToggleLeft } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Segmented } from '../../components/ui'
import { useT, type Dict } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import {
  loadAdminConfigSnapshot,
  saveAdminDisclaimer,
  saveAdminFeatureFlags,
  saveAdminLimits,
  saveAdminMaintenance,
  type AdminConfigDisclaimer,
  type AdminConfigFlag,
  type AdminConfigFlagCategory,
  type AdminConfigFlagKey,
  type AdminConfigLimits,
  type AdminConfigMaintenance,
  type AdminConfigMaintenanceSeverity,
  type AdminConfigSnapshot,
} from '../../lib/adminConfig'

type ConfigView = 'flags' | 'limits' | 'maintenance' | 'disclaimer'

export function ConsoleConfigPage() {
  const t = useT()
  const [snapshot, setSnapshot] = useState<AdminConfigSnapshot | null>(null)
  const [view, setView] = useState<ConfigView>('flags')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [flagsDraft, setFlagsDraft] = useState<Partial<Record<AdminConfigFlagKey, boolean>>>({})
  const [limitsDraft, setLimitsDraft] = useState<AdminConfigLimits | null>(null)
  const [maintenanceDraft, setMaintenanceDraft] = useState<Omit<AdminConfigMaintenance, 'updatedAt'> | null>(null)
  const [disclaimerDraft, setDisclaimerDraft] = useState<Omit<AdminConfigDisclaimer, 'updatedAt'> | null>(null)
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const hydrateDrafts = useCallback((next: AdminConfigSnapshot | null) => {
    if (!next) return
    setFlagsDraft(Object.fromEntries(next.flags.map((flag) => [flag.key, flag.enabled])) as Partial<Record<AdminConfigFlagKey, boolean>>)
    setLimitsDraft(next.limits)
    setMaintenanceDraft({
      enabled: next.maintenance.enabled,
      title: next.maintenance.title,
      message: next.maintenance.message,
      severity: next.maintenance.severity,
      startsAt: next.maintenance.startsAt,
      endsAt: next.maintenance.endsAt,
    })
    setDisclaimerDraft({ payment: next.disclaimer.payment, legal: next.disclaimer.legal })
  }, [])

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminConfigSnapshot()
    setSnapshot(next)
    hydrateDrafts(next)
    setNotice(next ? null : t.adminSystem.cfgLoadFailed)
    setLoading(false)
  }, [hydrateDrafts, t])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshot()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadSnapshot])

  const enabledCount = snapshot?.flags.filter((flag) => flagsDraft[flag.key] ?? flag.enabled).length ?? 0
  const disabledDangerousCount = snapshot?.flags.filter((flag) => flag.dangerous && !(flagsDraft[flag.key] ?? flag.enabled)).length ?? 0
  const flagGroups = useMemo(() => groupFlags(snapshot?.flags ?? []), [snapshot?.flags])

  function approvalReady() {
    if (!reason.trim()) {
      setNotice(t.adminSystem.cfgReasonRequired)
      return false
    }
    if (!confirmed) {
      setNotice(t.adminSystem.cfgConfirmRequired)
      return false
    }
    return true
  }

  async function refreshAfterSave(message: string) {
    setNotice(message)
    setConfirmed(false)
    setReason('')
    await loadSnapshot()
  }

  async function onSaveFlags() {
    if (!approvalReady()) return
    const ok = window.confirm(t.adminSystem.cfgConfirmSaveFlags)
    if (!ok) return
    setBusy(true)
    const saved = await saveAdminFeatureFlags(undefined, { flags: flagsDraft, reason })
    setBusy(false)
    if (saved) await refreshAfterSave(t.adminSystem.cfgSavedFlags)
    else setNotice(t.adminSystem.cfgSaveFlagsFailed)
  }

  async function onSaveLimits() {
    if (!limitsDraft || !approvalReady()) return
    const ok = window.confirm(t.adminSystem.cfgConfirmSaveLimits)
    if (!ok) return
    setBusy(true)
    const saved = await saveAdminLimits(undefined, { limits: limitsDraft, reason })
    setBusy(false)
    if (saved) await refreshAfterSave(t.adminSystem.cfgSavedLimits)
    else setNotice(t.adminSystem.cfgSaveLimitsFailed)
  }

  async function onSaveMaintenance() {
    if (!maintenanceDraft || !approvalReady()) return
    const ok = window.confirm(t.adminSystem.cfgConfirmSaveMaintenance)
    if (!ok) return
    setBusy(true)
    const saved = await saveAdminMaintenance(undefined, { maintenance: maintenanceDraft, reason })
    setBusy(false)
    if (saved) await refreshAfterSave(t.adminSystem.cfgSavedMaintenance)
    else setNotice(t.adminSystem.cfgSaveMaintenanceFailed)
  }

  async function onSaveDisclaimer() {
    if (!disclaimerDraft || !approvalReady()) return
    setBusy(true)
    const saved = await saveAdminDisclaimer(undefined, { disclaimer: disclaimerDraft, reason })
    setBusy(false)
    if (saved) await refreshAfterSave(t.adminSystem.cfgSavedDisclaimer)
    else setNotice(t.adminSystem.cfgSaveDisclaimerFailed)
  }

  const viewOptions: { value: ConfigView; label: string }[] = [
    { value: 'flags', label: t.adminSystem.cfgViewFlags },
    { value: 'limits', label: t.adminSystem.cfgViewLimits },
    { value: 'maintenance', label: t.adminSystem.cfgViewMaintenance },
    { value: 'disclaimer', label: t.adminSystem.cfgViewDisclaimer },
  ]

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 10</Badge>
              <ConfigStatusBadge status={snapshot?.summaryStatus ?? 'unknown'} />
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">{t.adminSystem.cfgTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t.adminSystem.cfgDescription}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading || busy}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {t.adminSystem.refresh}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label={t.adminSystem.cfgPillFlagsOn} value={formatNumber(enabledCount)} tone="brand" />
          <SummaryPill label={t.adminSystem.cfgPillKillSwitchOff} value={formatNumber(disabledDangerousCount)} tone={disabledDangerousCount > 0 ? 'warn' : 'pos'} />
          <SummaryPill label={t.adminSystem.cfgPillMaintenance} value={maintenanceDraft?.enabled ? t.adminSystem.on : t.adminSystem.disabledShort} tone={maintenanceDraft?.enabled ? 'warn' : 'pos'} />
          <SummaryPill label={t.adminSystem.cfgPillCheckedAt} value={snapshot ? formatDate(snapshot.checkedAt) : loading ? t.adminSystem.loading : '-'} tone="brand" />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,34rem)] lg:items-center">
          <Segmented options={viewOptions} value={view} onChange={setView} />
          <ApprovalPanel reason={reason} confirmed={confirmed} onReasonChange={setReason} onConfirmedChange={setConfirmed} />
        </div>
      </Card>

      {loading && !snapshot ? (
        <LoadingState />
      ) : !snapshot ? (
        <EmptyState icon={<SlidersHorizontal size={28} />} title={t.adminSystem.cfgSnapshotEmptyTitle} description={t.adminSystem.cfgSnapshotEmptyDescription} />
      ) : (
        <>
          {view === 'flags' && <FlagsView groups={flagGroups} draft={flagsDraft} onToggle={(key) => setFlagsDraft((current) => ({ ...current, [key]: !(current[key] ?? false) }))} onSave={() => void onSaveFlags()} busy={busy} />}
          {view === 'limits' && limitsDraft && <LimitsView limits={limitsDraft} onChange={setLimitsDraft} onSave={() => void onSaveLimits()} busy={busy} />}
          {view === 'maintenance' && maintenanceDraft && <MaintenanceView maintenance={maintenanceDraft} onChange={setMaintenanceDraft} onSave={() => void onSaveMaintenance()} busy={busy} />}
          {view === 'disclaimer' && disclaimerDraft && <DisclaimerView disclaimer={disclaimerDraft} onChange={setDisclaimerDraft} changes={snapshot.recentChanges} onSave={() => void onSaveDisclaimer()} busy={busy} />}
        </>
      )}
    </div>
  )
}

function FlagsView({ groups, draft, onToggle, onSave, busy }: { groups: Map<AdminConfigFlagCategory, AdminConfigFlag[]>; draft: Partial<Record<AdminConfigFlagKey, boolean>>; onToggle: (key: AdminConfigFlagKey) => void; onSave: () => void; busy: boolean }) {
  const t = useT()
  const groupLabels: Record<AdminConfigFlagCategory, string> = {
    ai: 'AI',
    growth: 'Growth',
    ops: 'Operations',
    auth: 'Auth',
    system: t.adminSystem.cfgFlagGroupSystem,
  }
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([group, flags]) => (
        <Card key={group} className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-app">{groupLabels[group]}</h3>
              <p className="mt-1 text-sm text-muted">{t.adminSystem.cfgFlagsGroupHint}</p>
            </div>
            <Badge tone="muted">{flags.length}</Badge>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {flags.map((flag) => <FlagRow key={flag.key} flag={flag} enabled={draft[flag.key] ?? flag.enabled} onToggle={() => onToggle(flag.key)} />)}
          </div>
        </Card>
      ))}
      <SaveBar onSave={onSave} busy={busy} label={t.adminSystem.cfgSaveFlagsButton} />
    </div>
  )
}

function FlagRow({ flag, enabled, onToggle }: { flag: AdminConfigFlag; enabled: boolean; onToggle: () => void }) {
  const t = useT()
  return (
    <button type="button" onClick={onToggle} className="press rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition hover:border-brand-400/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-extrabold text-app">{flag.label}</p>
            {flag.dangerous && <Badge tone="neg">Kill switch</Badge>}
          </div>
          <p className="mt-1 text-sm leading-5 text-muted">{flag.description}</p>
          {flag.updatedAt && <p className="mt-2 text-xs font-semibold text-faint">{t.adminSystem.cfgUpdatedAt({ at: formatDate(flag.updatedAt) })}</p>}
        </div>
        <Badge tone={enabled ? 'pos' : 'muted'}>{enabled ? t.adminSystem.enabledShort : t.adminSystem.disabledShort}</Badge>
      </div>
    </button>
  )
}

function LimitsView({ limits, onChange, onSave, busy }: { limits: AdminConfigLimits; onChange: (limits: AdminConfigLimits) => void; onSave: () => void; busy: boolean }) {
  const t = useT()
  const update = (key: keyof AdminConfigLimits, value: number | null) => onChange({ ...limits, [key]: value })
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Card className="p-5">
        <h3 className="font-extrabold text-app">{t.adminSystem.cfgLimitsTitle}</h3>
        <p className="mt-1 text-sm text-muted">{t.adminSystem.cfgLimitsDescription}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label={t.adminSystem.cfgLimitFreeMaxGroups} value={limits.freeMaxGroups} onChange={(value) => update('freeMaxGroups', value)} />
          <NumberField label={t.adminSystem.cfgLimitFreeMaxMembers} value={limits.freeMaxMembers} onChange={(value) => update('freeMaxMembers', value)} />
          <NumberField label={t.adminSystem.cfgLimitPremiumMaxGroups} value={limits.premiumMaxGroups} nullable onChange={(value) => update('premiumMaxGroups', value)} />
          <NumberField label={t.adminSystem.cfgLimitPremiumMaxMembers} value={limits.premiumMaxMembers} onChange={(value) => update('premiumMaxMembers', value)} />
          <NumberField label={t.adminSystem.cfgLimitParseFree} value={limits.parseFree} onChange={(value) => update('parseFree', value)} />
          <NumberField label={t.adminSystem.cfgLimitOcrFree} value={limits.ocrFree} onChange={(value) => update('ocrFree', value)} />
          <NumberField label={t.adminSystem.cfgLimitInsightFree} value={limits.insightFree} onChange={(value) => update('insightFree', value)} />
          <NumberField label={t.adminSystem.cfgLimitDebtCooldown} value={limits.debtCooldownHours} onChange={(value) => update('debtCooldownHours', value)} />
          <NumberField label={t.adminSystem.cfgLimitRedeemDuration} value={limits.redeemDurationDays} onChange={(value) => update('redeemDurationDays', value)} />
          <NumberField label={t.adminSystem.cfgLimitRedeemMaxUses} value={limits.redeemMaxUses} onChange={(value) => update('redeemMaxUses', value)} />
        </div>
        <SaveBar onSave={onSave} busy={busy} label={t.adminSystem.cfgSaveLimitsButton} />
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"><ShieldAlert size={20} /></span>
          <div>
            <h3 className="font-extrabold text-app">{t.adminSystem.cfgApprovalTitle}</h3>
            <p className="text-xs text-muted">{t.adminSystem.cfgApprovalHint}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{t.adminSystem.cfgApprovalBody}</p>
      </Card>
    </div>
  )
}

function MaintenanceView({ maintenance, onChange, onSave, busy }: { maintenance: Omit<AdminConfigMaintenance, 'updatedAt'>; onChange: (maintenance: Omit<AdminConfigMaintenance, 'updatedAt'>) => void; onSave: () => void; busy: boolean }) {
  const t = useT()
  const severityOptions: { value: AdminConfigMaintenanceSeverity; label: string }[] = [
    { value: 'info', label: t.adminSystem.severityInfo },
    { value: 'warning', label: t.adminSystem.severityWarning },
    { value: 'critical', label: t.adminSystem.severityCritical },
  ]
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-extrabold text-app">{t.adminSystem.cfgMaintenanceCardTitle}</h3>
          <p className="mt-1 text-sm text-muted">{t.adminSystem.cfgMaintenanceCardDescription}</p>
        </div>
        <button type="button" onClick={() => onChange({ ...maintenance, enabled: !maintenance.enabled })} className="press rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm font-extrabold text-app">
          {maintenance.enabled ? t.adminSystem.on : t.adminSystem.off}
        </button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <LabelledInput label={t.adminSystem.cfgFieldTitle} value={maintenance.title} onChange={(value) => onChange({ ...maintenance, title: value })} />
        <label className="block space-y-1.5">
          <span className="text-[13px] font-semibold text-muted">{t.adminSystem.cfgFieldSeverity}</span>
          <select value={maintenance.severity} onChange={(event) => onChange({ ...maintenance, severity: event.target.value as AdminConfigMaintenanceSeverity })} className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30">
            {severityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <LabelledInput label={t.adminSystem.cfgFieldStartsAt} value={maintenance.startsAt ?? ''} placeholder="2026-06-10T22:00:00+07:00" onChange={(value) => onChange({ ...maintenance, startsAt: value || null })} />
        <LabelledInput label={t.adminSystem.cfgFieldEndsAt} value={maintenance.endsAt ?? ''} placeholder="2026-06-11T01:00:00+07:00" onChange={(value) => onChange({ ...maintenance, endsAt: value || null })} />
        <label className="block space-y-1.5 lg:col-span-2">
          <span className="text-[13px] font-semibold text-muted">{t.adminSystem.cfgFieldMessage}</span>
          <textarea value={maintenance.message} onChange={(event) => onChange({ ...maintenance, message: event.target.value })} rows={4} className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
        </label>
      </div>
      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <Badge tone={maintenance.enabled ? (maintenance.severity === 'critical' ? 'neg' : 'brand') : 'muted'}>{maintenance.enabled ? severityLabel(t, maintenance.severity) : t.adminSystem.off}</Badge>
        <p className="mt-3 font-extrabold text-app">{maintenance.title || t.adminSystem.cfgMaintenanceTitlePlaceholder}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{maintenance.message || t.adminSystem.cfgMaintenancePreviewEmpty}</p>
      </div>
      <SaveBar onSave={onSave} busy={busy} label={t.adminSystem.cfgSaveMaintenanceButton} />
    </Card>
  )
}

function DisclaimerView({ disclaimer, onChange, changes, onSave, busy }: { disclaimer: Omit<AdminConfigDisclaimer, 'updatedAt'>; onChange: (disclaimer: Omit<AdminConfigDisclaimer, 'updatedAt'>) => void; changes: AdminConfigSnapshot['recentChanges']; onSave: () => void; busy: boolean }) {
  const t = useT()
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Card className="p-5">
        <h3 className="font-extrabold text-app">{t.adminSystem.cfgDisclaimerTitle}</h3>
        <div className="mt-4 grid gap-3">
          <label className="block space-y-1.5">
            <span className="text-[13px] font-semibold text-muted">{t.adminSystem.cfgDisclaimerPayment}</span>
            <textarea value={disclaimer.payment} onChange={(event) => onChange({ ...disclaimer, payment: event.target.value })} rows={4} className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[13px] font-semibold text-muted">{t.adminSystem.cfgDisclaimerLegal}</span>
            <textarea value={disclaimer.legal} onChange={(event) => onChange({ ...disclaimer, legal: event.target.value })} rows={4} className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
          </label>
        </div>
        <SaveBar onSave={onSave} busy={busy} label={t.adminSystem.cfgSaveDisclaimerButton} />
      </Card>

      <Card className="p-5">
        <h3 className="font-extrabold text-app">{t.adminSystem.cfgChangeHistoryTitle}</h3>
        <div className="mt-4 space-y-2">
          {changes.length === 0 ? <p className="text-sm text-muted">{t.adminSystem.cfgChangeHistoryEmpty}</p> : changes.map((change) => (
            <div key={change.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="text-sm font-extrabold text-app">{change.action}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{change.actorEmail ?? 'admin'} · {formatDate(change.createdAt)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ApprovalPanel({ reason, confirmed, onReasonChange, onConfirmedChange }: { reason: string; confirmed: boolean; onReasonChange: (value: string) => void; onConfirmedChange: (value: boolean) => void }) {
  const t = useT()
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
      <Input value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder={t.adminSystem.cfgReasonPlaceholder} />
      <button type="button" onClick={() => onConfirmedChange(!confirmed)} className={`press rounded-xl border px-3 text-sm font-extrabold transition ${confirmed ? 'border-pos/40 bg-pos/12 text-pos' : 'border-[var(--border)] bg-[var(--surface-solid)] text-muted'}`}>
        {confirmed ? t.adminSystem.cfgConfirmed : t.adminSystem.cfgConfirm}
      </button>
    </div>
  )
}

function NumberField({ label, value, nullable, onChange }: { label: string; value: number | null; nullable?: boolean; onChange: (value: number | null) => void }) {
  const t = useT()
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <Input type="number" min={0} value={value ?? ''} placeholder={nullable ? t.adminSystem.cfgUnlimitedPlaceholder : undefined} onChange={(event) => {
        if (nullable && event.target.value.trim() === '') onChange(null)
        else onChange(Number(event.target.value))
      }} />
    </label>
  )
}

function LabelledInput({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SaveBar({ onSave, busy, label }: { onSave: () => void; busy: boolean; label: string }) {
  return (
    <div className="mt-5 flex justify-end">
      <Button onClick={onSave} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {label}</Button>
    </div>
  )
}

function LoadingState() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}</div>
}

function ConfigStatusBadge({ status }: { status: AdminConfigSnapshot['summaryStatus'] }) {
  const t = useT()
  const tone = status === 'configured' ? 'pos' : status === 'failed' || status === 'missing' ? 'neg' : 'muted'
  const label = status === 'configured' ? t.adminSystem.statusConfigured : status === 'failed' ? t.adminSystem.statusFailed : status === 'missing' ? t.adminSystem.statusMissing : t.adminSystem.statusUnknown
  return <Badge tone={tone}>{label}</Badge>
}

function severityLabel(t: Dict, severity: AdminConfigMaintenanceSeverity) {
  if (severity === 'critical') return t.adminSystem.severityCritical
  if (severity === 'warning') return t.adminSystem.severityWarning
  return t.adminSystem.severityInfo
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'warn' | 'muted' }) {
  const badgeTone = tone === 'warn' ? 'neg' : tone
  const icon = tone === 'pos' ? <CheckCircle2 size={14} /> : tone === 'warn' ? <AlertTriangle size={14} /> : tone === 'brand' ? <ToggleLeft size={14} /> : null
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <span className="truncate text-xs font-bold uppercase tracking-wider text-faint">{label}</span>
      <Badge tone={badgeTone} className="max-w-[12rem] truncate">{icon}{value}</Badge>
    </div>
  )
}

function groupFlags(flags: AdminConfigFlag[]) {
  const groups = new Map<AdminConfigFlagCategory, AdminConfigFlag[]>()
  for (const flag of flags) {
    const list = groups.get(flag.category) ?? []
    list.push(flag)
    groups.set(flag.category, list)
  }
  return groups
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(time) : value
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(getIntlLocale()).format(value)
}
