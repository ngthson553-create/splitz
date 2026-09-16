import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, CreditCard, Database, Loader2, RefreshCw, Search, ShieldCheck, Ticket, TriangleAlert, Users } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, Segmented } from '../../components/ui'
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

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const NUMBER_FORMAT = new Intl.NumberFormat('vi-VN')
const MONEY_FORMAT = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })

const VIEW_OPTIONS: { value: BillingView; label: string }[] = [
  { value: 'overview', label: 'Tổng quan' },
  { value: 'subscriptions', label: 'Gói Premium' },
  { value: 'payments', label: 'Đơn thanh toán' },
  { value: 'user', label: 'Tra Premium' },
]

const SUBSCRIPTION_OPTIONS: { value: SubscriptionFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang dùng' },
  { value: 'expired', label: 'Đã hết hạn' },
]

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Đang chờ' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const PLAN_OPTIONS: { value: AdminBillingGrantPlan; label: string }[] = [
  { value: 'personal', label: 'Cá nhân' },
  { value: 'team', label: 'Team' },
]

export function ConsoleBillingPage() {
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
    setNotice(next ? null : 'Không tải được snapshot thanh toán. Kiểm tra quyền admin hoặc Edge Function admin-billing.')
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
      setNotice('Cần nhập email hoặc user id để lookup.')
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
      setNotice('Đã tải hồ sơ billing của user.')
    } else {
      setNotice('Không tìm thấy user hoặc Edge Function từ chối lookup.')
    }
    setLookupLoading(false)
  }

  async function onGrantPremium() {
    const cleanEmail = grantEmail.trim()
    const cleanUserId = grantUserId.trim()
    if (!cleanEmail && !cleanUserId) {
      setNotice('Cần nhập email hoặc user id để cấp Premium.')
      return
    }
    if (!grantConfirmed) {
      setNotice('Cần tick xác nhận trước khi cấp Premium thủ công.')
      return
    }
    const target = cleanEmail || cleanUserId
    const ok = window.confirm(`Cấp ${grantPlan} trong ${grantDays} ngày cho ${target}? Hành động này sẽ ghi audit.`)
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
      setNotice(`Đã cấp ${planLabel(result.plan)} cho ${result.userEmail ?? target}.`)
      setGrantConfirmed(false)
      await loadSnapshot()
      await runLookup(result.userEmail ?? result.userId)
    } else {
      setNotice('Không cấp được Premium. Kiểm tra quyền owner/operator hoặc dữ liệu user.')
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
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">Thanh toán / Premium</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Theo dõi gói Premium, đơn thanh toán, PayOS webhook và cấp Premium thủ công qua Edge Function admin-only có audit.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading || busy}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Làm mới
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label="PayOS" value={providerStatusLabel(snapshot?.provider.status)} tone={snapshot?.provider.status === 'configured' ? 'pos' : 'warn'} />
          <SummaryPill label="Premium đang dùng" value={NUMBER_FORMAT.format(activePremium)} tone="brand" />
          <SummaryPill label="Đơn đang chờ" value={NUMBER_FORMAT.format(pendingOrders)} tone={pendingOrders > 0 ? 'warn' : 'pos'} />
          <SummaryPill label="Cấp thủ công" value="Có audit" tone="pos" />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,34rem)] lg:items-center">
          <Segmented options={VIEW_OPTIONS} value={view} onChange={setView} />
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_11rem]">
            <label className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm email, tên, user id" className="pl-9" />
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
  return (
    <div className="space-y-4">
      <MetricGrid metrics={snapshot?.metrics ?? []} loading={loading} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="grid gap-4 lg:grid-cols-2 min-w-0">
          <Card className="overflow-hidden p-0">
            <PanelHeader icon={<Users size={18} />} title="Gói Premium" subtitle="Gói đang/đã active gần nhất" />
            <MiniSubscriptionList rows={(snapshot?.subscriptions ?? []).slice(0, 6)} loading={loading} onSelect={onSelectSubscription} />
          </Card>
          <Card className="overflow-hidden p-0">
            <PanelHeader icon={<CreditCard size={18} />} title="Đơn thanh toán" subtitle="Đơn PayOS gần nhất" />
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
          <p className="mt-2 text-2xl font-extrabold text-app">{NUMBER_FORMAT.format(metric.value)}</p>
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
  if (loading) return <SkeletonRows />
  if (rows.length === 0) return <EmptyState icon={<Users size={28} />} title="Chưa có gói Premium" description="Gói sẽ hiện khi có user Premium hoặc bộ lọc khớp." />
  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map((row) => (
        <button key={`${row.userId}-${row.updatedAt ?? row.createdAt}`} type="button" onClick={() => onSelect(row)} className="press grid w-full gap-2 px-4 py-3 text-left hover:bg-[var(--surface-2)] sm:grid-cols-[minmax(0,1fr)_7rem_6rem] sm:items-center">
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold text-app">{row.userEmail ?? row.userId}</span>
            <span className="mt-0.5 block truncate text-xs text-muted">{row.displayName ?? 'Chưa có tên'} · {formatDate(row.updatedAt ?? row.createdAt)}</span>
          </span>
          <span><PlanBadge plan={row.plan} /></span>
          <span className="sm:justify-self-end"><SubscriptionStatusBadge status={row.status} /></span>
        </button>
      ))}
    </div>
  )
}

function MiniPaymentList({ rows, loading, onSelect }: { rows: AdminBillingPaymentOrder[]; loading: boolean; onSelect: (row: AdminBillingPaymentOrder) => void }) {
  if (loading) return <SkeletonRows />
  if (rows.length === 0) return <EmptyState icon={<CreditCard size={28} />} title="Chưa có đơn thanh toán" description="Đơn PayOS sẽ hiện khi user tạo thanh toán." />
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
  return (
    <Card className="overflow-hidden p-0">
      <PanelHeader icon={<Users size={18} />} title="Gói Premium" subtitle="Gói, trạng thái, nguồn kích hoạt và ngày hết hạn" />
      {loading ? <SkeletonRows /> : rows.length === 0 ? <EmptyState icon={<Users size={28} />} title="Không có gói Premium" description="Thử đổi bộ lọc hoặc tra user cụ thể." /> : (
        <div className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <button key={row.userId} type="button" onClick={() => onSelect(row)} aria-pressed={selectedUserId === row.userId} className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(13rem,1fr)_7rem_6rem_7rem_9rem] lg:items-center ${selectedUserId === row.userId ? 'bg-brand-500/8' : ''}`}>
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-app">{row.userEmail ?? row.userId}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{row.displayName ?? 'Chưa có tên'}</span>
              </span>
              <span><PlanBadge plan={row.plan} /></span>
              <span><SubscriptionStatusBadge status={row.status} /></span>
              <span className="text-sm font-semibold text-muted">{sourceLabel(row.source)}</span>
              <span className="text-sm font-semibold text-app lg:text-right">{row.periodEnd ? formatDate(row.periodEnd) : 'Không hạn'}</span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function PaymentTable({ rows, selectedOrderCode, loading, onSelect }: { rows: AdminBillingPaymentOrder[]; selectedOrderCode: string | null; loading: boolean; onSelect: (row: AdminBillingPaymentOrder) => void }) {
  return (
    <Card className="overflow-hidden p-0">
      <PanelHeader icon={<CreditCard size={18} />} title="Đơn thanh toán" subtitle="Đơn PayOS theo user, trạng thái và thời gian" />
      {loading ? <SkeletonRows /> : rows.length === 0 ? <EmptyState icon={<CreditCard size={28} />} title="Không có đơn thanh toán" description="Thử đổi bộ lọc hoặc tra user cụ thể." /> : (
        <div className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <button key={row.orderCode} type="button" onClick={() => onSelect(row)} aria-pressed={selectedOrderCode === row.orderCode} className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[9rem_minmax(13rem,1fr)_7rem_7rem_7rem_9rem] lg:items-center ${selectedOrderCode === row.orderCode ? 'bg-brand-500/8' : ''}`}>
              <span className="text-sm font-extrabold text-app">{row.orderCode}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-app">{row.userEmail ?? row.userId}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{row.displayName ?? 'Chưa có tên'}</span>
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
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"><ShieldCheck size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">Chi tiết gói Premium</h3>
          <p className="text-xs text-muted">Nguồn Premium và hạn còn lại.</p>
        </div>
      </div>
      {!row ? <p className="mt-4 text-sm text-muted">Chưa chọn gói Premium.</p> : (
        <div className="mt-5 space-y-2">
          <MetaRow label="User" value={row.userEmail ?? row.userId} />
          <MetaRow label="Gói" value={planLabel(row.plan)} />
          <MetaRow label="Trạng thái" value={subscriptionStatusLabel(row.status)} />
          <MetaRow label="Nguồn" value={sourceLabel(row.source)} />
          <MetaRow label="Hết hạn" value={row.periodEnd ? formatDate(row.periodEnd) : 'Không hạn'} />
          <MetaRow label="Ngày còn lại" value={row.daysLeft == null ? 'Không rõ' : `${row.daysLeft} ngày`} />
          <MetaRow label="Cập nhật" value={row.updatedAt ? formatDate(row.updatedAt) : 'Không rõ'} />
        </div>
      )}
    </Card>
  )
}

function PaymentDetail({ row }: { row: AdminBillingPaymentOrder | null }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"><CreditCard size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">Chi tiết đơn thanh toán</h3>
          <p className="text-xs text-muted">Đơn PayOS và trạng thái webhook.</p>
        </div>
      </div>
      {!row ? <p className="mt-4 text-sm text-muted">Chưa chọn đơn thanh toán.</p> : (
        <div className="mt-5 space-y-2">
          <MetaRow label="Mã đơn" value={row.orderCode} />
          <MetaRow label="User" value={row.userEmail ?? row.userId} />
          <MetaRow label="Gói" value={planLabel(row.plan)} />
          <MetaRow label="Chu kỳ" value={cycleLabel(row.cycle)} />
          <MetaRow label="Số tiền" value={formatMoney(row.amount)} />
          <MetaRow label="Trạng thái" value={paymentStatusLabel(row.status)} />
          <MetaRow label="Tạo lúc" value={formatDate(row.createdAt)} />
          <MetaRow label="Thanh toán" value={row.paidAt ? formatDate(row.paidAt) : 'Chưa thanh toán'} />
        </div>
      )}
    </Card>
  )
}

function LookupPanel({ query, onQueryChange, loading, onLookup }: { query: string; onQueryChange: (value: string) => void; loading: boolean; onLookup: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft"><Search size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">Tra Premium</h3>
          <p className="text-xs text-muted">Tra email hoặc user id qua admin-billing.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="user@example.com hoặc user id" />
        <Button onClick={onLookup} disabled={loading} className="sm:w-36">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Tra cứu
        </Button>
      </div>
    </Card>
  )
}

function UserDetail({ detail, loading }: { detail: AdminBillingUserDetail | null; loading: boolean }) {
  if (loading) return <Card className="h-72 animate-pulse bg-[var(--surface-2)]" />
  if (!detail) return <EmptyState icon={<Users size={28} />} title="Chưa chọn user" description="Tra cứu hoặc bấm một gói/đơn thanh toán để xem hồ sơ Premium." />
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
          <SummaryPill label="Gói" value={detail.subscription ? planLabel(detail.subscription.plan) : 'Free'} tone={detail.subscription?.plan && detail.subscription.plan !== 'free' ? 'brand' : 'muted'} />
          <SummaryPill label="Trạng thái" value={detail.subscription ? subscriptionStatusLabel(detail.subscription.status) : 'Không có'} tone={detail.subscription?.status === 'active' ? 'pos' : 'warn'} />
        </div>
        <div className="mt-4 space-y-2">
          <MetaRow label="User id" value={detail.profile.userId} />
          <MetaRow label="Hết hạn" value={detail.subscription?.periodEnd ? formatDate(detail.subscription.periodEnd) : 'Không có'} />
          <MetaRow label="Nguồn" value={sourceLabel(detail.subscription?.source ?? null)} />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <PanelHeader icon={<CreditCard size={18} />} title="Lịch sử thanh toán" subtitle="10 đơn gần nhất của user" />
        <MiniPaymentList rows={detail.payments.slice(0, 10)} loading={false} onSelect={() => undefined} />
      </Card>

      <Card className="overflow-hidden p-0">
        <PanelHeader icon={<Ticket size={18} />} title="Lịch sử redeem" subtitle="Code đã dùng gần nhất" />
        {detail.redemptions.length === 0 ? <EmptyState icon={<Ticket size={28} />} title="Chưa có redeem" /> : (
          <div className="divide-y divide-[var(--border)]">
            {detail.redemptions.map((row) => (
              <div key={row.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_8rem] sm:items-center">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-app">{row.code}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{formatDate(row.usedAt)}</span>
                </span>
                <span>{row.plan ? <PlanBadge plan={row.plan} /> : <Badge tone="muted">chưa rõ</Badge>}</span>
                <span className="text-sm font-semibold text-muted sm:text-right">{row.durationDays ?? 0} ngày</span>
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
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft"><ShieldCheck size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">Cấp Premium thủ công</h3>
          <p className="text-xs text-muted">Cấp/gia hạn Premium qua service role + audit.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Field label="Email user">
          <Input value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="user@example.com" />
        </Field>
        <Field label="User id">
          <Input value={userId} onChange={(event) => onUserIdChange(event.target.value)} placeholder="UUID nếu cần" />
        </Field>
        <Field label="Gói">
          <Segmented options={PLAN_OPTIONS} value={plan} onChange={onPlanChange} />
        </Field>
        <Field label="Số ngày">
          <Input type="number" min={1} max={3650} value={days} onChange={(event) => onDaysChange(Number(event.target.value))} />
        </Field>
        <label className="block space-y-1.5">
          <span className="text-[13px] font-semibold text-muted">Ghi chú audit</span>
          <textarea value={note} onChange={(event) => onNoteChange(event.target.value)} rows={3} className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30" />
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
        <p className="text-xs font-bold uppercase text-faint">Xem trước</p>
        <p className="mt-1 text-sm font-extrabold text-app">{planLabel(plan)} · {NUMBER_FORMAT.format(days)} ngày</p>
        <p className="mt-1 break-words text-xs font-semibold text-muted">{email || userId || 'Chưa chọn user'}</p>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm font-semibold text-muted">
        <input type="checkbox" checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} className="mt-1 h-4 w-4 rounded border-[var(--border)] accent-[var(--brand-500)]" />
        <span>Đã kiểm tra đúng user, gói và số ngày.</span>
      </label>

      <Button className="mt-4" onClick={onGrant} disabled={busy || !confirmed}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Xác nhận cấp Premium
      </Button>
    </Card>
  )
}

function PayosHealth({ provider, checkedAt }: { provider: AdminBillingSnapshot['provider'] | null; checkedAt: string | null }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300"><Database size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">Sức khỏe PayOS</h3>
          <p className="text-xs text-muted">Secret chỉ được kiểm tra ở mức đã cấu hình/thiếu cấu hình.</p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <MetaRow label="Trạng thái" value={provider?.detail ?? 'Đang tải'} />
        <MetaRow label="Đơn chờ quá lâu" value={String(provider?.stalePendingCount ?? 0)} />
        <MetaRow label="Đã kiểm tra" value={checkedAt ? formatDate(checkedAt) : 'Chưa có'} />
      </div>
    </Card>
  )
}

function RecentErrors({ errors, loading }: { errors: AdminBillingError[]; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-neg"><TriangleAlert size={20} /></span>
        <div>
          <h3 className="font-extrabold text-app">Lỗi billing gần đây</h3>
          <p className="text-xs text-muted">Audit lỗi đã redact.</p>
        </div>
      </div>
      {loading ? <div className="mt-4 h-24 animate-pulse rounded-2xl bg-[var(--surface-2)]" /> : errors.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-muted">Không có lỗi billing gần đây.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {errors.map((error) => (
            <div key={error.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="text-sm font-extrabold text-app">{error.action ?? error.source}</p>
              <p className="mt-1 break-words text-xs text-muted">{error.message ?? 'Không có message'}</p>
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
  if (status === 'configured' || status === 'ok') return <Badge tone="pos"><CheckCircle2 size={13} />Đã cấu hình</Badge>
  if (status === 'missing') return <Badge tone="neg">Thiếu cấu hình</Badge>
  if (status === 'failed') return <Badge tone="neg">Lỗi</Badge>
  return <Badge tone="muted">Chưa rõ</Badge>
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
  return plan === 'team' ? 'Team' : plan === 'personal' ? 'Cá nhân' : 'Free'
}

function sourceLabel(source: string | null) {
  return source === 'payos' ? 'PayOS' : source === 'redemption' ? 'Redeem' : source === 'manual' ? 'Thủ công' : 'Không có'
}

function subscriptionStatusLabel(status: AdminBillingSubscriptionStatus) {
  return status === 'active' ? 'Đang dùng' : 'Đã hết hạn'
}

function paymentStatusLabel(status: AdminBillingPaymentStatus) {
  if (status === 'paid') return 'Đã thanh toán'
  if (status === 'pending') return 'Đang chờ'
  return 'Đã hủy'
}

function providerStatusLabel(status: AdminBillingStatus | undefined) {
  if (status === 'configured' || status === 'ok') return 'Đã cấu hình'
  if (status === 'missing') return 'Thiếu cấu hình'
  if (status === 'failed') return 'Lỗi'
  return 'Chưa rõ'
}

function cycleLabel(cycle: string) {
  return cycle === 'year' ? 'Năm' : 'Tháng'
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date)
}

function formatMoney(value: number) {
  return MONEY_FORMAT.format(value)
}
