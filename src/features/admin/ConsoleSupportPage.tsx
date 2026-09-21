import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Banknote,
  Bell,
  Bot,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Input, Segmented } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import {
  loadAdminSupportUser,
  searchAdminSupportUsers,
  type AdminSupportGroup,
  type AdminSupportPayment,
  type AdminSupportRedemption,
  type AdminSupportSnapshot,
  type AdminSupportSubscription,
  type AdminSupportUserSearchResult,
} from '../../lib/adminSupport'

type SupportView = 'overview' | 'groups' | 'billing' | 'ops'

function numberFmt() {
  return new Intl.NumberFormat(getIntlLocale())
}
function moneyFmt() {
  return new Intl.NumberFormat(getIntlLocale(), { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
}

export function ConsoleSupportPage({ initialQuery = '', autoSearch = false }: { initialQuery?: string; autoSearch?: boolean } = {}) {
  const t = useT()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<AdminSupportUserSearchResult[]>([])
  const [snapshot, setSnapshot] = useState<AdminSupportSnapshot | null>(null)
  const [view, setView] = useState<SupportView>('overview')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [loadingSnapshot, setLoadingSnapshot] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const autoSearchStarted = useRef(false)

  const loadSnapshot = useCallback(async (target: string) => {
    setLoadingSnapshot(true)
    const next = await loadAdminSupportUser(undefined, target)
    setSnapshot(next)
    setSelectedGroupId((current) => {
      if (current && next?.groups.some((group) => group.groupId === current)) return current
      return next?.groups[0]?.groupId ?? null
    })
    setNotice(next ? null : t.adminOps.support.snapshotFailed)
    setLoadingSnapshot(false)
  }, [t])

  const runSearch = useCallback(async (rawQuery = query) => {
    const clean = rawQuery.trim()
    if (!clean) {
      setNotice(t.adminOps.support.queryRequired)
      return
    }
    setSearching(true)
    setNotice(null)
    const rows = await searchAdminSupportUsers(undefined, { query: clean, limit: 20 })
    setResults(rows)
    setSearching(false)
    if (rows[0]) {
      await loadSnapshot(rows[0].email || rows[0].userId)
      setNotice(t.adminOps.support.foundUsers({ n: rows.length }))
    } else {
      setSnapshot(null)
      setNotice(t.adminOps.support.noUsers)
    }
  }, [loadSnapshot, query, t])

  useEffect(() => {
    if (!autoSearch || autoSearchStarted.current || !initialQuery.trim()) return
    autoSearchStarted.current = true
    void runSearch(initialQuery)
  }, [autoSearch, initialQuery, runSearch])

  const selectedGroup = useMemo(
    () => snapshot?.groups.find((group) => group.groupId === selectedGroupId) ?? snapshot?.groups[0] ?? null,
    [selectedGroupId, snapshot?.groups],
  )
  const activePlan = snapshot?.subscription?.status === 'active' ? snapshot.subscription.plan : 'free'
  const bankLabel = snapshot?.profile.bankConfigured ? t.adminOps.support.bankConfigured : t.adminOps.support.bankNotConfigured
  const viewOptions: { value: SupportView; label: string }[] = [
    { value: 'overview', label: t.adminOps.support.viewOverview },
    { value: 'groups', label: t.adminOps.support.viewGroups },
    { value: 'billing', label: t.adminOps.support.viewBilling },
    { value: 'ops', label: t.adminOps.support.viewOps },
  ]

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 9</Badge>
              <Badge tone="pos">{t.adminOps.shared.readOnly}</Badge>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">{t.adminOps.support.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t.adminOps.support.description}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void runSearch()} disabled={searching || loadingSnapshot}>
            {searching || loadingSnapshot ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {t.adminOps.shared.refresh}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label={t.adminOps.support.labelUser} value={snapshot?.profile.email ?? t.adminOps.support.notSelected} tone="brand" />
          <SummaryPill label={t.adminOps.support.labelPlan} value={activePlan} tone={activePlan === 'free' ? 'muted' : 'pos'} />
          <SummaryPill label={t.adminOps.support.labelGroups} value={String(snapshot?.groups.length ?? 0)} tone="brand" />
          <SummaryPill label={t.adminOps.support.labelBank} value={bankLabel} tone={snapshot?.profile.bankConfigured ? 'pos' : 'muted'} />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="space-y-4">
          <Card className="p-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                void runSearch()
              }}
            >
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.adminOps.support.placeholderQuery} className="pl-9" />
              </label>
              <Button type="submit" fullWidth disabled={searching || loadingSnapshot}>
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {t.adminOps.support.searchUser}
              </Button>
            </form>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-[var(--border)] p-4">
              <h3 className="font-extrabold text-app">{t.adminOps.support.results}</h3>
              <p className="mt-1 text-xs font-semibold text-muted">{t.adminOps.support.resultCount({ n: results.length })}</p>
            </div>
            {results.length === 0 ? (
              <EmptyState icon={<Users size={28} />} title={t.adminOps.support.emptyResultsTitle} description={t.adminOps.support.emptyResultsDescription} />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {results.map((user) => {
                  const active = snapshot?.profile.userId === user.userId
                  return (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => void loadSnapshot(user.email || user.userId)}
                      aria-pressed={active}
                      className={`press flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] ${active ? 'bg-brand-500/8' : ''}`}
                    >
                      <Avatar name={user.displayName ?? user.email} src={user.avatarUrl} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold text-app">{user.displayName ?? user.email}</span>
                        <span className="block truncate text-xs text-muted">{user.email}</span>
                      </span>
                      <Badge tone={user.premiumPlan === 'free' ? 'muted' : 'pos'}>{user.premiumPlan}</Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        </aside>

        <section className="min-w-0 space-y-4">
          <Card className="p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,34rem)] lg:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
                  <ShieldCheck size={20} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-app">{snapshot?.profile.email ?? t.adminOps.support.noUserSelected}</p>
                  <p className="truncate text-xs font-semibold text-muted">{snapshot ? t.adminOps.support.snapshotAt({ time: formatDate(snapshot.checkedAt) }) : t.adminOps.support.profilePlaceholder}</p>
                </div>
              </div>
              <Segmented options={viewOptions} value={view} onChange={setView} />
            </div>
          </Card>

          {loadingSnapshot && !snapshot ? (
            <LoadingState />
          ) : !snapshot ? (
            <EmptyState icon={<Search size={28} />} title={t.adminOps.support.noProfileTitle} description={t.adminOps.support.noProfileDescription} />
          ) : (
            <>
              {view === 'overview' && <OverviewView snapshot={snapshot} />}
              {view === 'groups' && <GroupsView groups={snapshot.groups} selected={selectedGroup} onSelect={setSelectedGroupId} />}
              {view === 'billing' && <BillingView subscription={snapshot.subscription} payments={snapshot.payments} redemptions={snapshot.redemptions} />}
              {view === 'ops' && <OpsView snapshot={snapshot} />}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function OverviewView({ snapshot }: { snapshot: AdminSupportSnapshot }) {
  const t = useT()
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={snapshot.profile.displayName ?? snapshot.profile.email} src={snapshot.profile.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={snapshot.profile.onboardedAt ? 'pos' : 'muted'}>{snapshot.profile.onboardedAt ? t.adminOps.support.onboarded : t.adminOps.support.notOnboarded}</Badge>
              <Badge tone={snapshot.profile.bankConfigured ? 'pos' : 'muted'}>{snapshot.profile.bankConfigured ? t.adminOps.support.bankOk : t.adminOps.support.bankMissing}</Badge>
            </div>
            <h3 className="mt-3 text-xl font-extrabold text-app">{snapshot.profile.displayName ?? snapshot.profile.email}</h3>
            <p className="mt-1 break-all text-sm font-semibold text-muted">{snapshot.profile.userId}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <InfoTile label={t.adminOps.support.labelEmail} value={snapshot.profile.email} />
              <InfoTile label={t.adminOps.shared.labelCreatedAt} value={formatDate(snapshot.profile.createdAt)} />
              <InfoTile label={t.adminOps.support.labelUpdatedAt} value={formatDate(snapshot.profile.updatedAt)} />
              <InfoTile label={t.adminOps.support.labelBank} value={snapshot.profile.bankConfigured ? `${snapshot.profile.bankCode ?? 'Bank'} · ****${snapshot.profile.bankAccountLast4 ?? '----'}` : t.adminOps.support.bankNotConfigured} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-extrabold text-app">{t.adminOps.support.summaryTitle}</h3>
        <div className="mt-4 space-y-2">
          <SummaryPill label={t.adminOps.support.labelGroupsJoined} value={numberFmt().format(snapshot.groups.length)} tone="brand" />
          <SummaryPill label={t.adminOps.support.labelPayments} value={numberFmt().format(snapshot.payments.length)} tone="brand" />
          <SummaryPill label={t.adminOps.support.labelRedemptions} value={numberFmt().format(snapshot.redemptions.length)} tone="brand" />
          <SummaryPill label={t.adminOps.support.labelPushDevices} value={numberFmt().format(snapshot.push.subscriptionCount)} tone={snapshot.push.subscriptionCount > 0 ? 'pos' : 'muted'} />
        </div>
      </Card>
    </div>
  )
}

function GroupsView({ groups, selected, onSelect }: { groups: AdminSupportGroup[]; selected: AdminSupportGroup | null; onSelect: (id: string) => void }) {
  const t = useT()
  if (groups.length === 0) return <EmptyState icon={<Users size={28} />} title={t.adminOps.support.noGroupsTitle} description={t.adminOps.support.noGroupsDescription} />

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Card className="overflow-hidden p-0">
        <div className="divide-y divide-[var(--border)]">
          {groups.map((group) => (
            <button
              key={group.groupId}
              type="button"
              onClick={() => onSelect(group.groupId)}
              aria-pressed={selected?.groupId === group.groupId}
              className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] lg:items-center ${selected?.groupId === group.groupId ? 'bg-brand-500/8' : ''}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-app">{group.emoji ? `${group.emoji} ` : ''}{group.name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{group.groupId}</span>
              </span>
              <span className="text-sm font-bold text-app">{group.memberCount} members</span>
              <span className="text-sm font-semibold text-muted">{group.expenseCount} expenses</span>
              <span className="lg:justify-self-end"><Badge tone={group.isOwner ? 'pos' : 'muted'}>{group.memberRole}</Badge></span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        {!selected ? (
          <p className="text-sm text-muted">{t.adminOps.support.noGroupSelected}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <Badge tone={selected.isOwner ? 'pos' : 'muted'}>{selected.isOwner ? 'Owner' : 'Member'}</Badge>
              <h3 className="mt-3 text-lg font-extrabold text-app">{selected.emoji ? `${selected.emoji} ` : ''}{selected.name}</h3>
              <p className="mt-1 break-all text-xs font-semibold text-muted">{selected.groupId}</p>
            </div>
            <div className="grid gap-2">
              <InfoTile label="Owner" value={selected.ownerEmail ?? selected.ownerId} />
              <InfoTile label="Currency" value={selected.baseCurrency} />
              <InfoTile label="Settlement" value={selected.settlementMethod} />
              <InfoTile label="Version" value={String(selected.version)} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-faint">Members</p>
              <div className="mt-2 space-y-2">
                {selected.members.map((member) => (
                  <div key={member.memberId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-app">{member.name}</p>
                        <p className="truncate text-xs text-muted">{member.email ?? 'Virtual member'}</p>
                      </div>
                      <Badge tone={member.role === 'owner' ? 'pos' : 'muted'}>{member.role}</Badge>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-muted">{t.adminOps.support.memberBankLabel} {member.bankConfigured ? t.adminOps.support.bankConfiguredShort : t.adminOps.support.bankNotConfiguredShort}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function BillingView({ subscription, payments, redemptions }: { subscription: AdminSupportSubscription | null; payments: AdminSupportPayment[]; redemptions: AdminSupportRedemption[] }) {
  const t = useT()
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="space-y-4 min-w-0">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
              <CreditCard size={20} />
            </span>
            <div>
              <h3 className="font-extrabold text-app">{t.adminOps.support.premiumPlanTitle}</h3>
              <p className="text-xs text-muted">{t.adminOps.support.premiumPlanSubtitle}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <SummaryPill label={t.adminOps.support.labelPlan} value={subscription?.plan ?? 'free'} tone={subscription && subscription.plan !== 'free' ? 'pos' : 'muted'} />
            <SummaryPill label="Status" value={subscription?.status ?? 'none'} tone={subscription?.status === 'active' ? 'pos' : 'muted'} />
            <SummaryPill label="Days left" value={subscription?.daysLeft == null ? '-' : String(subscription.daysLeft)} tone="brand" />
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <TableHeader icon={<Banknote size={18} />} title={t.adminOps.support.labelPayments} count={payments.length} />
          {payments.length === 0 ? (
            <EmptyState icon={<CreditCard size={28} />} title={t.adminOps.support.noPayments} />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {payments.map((payment) => (
                <div key={payment.orderCode} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_8rem_8rem_8rem] lg:items-center">
                  <p className="truncate text-sm font-extrabold text-app">{payment.orderCode}</p>
                  <p className="text-sm font-semibold text-muted">{payment.plan}/{payment.cycle}</p>
                  <p className="text-sm font-bold text-app">{moneyFmt().format(payment.amount)}</p>
                  <span className="lg:justify-self-end"><Badge tone={payment.status === 'paid' ? 'pos' : 'muted'}>{payment.status}</Badge></span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <TableHeader icon={<Ticket size={18} />} title="Redeem history" count={redemptions.length} />
        {redemptions.length === 0 ? (
          <EmptyState icon={<Ticket size={28} />} title={t.adminOps.support.noRedemptions} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {redemptions.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-extrabold text-app">{item.code}</p>
                  <Badge tone="brand">{t.adminOps.support.durationDays({ n: item.durationDays ?? '-' })}</Badge>
                </div>
                <p className="mt-1 text-xs font-semibold text-muted">{item.plan ?? 'premium'} · {formatDate(item.usedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function OpsView({ snapshot }: { snapshot: AdminSupportSnapshot }) {
  const t = useT()
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <Card className="overflow-hidden p-0">
        <TableHeader icon={<Bot size={18} />} title="AI usage" count={snapshot.aiUsage.length} />
        {snapshot.aiUsage.length === 0 ? (
          <EmptyState icon={<Bot size={28} />} title={t.adminOps.support.noAiUsage} />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {snapshot.aiUsage.map((usage) => (
              <div key={`${usage.feature}-${usage.period}`} className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_6rem_8rem] sm:items-center">
                <p className="truncate text-sm font-extrabold text-app">{usage.feature}</p>
                <p className="text-sm font-bold text-app">{numberFmt().format(usage.count)}</p>
                <p className="text-sm font-semibold text-muted sm:text-right">{usage.period}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
            <Bell size={20} />
          </span>
          <div>
            <h3 className="font-extrabold text-app">Push health</h3>
            <p className="text-xs text-muted">{t.adminOps.support.pushGrouped}</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <SummaryPill label={t.adminOps.support.labelPushDevices} value={numberFmt().format(snapshot.push.subscriptionCount)} tone={snapshot.push.subscriptionCount > 0 ? 'pos' : 'muted'} />
          <SummaryPill label="Latest" value={formatDate(snapshot.push.latestCreatedAt)} tone="brand" />
        </div>
        <div className="mt-4 space-y-2">
          {snapshot.push.endpointHosts.length === 0 ? (
            <p className="text-sm text-muted">{t.adminOps.support.noEndpointHosts}</p>
          ) : snapshot.push.endpointHosts.map((host) => (
            <div key={host.host} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <span className="min-w-0 truncate text-sm font-extrabold text-app">{host.host}</span>
              <Badge tone="brand">{host.count}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 break-words text-sm font-extrabold text-app">{value || '-'}</p>
    </div>
  )
}

function TableHeader({ icon, title, count }: { icon: ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4">
      <div className="flex items-center gap-2">
        <span className="text-brand-600 dark:text-brand-300">{icon}</span>
        <h3 className="font-extrabold text-app">{title}</h3>
      </div>
      <Badge tone="muted">{count}</Badge>
    </div>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'muted' }) {
  const icon = tone === 'pos' ? <CheckCircle2 size={14} /> : null
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <span className="truncate text-xs font-bold uppercase tracking-wider text-faint">{label}</span>
      <Badge tone={tone} className="max-w-[12rem] truncate">{icon}{value}</Badge>
    </div>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(time) : value
}
