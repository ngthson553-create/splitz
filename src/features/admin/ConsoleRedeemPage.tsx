import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, Copy, Loader2, Plus, RefreshCw, Search, Ticket } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Segmented } from '../../components/ui'
import {
  createAdminRedeemBatch,
  createAdminRedeemCode,
  listAdminRedeemCodes,
  lookupAdminRedeemCode,
  revokeAdminRedeemCode,
  type AdminRedeemCode,
  type AdminRedeemPlan,
  type AdminRedeemStatus,
} from '../../lib/adminRedeem'

type RedeemStatusFilter = 'all' | AdminRedeemStatus
type CreateMode = 'single' | 'batch'

const PLAN_OPTIONS: { value: AdminRedeemPlan; label: string }[] = [
  { value: 'personal', label: 'Cá nhân' },
  { value: 'team', label: 'Team' },
]

const STATUS_OPTIONS: { value: RedeemStatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'exhausted', label: 'Hết lượt' },
  { value: 'revoked', label: 'Thu hồi' },
]

const CREATE_MODE_OPTIONS: { value: CreateMode; label: string }[] = [
  { value: 'single', label: 'Code đơn' },
  { value: 'batch', label: 'Tạo hàng loạt' },
]

const DURATION_OPTIONS = [7, 14, 30, 90, 365]

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

export function ConsoleRedeemPage() {
  const [codes, setCodes] = useState<AdminRedeemCode[]>([])
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<RedeemStatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [mode, setMode] = useState<CreateMode>('single')
  const [singleCode, setSingleCode] = useState('')
  const [batchPrefix, setBatchPrefix] = useState('SPLITZ')
  const [batchCount, setBatchCount] = useState(10)
  const [plan, setPlan] = useState<AdminRedeemPlan>('personal')
  const [durationDays, setDurationDays] = useState(30)
  const [maxUses, setMaxUses] = useState(1)
  const [expiresAt, setExpiresAt] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [lookupCode, setLookupCode] = useState('')

  const loadCodes = useCallback(async () => {
    setLoading(true)
    const rows = await listAdminRedeemCodes(undefined, {
      search,
      status,
      limit: 50,
    })
    setCodes(rows)
    setSelectedCode((current) => (current && rows.some((row) => row.code === current) ? current : rows[0]?.code ?? null))
    setLoading(false)
  }, [search, status])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCodes()
    }, 140)
    return () => window.clearTimeout(timeout)
  }, [loadCodes])

  const selected = useMemo(
    () => codes.find((row) => row.code === selectedCode) ?? codes[0] ?? null,
    [codes, selectedCode],
  )
  const activeCount = codes.filter((row) => row.status === 'active').length
  const blockedCount = codes.filter((row) => row.status !== 'active').length

  async function onCreate() {
    setBusy(true)
    setNotice(null)
    setGeneratedCodes([])
    const common = {
      plan,
      durationDays,
      maxUses,
      expiresAt: dateInputToIso(expiresAt),
      internalNote,
    }
    const result =
      mode === 'single'
        ? await createAdminRedeemCode(undefined, { ...common, code: singleCode })
        : await createAdminRedeemBatch(undefined, { ...common, prefix: batchPrefix, count: batchCount })
    if (typeof result === 'string') {
      if (result) {
        setGeneratedCodes([result])
        setSelectedCode(result)
        setLookupCode(result)
        setSingleCode('')
        setNotice(`Đã tạo code ${result}.`)
      } else {
        setNotice('Không tạo được redeem code. Kiểm tra quyền admin hoặc dữ liệu nhập.')
      }
    } else if (result && result.codes.length > 0) {
      setGeneratedCodes(result.codes)
      setSelectedCode(result.codes[0])
      setLookupCode(result.codes[0])
        setNotice(`Đã tạo ${result.codes.length} code hàng loạt.`)
    } else {
      setNotice('Không tạo được redeem code. Kiểm tra quyền admin hoặc dữ liệu nhập.')
    }
    setBusy(false)
    await loadCodes()
  }

  async function onLookup() {
    if (!lookupCode.trim()) return
    setBusy(true)
    setNotice(null)
    const row = await lookupAdminRedeemCode(undefined, lookupCode)
    if (row) {
      setCodes((current) => [row, ...current.filter((item) => item.code !== row.code)])
      setSelectedCode(row.code)
      setNotice(`Đã tìm thấy code ${row.code}.`)
    } else {
      setNotice('Không tìm thấy code hoặc bạn không có quyền xem.')
    }
    setBusy(false)
  }

  async function onRevoke(code: string) {
    const ok = window.confirm(`Thu hồi code ${code}? User sẽ không thể redeem code này nữa.`)
    if (!ok) return
    setBusy(true)
    setNotice(null)
    const revoked = await revokeAdminRedeemCode(undefined, code, 'Revoked from console')
    setNotice(revoked ? `Đã thu hồi code ${revoked}.` : 'Không thu hồi được code.')
    setBusy(false)
    await loadCodes()
  }

  async function copyCode(code: string) {
    await navigator.clipboard?.writeText(code).catch(() => undefined)
    setNotice(`Đã copy ${code}.`)
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 3</Badge>
              <Badge tone="pos">Cần audit</Badge>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-app">Mã Premium</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Phát hành Premium theo ngày/tháng, tạo code đơn hoặc hàng loạt, tra cứu lịch sử dùng và thu hồi code qua RPC admin có audit.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadCodes()} disabled={loading || busy}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : undefined} /> Làm mới
          </Button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <StatusPill label="Code đang xem" value={String(codes.length)} tone="brand" />
          <StatusPill label="Đang hoạt động" value={String(activeCount)} tone="pos" />
          <StatusPill label="Bị chặn" value={String(blockedCount)} tone={blockedCount > 0 ? 'muted' : 'pos'} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-app">Tạo redeem</h3>
              <p className="text-xs text-muted">Không thao tác raw SQL, mọi action được audit.</p>
            </div>
            <Segmented options={CREATE_MODE_OPTIONS} value={mode} onChange={setMode} className="sm:w-64" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {mode === 'single' ? (
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-[13px] font-semibold text-muted">Code tuỳ chọn</span>
                <Input value={singleCode} onChange={(event) => setSingleCode(event.target.value.toUpperCase())} placeholder="Để trống để tự sinh" />
              </label>
            ) : (
              <>
                <label className="block space-y-1.5">
                  <span className="text-[13px] font-semibold text-muted">Prefix</span>
                  <Input value={batchPrefix} onChange={(event) => setBatchPrefix(event.target.value.toUpperCase())} placeholder="SPLITZ" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[13px] font-semibold text-muted">Số lượng</span>
                  <Input type="number" min={1} max={200} value={batchCount} onChange={(event) => setBatchCount(Number(event.target.value))} />
                </label>
              </>
            )}

            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-muted">Gói</span>
              <Segmented options={PLAN_OPTIONS} value={plan} onChange={setPlan} />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-muted">Thời hạn</span>
              <select
                value={durationDays}
                onChange={(event) => setDurationDays(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-[var(--border)] surface-sunken px-3 text-sm font-semibold text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
              >
                {DURATION_OPTIONS.map((days) => (
                  <option key={days} value={days}>{days} ngày</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-muted">Lượt dùng tối đa</span>
              <Input type="number" min={1} value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-muted">Hết hạn</span>
              <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </label>

            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-[13px] font-semibold text-muted">Ghi chú nội bộ</span>
              <textarea
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                placeholder="Chiến dịch, lý do phát hành, người nhận..."
              />
            </label>
          </div>

          <Button className="mt-4" onClick={() => void onCreate()} disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Tạo redeem
          </Button>

          {generatedCodes.length > 0 && (
            <div className="mt-4 rounded-2xl border border-brand-400/20 bg-brand-500/10 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">Code vừa tạo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {generatedCodes.slice(0, 12).map((code) => (
                  <button key={code} type="button" onClick={() => void copyCode(code)} className="press rounded-xl bg-[var(--surface-solid)] px-3 py-2 text-xs font-extrabold text-app shadow-soft">
                    {code}
                  </button>
                ))}
                {generatedCodes.length > 12 && <span className="text-xs font-semibold text-muted">+{generatedCodes.length - 12} code</span>}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-app">Lookup nhanh</h3>
          <p className="mt-1 text-xs text-muted">Kiểm tra code, lượt dùng và lịch sử redeem.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input value={lookupCode} onChange={(event) => setLookupCode(event.target.value.toUpperCase())} placeholder="Nhập code cần kiểm tra" />
            <Button variant="secondary" onClick={() => void onLookup()} disabled={!lookupCode.trim() || busy}>
              <Search size={16} /> Kiểm tra
            </Button>
          </div>

          {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="space-y-3 min-w-0">
          <Card className="p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-center">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Lọc code, batch, ghi chú" className="pl-9" />
              </label>
              <Segmented options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            {loading && codes.length === 0 ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
              </div>
            ) : codes.length === 0 ? (
              <EmptyState icon={<Ticket size={28} />} title="Chưa có redeem code" description="Tạo code đơn hoặc batch để bắt đầu phát hành Premium." />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {codes.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setSelectedCode(item.code)}
                    className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(9rem,0.8fr)_8rem_7rem_8rem] lg:items-center ${selected?.code === item.code ? 'bg-brand-500/8' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-app">{item.code}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">{item.batchPrefix ?? 'single'} · {item.durationDays} ngày</span>
                    </span>
                    <span className="text-sm font-bold text-app">{PLAN_LABEL[item.plan]}</span>
                    <span className="text-sm font-extrabold text-app">{item.usedCount}/{item.maxUses}</span>
                    <span className="lg:justify-self-end"><RedeemStatusBadge status={item.status} /></span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </section>

        <RedeemDetailPanel code={selected} busy={busy} onCopy={copyCode} onRevoke={onRevoke} />
      </div>
    </div>
  )
}

function RedeemDetailPanel({
  code,
  busy,
  onCopy,
  onRevoke,
}: {
  code: AdminRedeemCode | null
  busy: boolean
  onCopy: (code: string) => Promise<void>
  onRevoke: (code: string) => Promise<void>
}) {
  if (!code) {
    return (
      <aside className="card h-fit p-5 text-center xl:sticky xl:top-6">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
          <Ticket size={20} />
        </div>
        <p className="mt-3 font-bold text-app">Chưa chọn code</p>
        <p className="mt-1 text-sm leading-6 text-muted">Chọn một redeem code để xem chi tiết và lịch sử dùng.</p>
      </aside>
    )
  }

  return (
    <aside className="card h-fit p-5 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-faint">Chi tiết code</p>
          <h3 className="mt-1 truncate text-lg font-extrabold text-app">{code.code}</h3>
        </div>
        <RedeemStatusBadge status={code.status} />
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <RedeemMetaRow label="Gói" value={PLAN_LABEL[code.plan]} />
        <RedeemMetaRow label="Thời hạn" value={`${code.durationDays} ngày`} />
        <RedeemMetaRow label="Lượt dùng" value={`${code.usedCount}/${code.maxUses}`} />
        <RedeemMetaRow label="Hết hạn" value={code.expiresAt ? formatDate(code.expiresAt) : 'Không đặt'} />
        <RedeemMetaRow label="Lô code" value={code.batchPrefix ? `${code.batchPrefix} / ${code.batchId}` : 'Code đơn'} />
      </div>

      {code.internalNote && (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm leading-6 text-muted">
          {code.internalNote}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={() => void onCopy(code.code)} fullWidth>
          <Copy size={16} /> Sao chép
        </Button>
        <Button variant="danger" onClick={() => void onRevoke(code.code)} disabled={busy || code.status === 'revoked'} fullWidth>
          <Ban size={16} /> Thu hồi
        </Button>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-faint">Lịch sử dùng</p>
        {code.uses.length === 0 ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-muted">Chưa có lượt dùng.</p>
        ) : (
          <div className="space-y-2">
            {code.uses.map((use) => (
              <div key={use.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="truncate text-sm font-bold text-app">{use.usedEmail ?? use.usedBy ?? 'Chưa rõ user'}</p>
                <p className="mt-0.5 text-xs text-muted">{formatDate(use.usedAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function RedeemMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-0.5 break-words font-semibold text-app">{value}</p>
    </div>
  )
}

function RedeemStatusBadge({ status }: { status: AdminRedeemStatus }) {
  const tone = status === 'active' ? 'pos' : status === 'revoked' ? 'neg' : 'muted'
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date)
}

function dateInputToIso(value: string) {
  if (!value) return null
  const date = new Date(`${value}T23:59:59+07:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'muted' }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${tone === 'pos' ? 'text-pos' : tone === 'brand' ? 'text-brand-600 dark:text-brand-300' : 'text-muted'}`}>{value}</p>
    </div>
  )
}

const PLAN_LABEL: Record<AdminRedeemPlan, string> = {
  personal: 'Cá nhân',
  team: 'Team',
}

const STATUS_LABEL: Record<AdminRedeemStatus, string> = {
  active: 'Đang hoạt động',
  expired: 'Hết hạn',
  exhausted: 'Hết lượt',
  revoked: 'Đã thu hồi',
}
