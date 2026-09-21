import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, CreditCard, Database, Loader2, RefreshCw, Search, ShieldCheck, Ticket, TriangleAlert, Users } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, Segmented } from '../../components/ui'
import { t, useT } from '../../lib/i18n'
import { getIntlLocale } from '../../lib/i18n/locale'
import {
  grantAdminPremium,
  loadAdminBillingSnapshot,
  lookupAdminBillingUser,
  type AdminBillingError,
  type AdminBillingGrantPlan,
  type AdminBillingPaymentOrder,
  type AdminBillingPaymentStatus,
  type AdminBillingSnapshot,
  type AdminBillingStatus,
  type AdminBillingSubscription,
  type AdminBillingSubscriptionStatus,
  type AdminBillingUserDetail,
} from '../../lib/adminBilling'

type BillingView = 'overview' | 'subscriptions' | 'payments' | 'user'
type SubscriptionFilter = AdminBillingSubscriptionStatus | 'all'
type PaymentFilter = AdminBillingPaymentStatus | 'all'

export function ConsoleBillingPage() {
  const t = useT()
  const [snapshot, setSnapshot] = useState<AdminBillingSnapshot | null>(null)
  const [view, setView] = useState<BillingView>('overview')
  const [search, setSearch] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionFilter>('all')
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>('all')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [lookupQuery, setLookupQuery] = useState('')
  const [lookupDetail, setLookupDetail] = useState<AdminBillingUserDetail | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantUserId, setGrantUserId] = useState('')
  const [grantPlan, setGrantPlan] = useState<AdminBillingGrantPlan>('personal')
  const [grantDays, setGrantDays] = useState(30)
  const [grantNote, setGrantNote] = useState('')
  const [grantConfirmed, setGrantConfirmed] = useState(false)

  const VIEW_OPTIONS: { value: BillingView; label: string }[] = [
    { value: 'overview', label: t.adminBilling.viewOverview },
    { value: 'subscriptions', label: t.adminBilling.viewSubscriptions },
    { value: 'payments', label: t.adminBilling.viewPayments },
    { value: 'user', label: t.adminBilling.viewLookup },
  ]

  const SUBSCRIPTION_OPTIONS: { value: SubscriptionFilter; label: string }[] = [
    { value: 'all', label: t.adminBilling.filterAll },
    { value: 'active', label: t.adminBilling.subActive },
    { value: 'expired', label: t.adminBilling.subExpired },
  ]

  const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: t.adminBilling.filterAll },
    { value: 'pending', label: t.adminBilling.pending },
    { value: 'paid', label: t.adminBilling.payPaid },
    { value: 'cancelled', label: t.adminBilling.payCancelled },
  ]

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminBillingSnapshot(undefined, {
      search,
      subscriptionStatus,
      paymentStatus,
      limit: 50,
    })
    setSnapshot(next)
    setSelectedUserId((current) => (current && next?.subscriptions.some((row) => row.userId === current) ? current : next?.subscriptions[0]?.userId ?? null))
    setSelectedOrderCode((current) => (current && next?.payments.some((row) => row.orderCode === current) ? current : next?.payments[0]?.orderCode ?? null))
    setNotice(next ? null : t.adminBilling.billingLoadFailed)
    setLoading(false)
  }, [paymentStatus, search, subscriptionStatus])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshot()
    }, 140)
    return () => window.clearTimeout(timeout)
  }, [loadSnapshot])

  const selectedSubscription = useMemo(
    () => snapshot?.subscriptions.find((row) => row.userId === selectedUserId) ?? snapshot?.subscriptions[0] ?? null,
    [selectedUserId, snapshot?.subscriptions],
  )
  const selectedPayment = useMemo(
    () => snapshot?.payments.find((row) => row.orderCode === selectedOrderCode) ?? snapshot?.payments[0] ?? null,
    [selectedOrderCode, snapshot?.payments],
  )
  const activePremium = snapshot?.subscriptions.filter((row) => row.status === 'active' && row.plan !== 'free').length ?? 0
  const pendingOrders = snapshot?.payments.filter((row) => row.status === 'pending').length ?? 0

  async function runLookup(rawQuery: string) {
    const query = rawQuery.trim()
    if (!query) {
      setNotice(t.adminBilling.lookupEmailRequired)
      return
    }
    setLookupLoading(true)
    setNotice(null)
    const result = await lookupAdminBillingUser(undefined, query)
    setLookupDetail(result)
    if (result) {
      setLookupQuery(result.profile.email)
      setGrantEmail(result.profile.email)
      setGrantUserId(result.profile.userId)
      setSelectedUserId(result.profile.userId)
      setView('user')
      setNotice(t.adminBilling.lookupLoaded)
    } else {
      setNotice(t.adminBilling.lookupNotFound)
    }
    setLookupLoading(false)
  }

  async function onGrantPremium() {
    const cleanEmail = grantEmail.trim()
    const cleanUserId = grantUserId.trim()
    if (!cleanEmail && !cleanUserId) {
      setNotice(t.adminBilling.grantTargetRequired)
      return
    }
    if (!grantConfirmed) {
      setNotice(t.adminBilling.grantConfirmRequired)
      return
    }
    const target = cleanEmail || cleanUserId
    const ok = window.confirm(t.adminBilling.grantConfirm({ plan: grantPlan, days: grantDays, target }))
    if (!ok) return

    setBusy(true)
    setNotice(null)
    const result = await grantAdminPremium(undefined, {
      userEmail: cleanEmail || null,
      userId: cleanUserId || null,
      plan: grantPlan,
      days: grantDays,
      note: grantNote,
    })
    if (result) {
      setNotice(t.adminBilling.grantSuccess({ plan: planLabel(result.plan), target: result.userEmail ?? target }))
      setGrantConfirmed(false)
      await loadSnapshot()
      await runLookup(result.userEmail ?? result.userId)
    } else {
      setNotice(t.adminBilling.grantFailed)
    }
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 8</Badge>
              <BillingStatusBadge status={snapshot?.summaryStatus ?? 'unknown'} />
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">{t.adminBilling.billingTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              {t.adminBilling.billingDescription}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading || busy}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} {t.adminBilling.refresh}
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label="PayOS" value={providerStatusLabel(snapshot?.provider.status)} tone={snapshot?.provider.status === 'configured' ? 'pos' : 'warn'} />
          <SummaryPill label={t.adminBilling.summaryActivePremium} value={formatNumber(activePremium)} tone="brand" />
          <SummaryPill label={t.adminBilling.summaryPendingOrders} value={formatNumber(pendingOrders)} tone={pendingOrders > 0 ? 'warn' : 'pos'} />
          <SummaryPill label={t.adminBilling.summaryManualGrants} value={t.adminBilling.summaryManualGrantsValue} tone="pos" />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,34rem)] lg:items-center">
          <Segmented options={VIEW_OPTIONS} value={view} onChange={setView} />
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_11rem]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.adminBilling.billingSearchPlaceholder} className="pl-9" />
            </label>
            <select value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value as SubscriptionFilter)} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30">
              {SUBSCRIPTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PaymentFilter)} className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30">
              {PAYMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {view === 'overview' && (
        <OverviewView
          snapshot={snapshot}
          loading={loading && !snapshot}
          onSelectSubscription={(row) => {
            setSelectedUserId(row.userId)
            void runLookup(row.userEmail ?? row.userId)
          }}
          onSelectPayment={(row) => {
            setSelectedOrderCode(row.orderCode)
            void runLookup(row.userEmail ?? row.userId)
          }}
        />
      )}

      {view === 'subscriptions' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <SubscriptionTable rows={snapshot?.subscriptions ?? []} selectedUserId={selectedUserId} loading={loading && !snapshot} onSelect={(row) => {
            setSelectedUserId(row.userId)
            void runLookup(row.userEmail ?? row.userId)
          }} />
          <SubscriptionDetail row={selectedSubscription} />
        </div>
      )}

      {view === 'payments' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <PaymentTable rows={snapshot?.payments ?? []} selectedOrderCode={selectedOrderCode} loading={loading && !snapshot} onSelect={(row) => {
            setSelectedOrderCode(row.orderCode)
            void runLookup(row.userEmail ?? row.userId)
          }} />
          <PaymentDetail row={selectedPayment} />
        </div>
      )}

      {view === 'user' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="space-y-4 min-w-0">
            <LookupPanel query={lookupQuery} onQueryChange={setLookupQuery} loading={lookupLoading} onLookup={() => void runLookup(lookupQuery)} />
            <UserDetail detail={lookupDetail} loading={lookupLoading} />
          </section>
          <ManualGrantPanel
            email={grantEmail}
            userId={grantUserId}
            plan={grantPlan}
            days={grantDays}
            note={grantNote}
            confirmed={grantConfirmed}
            busy={busy}
            onEmailChange={setGrantEmail}
            onUserIdChange={setGrantUserId}
            onPlanChange={setGrantPlan}
            onDaysChange={setGrantDays}
            onNoteChange={setGrantNote}
            onConfirmedChange={setGrantConfirmed}
            onGrant={() => void onGrantPremium()}
          />
        </div>
      )}
    </div>
  )
}

function OverviewView({
  snapshot,
  loading,
  onSelectSubscription,
  onSelectPayment,
}: {
  snapshot: AdminBillingSnapshot | null
  loading: boolean
  onSelectSubscription: (row: AdminBillingSubscription) => void
  onSelectPayment: (row: AdminBillingPaymentOrder) => void
}) {
  const t = useT()
  return (
    <div className="space-y-4">
      <MetricGrid metrics={snapshot?.metrics ?? []} loading={loading} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="grid gap-4 lg:grid-cols-2 min-w-0">
          <Card className="overflow-hidden p-0">
            <PanelHeader icon={<Users size={18} />} title={t.adminBilling.viewSubscriptions} subtitle={t.adminBilling.premiumPanelSubtitle} />
            <MiniSubscriptionList rows={(snapshot?.subscriptions ?? []).slice(0, 6)} loading={loading} onSelect={onSelectSubscription} />
          </Card>
          <Card className="overflow-hidden p-0">
            <PanelHeader icon={<CreditCard size={18} />} title={t.adminBilling.viewPayments} subtitle={t.adminBilling.paymentsPanelSubtitle} />
            <MiniPaymentList rows={(snapshot?.payments ?? []).slice(0, 6)} loading={loading} onSelect={onSelectPayment} />
          </Card>
        </section>
        <aside className="space-y-4">
          <PayosHealth provider={snapshot?.provider ?? null} checkedAt={snapshot?.checkedAt ?? null} />
          <RecentErrors errors={snapshot?.recentErrors ?? []} loading={loading} />
        </aside>
      </div>
    </div>
  )
}

function MetricGrid({ metrics, loading }: { metrics: AdminBillingSnapshot['metrics']; loading: boolean }) {
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
          <p className="mt-2 text-2xl font-extrabold text-app">{formatNumber(metric.value)}</p>
          {metric.detail && <p className="mt-1 truncate text-xs font-semibold text-muted">{metric.detail}</p>}
        </Card>
      ))}
    </section>
  )
}

function PanelHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="border-b border-[var(--border)] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">{icon}</span>
        <div>
          <h3 className="font-extrabold text-app">{title}</h3>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

function MiniSubscriptionList({ rows, loading, onSelect }: { rows: AdminBillingSubscription[]; loading: boolean; onSelect: (row: AdminBillingSubscription) => void }) {
  const t = useT()
  if (loading) return <SkeletonRows />
  if (rows.length === 0) return <EmptyState icon={<Users size={28} />} title={t.adminBilling.noSubscriptionsTitle} description={t.adminBilling.noSubscriptionsDescription} />
  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map((row) => (
        <button key={`${row.userId}-${row.updatedAt ?? row.createdAt}`} type="button" onClick={() => onSelect(row)} className="press grid w-full gap-2 px-4 py-3 text-left hover:bg-[var(--surface-2)] sm:grid-cols-[minmax(0,1fr)_7rem_6rem] sm:items-center">
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-app">{row.userEmail ?? row.userId}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">{row.displayName ?? t.adminBilling.noName} · {formatDate(row.updatedAt ?? row.createdAt)}</span>
          </span>
          <span><PlanBadge plan={row.plan} /></span>
          <span className="sm:justify-self-end"><SubscriptionStatusBadge status={row.status} /></span>
        </button>
      ))}
    </div>
  )
}

function MiniPaymentList({ rows, loading, onSelect }: { rows: AdminBillingPaymentOrder[]; loading: boolean; onSelect: (row: AdminBillingPaymentOrder) => void }) {
  const t = useT()
  if (loading) return <SkeletonRows />
  if (rows.length === 0) return <EmptyState icon={<CreditCard size={28} />} title={t.adminBilling.noPaymentsTitle} description={t.adminBilling.noPaymentsDescription} />
  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map((row) => (
        <button key={row.orderCode} type="button" onClick={() => onSelect(row)} className="press grid w-full gap-2 px-4 py-3 text-left hover:bg-[var(--surface-2)] sm:grid-cols-[minmax(0,1fr)_7rem_6rem] sm:items-center">
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-app">{row.orderCode}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">{row.userEmail ?? row.userId} · {formatMoney(row.amount)}</span>
          </span>
          <span><PlanBadge plan={row.plan} /></span>
          <span className="sm:justify-self-end"><PaymentStatusBadge status={row.status} /></span>
        </button>
      ))}
    </div>
  )
}

function SubscriptionTable({ rows, selectedUserId, loading, onSelect }: { rows: AdminBillingSubscription[]; selectedUserId: string | null; loading: boolean; onSelect: (row: AdminBillingSubscription) => void }) {
  const t = useT()
  return (
    <Card className="overflow-hidden p-0">
      <PanelHeader icon={<Users size={18} />} title={t.adminBilling.viewSubscriptions} subtitle={t.adminBilling.subscriptionsTableSubtitle} />
      {loading ? <SkeletonRows /> : rows.length === 0 ? <EmptyState icon={<Users size={28} />} title={t.adminBilling.noSubscriptionsFilteredTitle} description={t.adminBilling.filteredHint} /> : (
        <div className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <button key={row.userId} type="button" onClick={() => onSelect(row)} aria-pressed={selectedUserId === row.userId} className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(13rem,1fr)_7rem_6rem_7rem_9rem] lg:items-center ${selectedUserId === row.userId ? 'bg-brand-500/8' : ''}`}>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-app">{row.userEmail ?? row.userId}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{row.displayName ?? t.adminBilling.noName}</span>
              </span>
              <span><PlanBadge plan={row.plan} /></span>
              <span><SubscriptionStatusBadge status={row.status} /></span>
              <span className="text-sm font-semibold text-muted">{sourceLabel(row.source)}</span>
              <span className="text-sm font-semibold text-app lg:text-right">{row.periodEnd ? formatDate(row.periodEnd) : t.adminBilling.noExpiry}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function PaymentTable({ rows, selectedOrderCode, loading, onSelect }: { rows: AdminBillingPaymentOrder[]; selectedOrderCode: string | null; loading: boolean; onSelect: (row: AdminBillingPaymentOrder) => void }) {
  const t = useT()
  return (
    <Card className="overflow-hidden p-0">
      <PanelHeader icon={<CreditCard size={18} />} title={t.adminBilling.viewPayments} subtitle={t.adminBilling.paymentsTableSubtitle} />
      {loading ? <SkeletonRows /> : rows.length === 0 ? <EmptyState icon={<CreditCard size={28} />} title={t.adminBilling.noPaymentsFilteredTitle} description={t.adminBilling.filteredHint} /> : (
        <div className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <button key={row.orderCode} type="button" onClick={() => onSelect(row)} aria-pressed={selectedOrderCode === row.orderCode} className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[9rem_minmax(13rem,1fr)_7rem_7rem_7rem_9rem] lg:items-center ${selectedOrderCode === row.orderCode ? 'bg-brand-500/8' : ''}`}>
              <span className="text-sm font-extrabold text-app">{row.orderCode}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-app">{row.userEmail ?? row.userId}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{row.displayName ?? t.adminBilling.noName}</span>
              </span>
              <span><PlanBadge plan={row.plan} /></span>
              <span className="text-sm font-semibold text-muted">{cycleLabel(row.cycle)}</span>
              <span><PaymentStatusBadge status={row.status} /></span>
              <span className="text-sm font-bold text-app lg:text-right">{formatMoney(row.amount)}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function SubscriptionDetail({ row }: { row: AdminBillingSubscription | null }) {
  const t = useT()
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"><ShieldCheck size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">{t.adminBilling.subscriptionDetailTitle}</h3>
          <p className="text-xs text-muted">{t.adminBilling.subscriptionDetailDescription}</p>
        </div>
      </div>
      {!row ? <p className="mt-4 text-sm text-muted">{t.adminBilling.noSubscriptionSelected}</p> : (
        <div className="mt-5 space-y-2">
          <MetaRow label={t.adminBilling.labelUser} value={row.userEmail ?? row.userId} />
          <MetaRow label={t.adminBilling.labelPlan} value={planLabel(row.plan)} />
          <MetaRow label={t.adminBilling.labelStatus} value={subscriptionStatusLabel(row.status)} />
          <MetaRow label={t.adminBilling.labelSource} value={sourceLabel(row.source)} />
          <MetaRow label={t.adminBilling.labelExpiry} value={row.periodEnd ? formatDate(row.periodEnd) : t.adminBilling.noExpiry} />
          <MetaRow label={t.adminBilling.labelDaysLeft} value={row.daysLeft == null ? t.adminBilling.unknown : t.adminBilling.daysCount({ n: row.daysLeft })} />
          <MetaRow label={t.adminBilling.labelUpdatedAt} value={row.updatedAt ? formatDate(row.updatedAt) : t.adminBilling.unknown} />
        </div>
      )}
    </Card>
  )
}

function PaymentDetail({ row }: { row: AdminBillingPaymentOrder | null }) {
  const t = useT()
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"><CreditCard size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">{t.adminBilling.paymentDetailTitle}</h3>
          <p className="text-xs text-muted">{t.adminBilling.paymentDetailDescription}</p>
        </div>
      </div>
      {!row ? <p className="mt-4 text-sm text-muted">{t.adminBilling.noPaymentSelected}</p> : (
        <div className="mt-5 space-y-2">
          <MetaRow label={t.adminBilling.labelOrderCode} value={row.orderCode} />
          <MetaRow label={t.adminBilling.labelUser} value={row.userEmail ?? row.userId} />
          <MetaRow label={t.adminBilling.labelPlan} value={planLabel(row.plan)} />
          <MetaRow label={t.adminBilling.labelCycle} value={cycleLabel(row.cycle)} />
          <MetaRow label={t.adminBilling.labelAmount} value={formatMoney(row.amount)} />
          <MetaRow label={t.adminBilling.labelStatus} value={paymentStatusLabel(row.status)} />
          <MetaRow label={t.adminBilling.labelCreatedAt} value={formatDate(row.createdAt)} />
          <MetaRow label={t.adminBilling.labelPaidAt} value={row.paidAt ? formatDate(row.paidAt) : t.adminBilling.notPaid} />
        </div>
      )}
    </Card>
  )
}

function LookupPanel({ query, onQueryChange, loading, onLookup }: { query: string; onQueryChange: (value: string) => void; loading: boolean; onLookup: () => void }) {
  const t = useT()
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft"><Search size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">{t.adminBilling.lookupPanelTitle}</h3>
          <p className="text-xs text-muted">{t.adminBilling.lookupPanelDescription}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t.adminBilling.lookupInputPlaceholder} />
        <Button onClick={onLookup} disabled={loading} className="sm:w-36">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} {t.adminBilling.lookupButton}
        </Button>
      </div>
    </Card>
  )
}

function UserDetail({ detail, loading }: { detail: AdminBillingUserDetail | null; loading: boolean }) {
  const t = useT()
  if (loading) return <Card className="h-72 animate-pulse bg-[var(--surface-2)]" />
  if (!detail) return <EmptyState icon={<Users size={28} />} title={t.adminBilling.noUserSelectedTitle} description={t.adminBilling.noUserSelectedDescription} />
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"><Users size={20} /></span>
          <div className="min-w-0">
            <h3 className="truncate font-extrabold text-app">{detail.profile.email}</h3>
            <p className="truncate text-xs text-muted">{detail.profile.displayName ?? detail.profile.userId}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <SummaryPill label={t.adminBilling.labelPlan} value={detail.subscription ? planLabel(detail.subscription.plan) : 'Free'} tone={detail.subscription?.plan && detail.subscription.plan !== 'free' ? 'brand' : 'muted'} />
          <SummaryPill label={t.adminBilling.labelStatus} value={detail.subscription ? subscriptionStatusLabel(detail.subscription.status) : t.adminBilling.none} tone={detail.subscription?.status === 'active' ? 'pos' : 'warn'} />
        </div>
        <div className="mt-4 space-y-2">
          <MetaRow label={t.adminBilling.labelUserId} value={detail.profile.userId} />
          <MetaRow label={t.adminBilling.labelExpiry} value={detail.subscription?.periodEnd ? formatDate(detail.subscription.periodEnd) : t.adminBilling.none} />
          <MetaRow label={t.adminBilling.labelSource} value={sourceLabel(detail.subscription?.source ?? null)} />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <PanelHeader icon={<CreditCard size={18} />} title={t.adminBilling.paymentHistoryTitle} subtitle={t.adminBilling.paymentHistorySubtitle} />
        <MiniPaymentList rows={detail.payments.slice(0, 10)} loading={false} onSelect={() => undefined} />
      </Card>

      <Card className="overflow-hidden p-0">
        <PanelHeader icon={<Ticket size={18} />} title={t.adminBilling.redeemHistoryTitle} subtitle={t.adminBilling.redeemHistorySubtitle} />
        {detail.redemptions.length === 0 ? <EmptyState icon={<Ticket size={28} />} title={t.adminBilling.noRedeemTitle} /> : (
          <div className="divide-y divide-[var(--border)]">
            {detail.redemptions.map((row) => (
              <div key={row.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem] sm:items-center">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-app">{row.code}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{formatDate(row.usedAt)}</span>
                </span>
                <span>{row.plan ? <PlanBadge plan={row.plan} /> : <Badge tone="muted">{t.adminBilling.planUnknownBadge}</Badge>}</span>
                <span className="text-sm font-semibold text-muted sm:text-right">{t.adminBilling.daysCount({ n: row.durationDays ?? 0 })}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function ManualGrantPanel({
  email,
  userId,
  plan,
  days,
  note,
  confirmed,
  busy,
  onEmailChange,
  onUserIdChange,
  onPlanChange,
  onDaysChange,
  onNoteChange,
  onConfirmedChange,
  onGrant,
}: {
  email: string
  userId: string
  plan: AdminBillingGrantPlan
  days: number
  note: string
  confirmed: boolean
  busy: boolean
  onEmailChange: (value: string) => void
  onUserIdChange: (value: string) => void
  onPlanChange: (value: AdminBillingGrantPlan) => void
  onDaysChange: (value: number) => void
  onNoteChange: (value: string) => void
  onConfirmedChange: (value: boolean) => void
  onGrant: () => void
}) {
  const t = useT()
  const PLAN_OPTIONS: { value: AdminBillingGrantPlan; label: string }[] = [
    { value: 'personal', label: t.adminBilling.planPersonal },
    { value: 'team', label: 'Team' },
  ]
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft"><ShieldCheck size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">{t.adminBilling.grantPanelTitle}</h3>
          <p className="text-xs text-muted">{t.adminBilling.grantPanelDescription}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Field label={t.adminBilling.labelUserEmail}>
          <Input value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="user@example.com" />
        </Field>
        <Field label={t.adminBilling.labelUserId}>
          <Input value={userId} onChange={(event) => onUserIdChange(event.target.value)} placeholder={t.adminBilling.uuidPlaceholder} />
        </Field>
        <Field label={t.adminBilling.labelPlan}>
          <Segmented options={PLAN_OPTIONS} value={plan} onChange={onPlanChange} />
        </Field>
        <Field label={t.adminBilling.labelDays}>
          <Input type="number" min={1} max={3650} value={days} onChange={(event) => onDaysChange(Number(event.target.value))} />
        </Field>
        <label className="block space-y-1.5">
          <span className="text-[13px] font-semibold text-muted">{t.adminBilling.labelAuditNote}</span>
          <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows={3} className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
        <p className="text-xs font-bold uppercase text-faint">{t.adminBilling.previewTitle}</p>
        <p className="mt-1 text-sm font-extrabold text-app">{t.adminBilling.previewLine({ plan: planLabel(plan), days: formatNumber(days) })}</p>
        <p className="mt-1 break-words text-xs font-semibold text-muted">{email || userId || t.adminBilling.noUserSelectedTitle}</p>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm font-semibold text-muted">
        <input type="checkbox" checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--brand-500)]" />
        <span>{t.adminBilling.confirmCheckbox}</span>
      </label>

      <Button className="mt-4" onClick={onGrant} disabled={busy || !confirmed}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {t.adminBilling.grantButton}
      </Button>
    </Card>
  )
}

function PayosHealth({ provider, checkedAt }: { provider: AdminBillingSnapshot['provider'] | null; checkedAt: string | null }) {
  const t = useT()
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"><Database size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">{t.adminBilling.payosHealthTitle}</h3>
          <p className="text-xs text-muted">{t.adminBilling.payosHealthDescription}</p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <MetaRow label={t.adminBilling.labelStatus} value={provider?.detail ?? t.adminBilling.loading} />
        <MetaRow label={t.adminBilling.labelStalePending} value={String(provider?.stalePendingCount ?? 0)} />
        <MetaRow label={t.adminBilling.labelCheckedAt} value={checkedAt ? formatDate(checkedAt) : t.adminBilling.notYet} />
      </div>
    </Card>
  )
}

function RecentErrors({ errors, loading }: { errors: AdminBillingError[]; loading: boolean }) {
  const t = useT()
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-neg"><TriangleAlert size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">{t.adminBilling.recentErrorsTitle}</h3>
          <p className="text-xs text-muted">{t.adminBilling.recentErrorsDescription}</p>
        </div>
      </div>
      {loading ? <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[var(--surface-2)]" /> : errors.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-muted">{t.adminBilling.noRecentErrors}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {errors.map((error) => (
            <div key={error.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="text-sm font-extrabold text-app">{error.action ?? error.source}</p>
              <p className="mt-1 break-words text-xs text-muted">{error.message ?? t.adminBilling.noMessage}</p>
              <p className="mt-2 text-xs font-semibold text-faint">{formatDate(error.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <span className="text-xs font-bold uppercase text-faint">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-semibold text-app">{value}</span>
    </div>
  )
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'warn' | 'muted' }) {
  const toneClass = tone === 'pos' ? 'text-pos' : tone === 'warn' ? 'text-amber-600 dark:text-amber-300' : tone === 'muted' ? 'text-muted' : 'text-brand-600 dark:text-brand-300'
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-xs font-bold uppercase text-faint">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-extrabold ${toneClass}`}>{value}</p>
    </div>
  )
}

function BillingStatusBadge({ status }: { status: AdminBillingStatus }) {
  const t = useT()
  if (status === 'configured' || status === 'ok') return <Badge tone="pos"><CheckCircle2 size={13} />{t.adminBilling.statusConfigured}</Badge>
  if (status === 'missing') return <Badge tone="neg">{t.adminBilling.statusMissing}</Badge>
  if (status === 'failed') return <Badge tone="neg">{t.adminBilling.statusFailed}</Badge>
  return <Badge tone="muted">{t.adminBilling.statusUnknown}</Badge>
}

function PlanBadge({ plan }: { plan: string }) {
  const tone = plan === 'team' ? 'brand' : plan === 'personal' ? 'pos' : 'muted'
  return <Badge tone={tone}>{planLabel(plan)}</Badge>
}

function SubscriptionStatusBadge({ status }: { status: AdminBillingSubscriptionStatus }) {
  return <Badge tone={status === 'active' ? 'pos' : 'muted'}>{subscriptionStatusLabel(status)}</Badge>
}

function PaymentStatusBadge({ status }: { status: AdminBillingPaymentStatus }) {
  const tone = status === 'paid' ? 'pos' : status === 'pending' ? 'brand' : 'muted'
  return <Badge tone={tone}>{paymentStatusLabel(status)}</Badge>
}

function planLabel(plan: string) {
  return plan === 'team' ? 'Team' : plan === 'personal' ? t().adminBilling.planPersonal : 'Free'
}

function sourceLabel(source: string | null) {
  return source === 'payos' ? 'PayOS' : source === 'redemption' ? 'Redeem' : source === 'manual' ? t().adminBilling.sourceManual : t().adminBilling.none
}

function subscriptionStatusLabel(status: AdminBillingSubscriptionStatus) {
  const a = t().adminBilling
  return status === 'active' ? a.subActive : a.subExpired
}

function paymentStatusLabel(status: AdminBillingPaymentStatus) {
  const a = t().adminBilling
  if (status === 'paid') return a.payPaid
  if (status === 'pending') return a.pending
  return a.payCancelled
}

function providerStatusLabel(status: AdminBillingStatus | undefined) {
  const a = t().adminBilling
  if (status === 'configured' || status === 'ok') return a.statusConfigured
  if (status === 'missing') return a.statusMissing
  if (status === 'failed') return a.statusFailed
  return a.statusUnknown
}

function cycleLabel(cycle: string) {
  return cycle === 'year' ? t().adminBilling.cycleYear : t().adminBilling.cycleMonth
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(getIntlLocale()).format(value)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(getIntlLocale(), { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}
