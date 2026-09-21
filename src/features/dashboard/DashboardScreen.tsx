import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Receipt,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Wallet,
} from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'
import { Avatar, Button, EmptyState } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { useStore } from '../../lib/store'
import { useProfile } from '../../lib/profile'
import { useAuth } from '../../lib/auth'
import { useShell } from '../../app/AppShell'
import { formatVnd } from '../../lib/format'
import { CountUpVnd } from '../../components/CountUp'
import { buildDashboard, recentExpenses } from '../../lib/dashboard'
import { buildCrossGroupDebts, inferCrossGroupUserId } from '../../lib/crossGroupDebt'
import { buildDashboardInsightStats } from '../../lib/insight'
import { InsightSheet } from '../insight/InsightSheet'
import { CrossGroupDebtPanel } from './CrossGroupDebtPanel'
import { fadeUpItem, spring, stagger } from '../../lib/motion'
import type { Group } from '../../lib/types'

export function DashboardScreen() {
  const t = useT()
  const { groups, loading, mode, error, reload } = useStore()
  const { profile } = useProfile()
  const { profile: cloudProfile, session } = useAuth()
  const { openCreateGroup } = useShell()
  const navigate = useNavigate()

  const summary = useMemo(() => buildDashboard(groups, profile.name), [groups, profile.name])
  const currentUserId =
    cloudProfile?.id ??
    session?.user.id ??
    (mode === 'local' ? inferCrossGroupUserId(groups, profile.name) : null)
  const crossGroupDebt = useMemo(
    () => buildCrossGroupDebts(groups, currentUserId),
    [groups, currentUserId],
  )
  const recent = useMemo(() => recentExpenses(groups, 4), [groups])
  const [insightOpen, setInsightOpen] = useState(false)

  if (!loading && error && groups.length === 0) {
    return (
      <PageTransition>
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:mx-auto lg:max-w-5xl lg:pt-0">
          <Header />
          <EmptyState
            icon={<TriangleAlert size={26} />}
            title={t.home.loadFailedTitle}
            description={error}
            action={
              <Button size="lg" variant="secondary" onClick={() => void reload()}>
                <RefreshCw size={18} /> {t.common.retry}
              </Button>
            }
          />
        </div>
      </PageTransition>
    )
  }

  if (!loading && groups.length === 0) {
    return (
      <PageTransition>
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:mx-auto lg:max-w-5xl lg:pt-0">
          <Header />
          <EmptyState
            icon={<Sparkles size={26} />}
            title={t.home.welcomeTitle}
            description={t.home.welcomeDescription}
            action={
              <Button size="lg" onClick={openCreateGroup}>
                <Sparkles size={18} /> {t.home.createFirstGroup}
              </Button>
            }
          />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] space-y-5 lg:mx-auto lg:max-w-5xl lg:pt-0"
      >
        <Header />

        <motion.div variants={fadeUpItem}>
          <BalanceHero summary={summary} />
        </motion.div>

        {crossGroupDebt.items.length > 0 && (
          <motion.div variants={fadeUpItem}>
            <CrossGroupDebtPanel summary={crossGroupDebt} />
          </motion.div>
        )}

        {summary.totalSpend > 0 && (
          <motion.div variants={fadeUpItem}>
            <button
              onClick={() => setInsightOpen(true)}
              className="press w-full flex items-center gap-3 p-3.5 rounded-2xl card gradient-mesh text-left hover:brightness-[1.02]"
            >
              <span className="grid place-items-center h-10 w-10 rounded-xl gradient-brand text-white shadow-soft shrink-0">
                <Sparkles size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-app">{t.home.aiInsightTitle}</span>
                <span className="block text-xs text-muted">{t.home.aiInsightSubtitle}</span>
              </span>
            </button>
          </motion.div>
        )}

        {summary.unsettled.length > 0 && (
          <motion.section variants={fadeUpItem} className="space-y-2.5">
            <SectionTitle>{t.home.needsSettlement}</SectionTitle>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-5 px-5">
              {summary.unsettled.map((d) => (
                <SettleChip
                  key={d.group.id}
                  group={d.group}
                  myBalance={d.myBalance}
                  onClick={() => navigate(`/g/${d.group.id}`)}
                />
              ))}
            </div>
          </motion.section>
        )}

        {recent.length > 0 && (
          <motion.section variants={fadeUpItem} className="space-y-2.5">
            <div className="flex items-center justify-between">
              <SectionTitle>{t.home.recent}</SectionTitle>
              <button
                onClick={() => navigate('/groups')}
                className="text-xs font-semibold text-brand-600 dark:text-brand-300 press"
              >
                {t.home.viewGroups}
              </button>
            </div>
            <div className="card divide-y divide-[var(--border)] overflow-hidden p-0">
              {recent.map((r) => (
                <RecentRow
                  key={r.expense.id}
                  title={r.expense.title}
                  payer={r.payerName}
                  amount={r.expense.amount}
                  onClick={() => navigate(`/g/${r.group.id}`)}
                />
              ))}
            </div>
          </motion.section>
        )}

        <InsightSheet
          open={insightOpen}
          onClose={() => setInsightOpen(false)}
          title={t.home.insightTitle}
          stats={insightOpen ? buildDashboardInsightStats(groups, profile.name) : null}
        />
      </motion.div>
    </PageTransition>
  )
}

function Header() {
  const t = useT()
  const { profile, hasName } = useProfile()
  const navigate = useNavigate()
  return (
    <header className="flex items-center justify-between mb-5">
      <div>
        <p className="text-sm text-muted">{hasName ? t.home.greeting({ name: profile.name }) : t.home.hello}</p>
        <h1 className="text-xl font-extrabold tracking-tight text-gradient">Splitz</h1>
      </div>
      <button onClick={() => navigate('/settings')} aria-label={t.home.profile} className="press">
        <Avatar name={hasName ? profile.name : '?'} color="indigo" src={profile.avatarUrl} />
      </button>
    </header>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[15px] font-bold">{children}</h2>
}

function BalanceHero({ summary }: { summary: ReturnType<typeof buildDashboard> }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  // Khi đã khớp "tôi": hiện nợ ròng cá nhân. Nếu chưa: hiện tổng chi.
  const owing = summary.myNet < 0
  const settledUp = summary.hasMe && summary.myNet === 0

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] gradient-card text-white p-5 shadow-glow">
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/12 blur-2xl" />
      <div className="relative">
        {summary.hasMe ? (
          <>
            <div className="flex items-center gap-1.5 text-white/80 text-[13px] font-medium">
              {settledUp ? (
                <>{t.home.allSettled}</>
              ) : owing ? (
                <>
                  <ArrowUpRight size={14} /> {t.home.youOwe}
                </>
              ) : (
                <>
                  <ArrowDownLeft size={14} /> {t.home.youAreOwed}
                </>
              )}
            </div>
            <p className="mt-1.5 text-[2.1rem] leading-none font-extrabold tnum">
              {settledUp ? `0${t.format.currencySuffix}` : <CountUpVnd value={Math.abs(summary.myNet)} />}
            </p>
            {(summary.toReceive > 0 || summary.toPay > 0) && !settledUp && (
              <button
                onClick={() => setOpen((v) => !v)}
                className="press mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5"
              >
                {t.home.details}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
            )}
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: spring }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex gap-2">
                    <SplitStat label={t.home.toReceive} value={summary.toReceive} />
                    <SplitStat label={t.home.toPay} value={summary.toPay} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-white/80 text-[13px] font-medium">
              <Wallet size={14} /> {t.home.totalSpendAllGroups}
            </div>
            <p className="mt-1.5 text-[2.1rem] leading-none font-extrabold tnum">
              <CountUpVnd value={summary.totalSpend} />
            </p>
            <p className="mt-2.5 text-xs text-white/70">
              {t.home.setNameHint}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function SplitStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 bg-white/12 backdrop-blur-sm rounded-2xl px-3 py-2.5">
      <p className="text-[11px] text-white/70">{label}</p>
      <p className="mt-0.5 font-bold tnum">{formatVnd(value)}</p>
    </div>
  )
}

function SettleChip({
  group,
  myBalance,
  onClick,
}: {
  group: Group
  myBalance: number | undefined
  onClick: () => void
}) {
  const t = useT()
  const owing = myBalance != null && myBalance < 0
  const receiving = myBalance != null && myBalance > 0
  return (
    <button
      onClick={onClick}
      className="card press hover-lift shrink-0 w-40 p-3.5 text-left flex flex-col gap-2"
    >
      <div className="flex items-center gap-2">
        <span className="grid place-items-center h-9 w-9 rounded-xl gradient-brand-soft text-lg shrink-0">
          {group.emoji ?? '💸'}
        </span>
        <span className="font-bold text-sm leading-snug line-clamp-2 break-words">{group.name}</span>
      </div>
      {myBalance != null ? (
        <span
          className={`text-sm font-bold tnum ${owing ? 'text-neg' : receiving ? 'text-pos' : 'text-faint'}`}
        >
          {owing
            ? t.home.oweAmount({ amount: formatVnd(-myBalance) })
            : receiving
              ? t.home.receiveAmount({ amount: formatVnd(myBalance) })
              : '—'}
        </span>
      ) : (
        <span className="text-sm font-semibold text-muted">{t.home.notSettled}</span>
      )}
    </button>
  )
}

function RecentRow({
  title,
  payer,
  amount,
  onClick,
}: {
  title: string
  payer: string
  amount: number
  onClick: () => void
}) {
  const t = useT()
  return (
    <button
      onClick={onClick}
      className="press w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition"
    >
      <span className="grid place-items-center h-9 w-9 rounded-xl surface-sunken text-brand-600 dark:text-brand-300 shrink-0">
        <Receipt size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm leading-snug line-clamp-2 break-words">{title}</p>
        <p className="text-xs text-muted truncate">{t.home.paidBy({ name: payer })}</p>
      </div>
      <span className="font-bold tnum text-sm shrink-0">{formatVnd(amount)}</span>
    </button>
  )
}
