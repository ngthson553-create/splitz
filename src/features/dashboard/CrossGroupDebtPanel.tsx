import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Crown,
  GitMerge,
  LockKeyhole,
} from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Badge } from '../../components/ui'
import { formatVnd } from '../../lib/format'
import { useSubscription } from '../../lib/subscription'
import type { CrossGroupDebtItem, CrossGroupDebtSummary } from '../../lib/crossGroupDebt'
import { PlanSheet } from '../settings/PlanSheet'

export function CrossGroupDebtPanel({ summary }: { summary: CrossGroupDebtSummary }) {
  const { isPremium } = useSubscription()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)

  if (summary.items.length === 0) return null

  const top = summary.items[0]
  const personCount = summary.items.length

  if (!isPremium) {
    return (
      <>
        <button
          onClick={() => setPlanOpen(true)}
          className="press w-full card p-3.5 text-left flex items-center gap-3 hover-lift"
        >
          <span className="grid place-items-center h-10 w-10 rounded-xl gradient-brand text-white shadow-soft shrink-0">
            <LockKeyhole size={17} />
          </span>
          <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-bold leading-snug text-app">
            Gộp công nợ liên nhóm <Crown size={13} className="text-brand-600 dark:text-brand-300" />
          </span>
            <span className="block text-xs text-muted leading-snug line-clamp-2 break-words">
              Có thể gộp với {personCount} người qua nhiều nhóm.
            </span>
          </span>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-300 shrink-0">
            Mở khoá
          </span>
        </button>
        <PlanSheet open={planOpen} onClose={() => setPlanOpen(false)} />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setDetailsOpen(true)}
        className="press w-full card gradient-mesh p-3.5 text-left flex items-center gap-3 hover-lift"
      >
        <span className="grid place-items-center h-10 w-10 rounded-xl gradient-brand text-white shadow-soft shrink-0">
          <GitMerge size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-app">Gộp công nợ liên nhóm</span>
          <span className="block text-xs text-muted leading-snug line-clamp-2 break-words">
            {top.direction === 'pay' ? 'Bạn trả' : 'Bạn nhận'} {formatVnd(top.netAmount)} · {top.otherName}
          </span>
        </span>
        <span className="grid place-items-center h-8 w-8 rounded-xl surface-sunken text-brand-600 dark:text-brand-300 shrink-0">
          <ChevronRight size={17} />
        </span>
      </button>
      <CrossGroupDebtSheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        summary={summary}
      />
    </>
  )
}

function CrossGroupDebtSheet({
  open,
  onClose,
  summary,
}: {
  open: boolean
  onClose: () => void
  summary: CrossGroupDebtSummary
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Gộp công nợ liên nhóm">
      <div className="space-y-3 py-1">
        <div className="grid grid-cols-2 gap-2">
          <TotalBox label="Cần trả" value={summary.totalToPay} tone="neg" />
          <TotalBox label="Được nhận" value={summary.totalToReceive} tone="pos" />
        </div>

        <div className="space-y-2.5">
          {summary.items.map((item) => (
            <DebtPersonCard key={item.otherUserId} item={item} onClose={onClose} />
          ))}
        </div>
      </div>
    </Sheet>
  )
}

function TotalBox({ label, value, tone }: { label: string; value: number; tone: 'pos' | 'neg' }) {
  return (
    <div className="surface-sunken rounded-2xl p-3 border border-[var(--border)]">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold tnum ${tone === 'pos' ? 'text-pos' : 'text-neg'}`}>
        {formatVnd(value)}
      </p>
    </div>
  )
}

function DebtPersonCard({ item, onClose }: { item: CrossGroupDebtItem; onClose: () => void }) {
  const navigate = useNavigate()
  const receiving = item.direction === 'receive'

  function openGroup(groupId: string) {
    onClose()
    navigate(`/g/${groupId}?tab=settle`)
  }

  return (
    <div className="card p-3.5 space-y-3">
      <div className="flex items-center gap-2.5">
        <Avatar
          name={item.otherName}
          color={item.otherColor}
          src={item.otherAvatarUrl}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-app line-clamp-2 break-words">{item.otherName}</p>
          <p className="text-xs text-muted">{item.groupCount} nhóm chung</p>
        </div>
        <Badge tone={receiving ? 'pos' : 'neg'}>
          {receiving ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
          {receiving ? 'Nhận' : 'Trả'} {formatVnd(item.netAmount)}
        </Badge>
      </div>

      <div className="space-y-1.5">
        {item.groups.map((group) => {
          const groupReceiving = group.signedAmount > 0
          return (
            <button
              key={group.groupId}
              onClick={() => openGroup(group.groupId)}
              className="press w-full flex items-center gap-2.5 rounded-xl surface-sunken border border-[var(--border)] px-3 py-2 text-left hover:border-brand-400/40"
            >
              <span className="text-lg shrink-0">{group.groupEmoji ?? '💸'}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug line-clamp-2 break-words">{group.groupName}</span>
                <span className="block text-[11px] text-muted">Mở tab quyết toán</span>
              </span>
              <span
                className={`text-xs font-extrabold tnum shrink-0 ${groupReceiving ? 'text-pos' : 'text-neg'}`}
              >
                {groupReceiving ? '+' : '-'}{formatVnd(Math.abs(group.signedAmount))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
