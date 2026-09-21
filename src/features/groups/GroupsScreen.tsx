import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Check, LogIn, Plus, RefreshCw, Sparkles, TriangleAlert, Users } from 'lucide-react'
import { PageTransition } from '../../components/PageTransition'
import { Avatar, Button, EmptyState } from '../../components/ui'
import { useT } from '../../lib/i18n'
import { useStore } from '../../lib/store'
import { useShell } from '../../app/AppShell'
import { formatCompactVnd } from '../../lib/format'
import { totalGroupSpend } from '../../lib/settlement/balances'
import { settleState } from '../../lib/settlement'
import { fadeUpItem, stagger } from '../../lib/motion'
import type { Group } from '../../lib/types'
import { GroupActionsSheet } from './GroupActionsSheet'
import { JoinByCodeSheet } from './JoinByCodeSheet'
import { GroupGridSkeleton } from '../../components/Skeleton'

export function GroupsScreen() {
  const t = useT()
  const { groups, loading, mode, error, reload } = useStore()
  const { openCreateGroup } = useShell()
  const navigate = useNavigate()
  const [actionsFor, setActionsFor] = useState<Group | null>(null)
  const [joinOpen, setJoinOpen] = useState(false)
  const isCloud = mode === 'cloud'

  if (!loading && error && groups.length === 0) {
    return (
      <PageTransition>
        <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:mx-auto lg:max-w-5xl lg:pt-0">
          <Header onCreate={openCreateGroup} onJoin={() => setJoinOpen(true)} showJoin={isCloud} />
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
          <Header onCreate={openCreateGroup} onJoin={() => setJoinOpen(true)} showJoin={isCloud} />
          <EmptyState
            icon={<Sparkles size={26} />}
            title={t.home.groupsEmptyTitle}
            description={t.home.welcomeDescription}
            action={
              <div className="flex flex-col items-center gap-2.5">
                <Button size="lg" onClick={openCreateGroup}>
                  <Sparkles size={18} /> {t.home.createFirstGroup}
                </Button>
                {isCloud && (
                  <Button size="lg" variant="ghost" onClick={() => setJoinOpen(true)}>
                    <LogIn size={18} /> {t.home.joinByCode}
                  </Button>
                )}
              </div>
            }
          />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] lg:mx-auto lg:max-w-5xl lg:pt-0">
        <Header onCreate={openCreateGroup} onJoin={() => setJoinOpen(true)} showJoin={isCloud} />
        {loading && groups.length === 0 ? (
          <GroupGridSkeleton />
        ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4"
        >
          {groups.map((g) => (
            <motion.div key={g.id} variants={fadeUpItem}>
              <GroupCard
                group={g}
                onOpen={() => navigate(`/g/${g.id}`)}
                onLongPress={() => setActionsFor(g)}
              />
            </motion.div>
          ))}
        </motion.div>
        )}
      </div>

      <GroupActionsSheet group={actionsFor} onClose={() => setActionsFor(null)} />
      <JoinByCodeSheet open={joinOpen} onClose={() => setJoinOpen(false)} />
    </PageTransition>
  )
}

function Header({
  onCreate,
  onJoin,
  showJoin,
}: {
  onCreate: () => void
  onJoin: () => void
  showJoin: boolean
}) {
  const t = useT()
  return (
    <header className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-extrabold tracking-tight">{t.home.groups}</h1>
      <div className="flex items-center gap-2">
        {showJoin && (
          <Button size="sm" variant="ghost" onClick={onJoin}>
            <LogIn size={16} /> {t.home.join}
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onCreate}>
          <Plus size={16} /> {t.home.createGroup}
        </Button>
      </div>
    </header>
  )
}

function GroupCard({
  group,
  onOpen,
  onLongPress,
}: {
  group: Group
  onOpen: () => void
  onLongPress: () => void
}) {
  const t = useT()
  const spend = totalGroupSpend(group)
  const unsettled = useMemo(() => !settleState(group).isSettled, [group])
  const members = group.members

  const timer = useRef<number | null>(null)
  const longFired = useRef(false)

  function startPress() {
    longFired.current = false
    timer.current = window.setTimeout(() => {
      longFired.current = true
      onLongPress()
    }, 480)
  }
  function endPress() {
    if (timer.current) window.clearTimeout(timer.current)
  }
  function handleClick() {
    if (longFired.current) return
    onOpen()
  }

  return (
    <button
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress()
      }}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      className="card press hover-lift gradient-mesh relative w-full p-3.5 flex flex-col gap-3 text-left select-none overflow-hidden"
    >
      {/* Hàng đầu: icon + trạng thái */}
      <div className="flex items-start justify-between">
        <span className="grid place-items-center h-12 w-12 rounded-2xl gradient-brand-soft text-2xl shadow-soft">
          {group.emoji ?? '💸'}
        </span>
        {unsettled ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-neg bg-neg/12">
            <span className="h-1.5 w-1.5 rounded-full bg-neg" /> {t.home.needsSettleShort}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-pos bg-pos/12">
            <Check size={11} strokeWidth={3} /> {t.common.done}
          </span>
        )}
      </div>

      {/* Tên nhóm */}
      <p className="font-bold text-[15px] leading-tight line-clamp-2 break-words">{group.name}</p>

      {/* Số tiền */}
      <div>
        <p className="text-[11px] text-muted">{t.home.totalSpendLabel}</p>
        <p className="font-extrabold text-lg tnum text-brand-600 dark:text-brand-300 leading-none mt-0.5">
          {formatCompactVnd(spend)}
        </p>
      </div>

      {/* Thành viên */}
      <div className="flex items-center justify-between pt-0.5">
        {members.length > 0 ? (
          <div className="flex -space-x-2 items-center">
            {members.slice(0, 4).map((m) => (
              <Avatar key={m.id} name={m.name} color={m.color} src={m.avatarUrl} size="xs" />
            ))}
            {members.length > 4 && (
              <span className="grid place-items-center h-6 w-6 rounded-full surface-sunken text-[9px] font-bold text-muted ring-2 ring-[var(--surface-solid)]">
                +{members.length - 4}
              </span>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-faint">
            <Users size={12} /> {t.home.noMembers}
          </span>
        )}
        <span className="text-[11px] text-faint tnum">{members.length}</span>
      </div>
    </button>
  )
}
