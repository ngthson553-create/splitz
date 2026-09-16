import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, Plus, ReceiptText, RefreshCw, Settings2, Sparkles, TriangleAlert, Users, Wallet } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useProfile } from '../../lib/profile'
import { InsightSheet } from '../insight/InsightSheet'
import { buildGroupInsightStats } from '../../lib/insight'
import { Avatar, Button, Card, Segmented } from '../../components/ui'
import { settleState, type SettleState } from '../../lib/settlement'
import { totalGroupSpend } from '../../lib/settlement/balances'
import { formatVnd } from '../../lib/format'
import { ExpensesTab } from './ExpensesTab'
import { SettleTab } from './SettleTab'
import { GroupSettingsSheet } from './GroupSettingsSheet'
import { ExpenseSheet } from '../expense/ExpenseSheet'
import { QrSheet } from '../settle/QrSheet'
import { PageTransition } from '../../components/PageTransition'
import { fadeUp } from '../../lib/motion'
import { CountUpVnd } from '../../components/CountUp'
import { ListSkeleton } from '../../components/Skeleton'
import type { Group, SettlementTransfer } from '../../lib/types'

type Tab = 'expenses' | 'settle'

export function GroupScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { getGroup, loading, error, reload } = useStore()
  const group = getGroup(id)

  // Deep-link từ push nhắc nợ (?tab=settle) → mở thẳng tab Quyết toán.
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'settle' ? 'settle' : 'expenses')
  const [addOpen, setAddOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [insightOpen, setInsightOpen] = useState(false)
  const [qrTransfer, setQrTransfer] = useState<SettlementTransfer | null>(null)
  const { profile } = useProfile()

  const settlement = useMemo(() => (group ? settleState(group) : null), [group])

  if (loading && !group) {
    return (
      <PageTransition>
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] mt-24"><ListSkeleton /></div>
      </PageTransition>
    )
  }
  if (!group) {
    if (error) {
      return (
        <PageTransition>
          <div className="px-5 pt-20 text-center space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neg/12 text-neg">
              <TriangleAlert size={24} />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-app">Không tải được nhóm này.</p>
              <p className="text-sm text-muted">{error}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="secondary" onClick={() => void reload()}>
                <RefreshCw size={16} /> Thử lại
              </Button>
              <Button onClick={() => navigate('/groups')}>Về danh sách nhóm</Button>
            </div>
          </div>
        </PageTransition>
      )
    }

    return (
      <PageTransition>
        <div className="px-5 pt-20 text-center space-y-4">
          <p className="text-muted">Không tìm thấy nhóm này.</p>
          <Button onClick={() => navigate('/groups')}>Về danh sách nhóm</Button>
        </div>
      </PageTransition>
    )
  }

  const spend = totalGroupSpend(group)
  const currentSettlement = settlement ?? settleState(group)
  const owing = !currentSettlement.isSettled

  return (
    <PageTransition>
      <div className="pb-4 lg:pb-0">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] lg:gap-5">
          <div className="min-w-0">
        {/* Header compact */}
        <div className="relative overflow-hidden gradient-card text-white px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 rounded-b-3xl shadow-glow lg:rounded-[2rem] lg:px-6 lg:pt-6 lg:pb-6">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/12 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/groups')}
                aria-label="Quay lại"
                className="press grid place-items-center h-9 w-9 rounded-xl bg-white/15 border border-white/20 text-white hover:bg-white/25"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInsightOpen(true)}
                  aria-label="Phân tích AI"
                  className="press grid place-items-center h-9 w-9 rounded-xl bg-white/15 border border-white/20 text-white hover:bg-white/25"
                >
                  <Sparkles size={18} />
                </button>
                <button
                  onClick={() => setSettingsOpen(true)}
                  aria-label="Cài đặt nhóm"
                  className="press grid place-items-center h-9 w-9 rounded-xl bg-white/15 border border-white/20 text-white hover:bg-white/25"
                >
                  <Settings2 size={18} />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2.5">
              <span className="text-2xl shrink-0 lg:text-3xl">{group.emoji ?? '💸'}</span>
              <h1 className="min-w-0 text-xl font-extrabold leading-tight tracking-tight line-clamp-2 break-words lg:text-2xl">
                {group.name}
              </h1>
            </div>

            <div className="mt-2.5 flex items-end justify-between gap-3">
              <div>
                <p className="text-white/70 text-xs">Tổng chi</p>
                <CountUpVnd value={spend} className="text-lg font-extrabold tnum leading-tight lg:text-2xl" />
              </div>
              <div className="flex -space-x-2 items-center">
                {group.members.slice(0, 5).map((m) => (
                  <Avatar
                    key={m.id}
                    name={m.name}
                    color={m.color}
                    src={m.avatarUrl}
                    size="sm"
                    className="ring-white/30"
                  />
                ))}
                {group.members.length > 5 && (
                  <span className="grid place-items-center h-7 w-7 rounded-full bg-white/20 text-[10px] font-bold ring-2 ring-white/30">
                    +{group.members.length - 5}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 mt-4 lg:px-0">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            className="lg:max-w-md"
            options={[
              { value: 'expenses', label: 'Chi tiêu' },
              {
                value: 'settle',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    Quyết toán
                    {owing && <span className="h-1.5 w-1.5 rounded-full bg-neg" />}
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Tab content */}
        <div className="px-5 mt-4 lg:px-0">
          <AnimatePresence mode="wait">
            <motion.div key={tab} variants={fadeUp} initial="hidden" animate="show" exit="exit">
              {tab === 'expenses' && <ExpensesTab group={group} onAddExpense={() => setAddOpen(true)} />}
              {tab === 'settle' && <SettleTab group={group} onShowQr={setQrTransfer} />}
            </motion.div>
          </AnimatePresence>
        </div>
          </div>

          <GroupDesktopPanel
            group={group}
            spend={spend}
            settlement={currentSettlement}
            onAddExpense={() => setAddOpen(true)}
            onInsight={() => setInsightOpen(true)}
            onSettings={() => setSettingsOpen(true)}
          />
        </div>

        {/* FAB ghi chi — chỉ ở tab chi tiêu */}
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-5 lg:hidden">
          <div className="relative flex justify-end">
            <AnimatePresence>
              {tab === "expenses" && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  onClick={() => setAddOpen(true)}
                  aria-label="Ghi khoản chi"
                  className="pointer-events-auto grid place-items-center h-[3.25rem] w-[3.25rem] rounded-2xl gradient-brand text-white shadow-glow press hover:brightness-110"
                >
                  <Plus size={24} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ExpenseSheet group={group} open={addOpen} onClose={() => setAddOpen(false)} />
        <GroupSettingsSheet group={group} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <QrSheet group={group} transfer={qrTransfer} onClose={() => setQrTransfer(null)} />
        <InsightSheet
          open={insightOpen}
          onClose={() => setInsightOpen(false)}
          title={`Phân tích · ${group.name}`}
          stats={insightOpen ? buildGroupInsightStats(group, profile.name) : null}
        />
      </div>
    </PageTransition>
  )
}

function GroupDesktopPanel({
  group,
  spend,
  settlement,
  onAddExpense,
  onInsight,
  onSettings,
}: {
  group: Group
  spend: number
  settlement: SettleState
  onAddExpense: () => void
  onInsight: () => void
  onSettings: () => void
}) {
  const openItems = settlement.pending.length + settlement.transfers.length
  const settled = settlement.isSettled

  return (
    <aside className="hidden min-w-0 lg:block">
      <div className="sticky top-6 space-y-4">
        <Card className="gradient-mesh space-y-4">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-brand-soft text-2xl shadow-soft">
              {group.emoji ?? '💸'}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted">Không gian nhóm</p>
              <h2 className="mt-0.5 text-lg font-extrabold leading-tight line-clamp-3 break-words">
                {group.name}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <DesktopMetric icon={<Wallet size={15} />} label="Tổng chi" value={<CountUpVnd value={spend} />} />
            <DesktopMetric icon={<ReceiptText size={15} />} label="Khoản chi" value={group.expenses.length} />
            <DesktopMetric icon={<Users size={15} />} label="Thành viên" value={group.members.length} />
            <DesktopMetric
              icon={settled ? <CheckCircle2 size={15} /> : <Clock size={15} />}
              label="Quyết toán"
              value={settled ? 'Xong' : `${openItems} mục`}
            />
          </div>

          <div className="space-y-2">
            <Button fullWidth onClick={onAddExpense}>
              <Plus size={16} /> Ghi khoản chi
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button fullWidth variant="secondary" onClick={onInsight}>
                <Sparkles size={15} /> AI
              </Button>
              <Button fullWidth variant="secondary" onClick={onSettings}>
                <Settings2 size={15} /> Cài đặt
              </Button>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold">Thành viên</h3>
            <span className="text-xs font-bold text-muted tnum">{group.members.length}</span>
          </div>
          <div className="space-y-2">
            {group.members.slice(0, 6).map((m) => (
              <div key={m.id} className="flex items-start gap-3 rounded-2xl surface-sunken border border-[var(--border)] p-2.5">
                <Avatar name={m.name} color={m.color} src={m.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug line-clamp-2 break-words">{m.name}</p>
                  <p className="mt-0.5 text-xs text-muted line-clamp-1">
                    {m.role === 'owner' ? 'Chủ nhóm' : m.bankCode ? 'Có QR chuyển khoản' : 'Thành viên'}
                  </p>
                </div>
              </div>
            ))}
            {group.members.length > 6 && (
              <div className="rounded-2xl surface-sunken border border-[var(--border)] p-2.5 text-center text-xs font-semibold text-muted">
                +{group.members.length - 6} thành viên khác
              </div>
            )}
          </div>
        </Card>

        {!settled && (
          <Card className="space-y-2 border-[var(--border-strong)]">
            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300">
              <Clock size={16} />
              <p className="text-sm font-extrabold">Còn việc quyết toán</p>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              {settlement.transfers.length > 0
                ? `${settlement.transfers.length} lượt chuyển còn lại, tổng gợi ý đang chờ ${formatVnd(
                    settlement.transfers.reduce((sum, item) => sum + item.amount, 0),
                  )}.`
                : 'Có khoản đang chờ xác nhận hai chiều.'}
            </p>
          </Card>
        )}
      </div>
    </aside>
  )
}

function DesktopMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl surface-sunken border border-[var(--border)] p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-sm font-extrabold leading-tight tnum text-app truncate">{value}</p>
    </div>
  )
}
