import { useMemo, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { Receipt, Trash2 } from 'lucide-react'
import { Avatar, Button, EmptyState } from '../../components/ui'
import { formatRelative, formatVnd } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { useStore } from '../../lib/store'
import { useConfirm } from '../../components/ConfirmDialog'
import { useToast } from '../../components/Toast'
import { useNotifications } from '../../lib/notifications'
import { errorMessage, isConflict } from '../../lib/data/errors'
import { fadeUpItem, stagger } from '../../lib/motion'
import { trackEvent } from '../../lib/analytics'
import { useAuth } from '../../lib/auth'
import { canManageExpense } from '../../lib/expensePermissions'
import type { Expense, Group, SplitMode } from '../../lib/types'
import { ExpenseSheet } from '../expense/ExpenseSheet'
import { ExpenseDetailSheet } from '../expense/ExpenseDetailSheet'

export function ExpensesTab({ group, onAddExpense }: { group: Group; onAddExpense: () => void }) {
  const { mode, removeExpense } = useStore()
  const { profile } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const notifications = useNotifications()
  const t = useT()
  const memberById = useMemo(() => new Map(group.members.map((m) => [m.id, m])), [group.members])

  const [detail, setDetail] = useState<Expense | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)

  const sorted = useMemo(
    () => [...group.expenses].sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
    [group.expenses],
  )

  const canManage = (expense: Expense) =>
    canManageExpense({ group, expense, mode, userId: profile?.id })

  async function remove(expense: Expense, ask = true) {
    if (!canManage(expense)) {
      toast.error(t.group.deleteForbiddenToast)
      return
    }
    if (ask) {
      const ok = await confirm({
        title: t.group.deleteExpenseTitle({ title: expense.title }),
        description: t.group.deleteExpenseDesc({ amount: formatVnd(expense.amount) }),
        confirmLabel: t.common.delete,
        danger: true,
      })
      if (!ok) return
    }
    try {
      await removeExpense(group.id, expense.id, expense.version)
      trackEvent('expense_deleted', { amount_vnd: expense.amount, split_mode: expense.splitMode })
    } catch (e) {
      setDetail(null)
      if (isConflict(e)) return toast.error(t.group.expenseConflictToast)
      return toast.error(errorMessage(e, t.group.deleteExpenseError))
    }
    notifications.add({
      kind: 'activity',
      title: t.group.expenseDeletedTitle({ title: expense.title }),
      body: `${formatVnd(expense.amount)} · ${group.name}`,
      href: `/g/${group.id}`,
    })
    toast.success(t.group.expenseDeletedToast)
    setDetail(null)
  }

  if (group.expenses.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Receipt size={26} />}
          title={t.group.noExpensesTitle}
          description={t.group.noExpensesDesc}
          action={<Button size="lg" onClick={onAddExpense}>+ {t.group.addExpense}</Button>}
        />
        <ExpenseSheet group={group} open={Boolean(editing)} expense={editing ?? undefined} onClose={() => setEditing(null)} />
      </>
    )
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
        {sorted.map((e) => (
          <motion.div key={e.id} variants={fadeUpItem} layout>
            <SwipeRow disabled={!canManage(e)} onDelete={() => remove(e, true)}>
              <ExpenseRow
                expense={e}
                payerName={memberById.get(e.payers[0]?.memberId)?.name ?? '—'}
                payerColor={memberById.get(e.payers[0]?.memberId)?.color}
                payerCount={e.payers.length}
                onClick={() => setDetail(e)}
              />
            </SwipeRow>
          </motion.div>
        ))}
      </motion.div>

      <ExpenseDetailSheet
        group={group}
        expense={detail}
        canManage={detail ? canManage(detail) : false}
        onClose={() => setDetail(null)}
        onEdit={(e) => {
          setDetail(null)
          setEditing(e)
        }}
        onDelete={(e) => remove(e, true)}
      />
      <ExpenseSheet
        group={group}
        open={Boolean(editing)}
        expense={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
    </>
  )
}

/** Vuốt sang trái để lộ nút xoá. */
function SwipeRow({
  children,
  disabled,
  onDelete,
}: {
  children: ReactNode
  disabled?: boolean
  onDelete: () => void
}) {
  const x = useMotionValue(0)
  const deleteOpacity = useTransform(x, [-80, -20], [1, 0])

  function onDragEnd(_: unknown, info: PanInfo) {
    if (disabled) return
    if (info.offset.x < -70) onDelete()
    x.set(0)
  }

  return (
    <div className="relative">
      {!disabled && (
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute inset-y-0 right-0 w-16 grid place-items-center rounded-2xl bg-neg text-white"
        >
          <Trash2 size={18} />
        </motion.div>
      )}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={disabled ? undefined : { left: -80, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={onDragEnd}
      >
        {children}
      </motion.div>
    </div>
  )
}

function ExpenseRow({
  expense,
  payerName,
  payerColor,
  payerCount,
  onClick,
}: {
  expense: Expense
  payerName: string
  payerColor?: string
  payerCount?: number
  onClick: () => void
}) {
  const t = useT()
  const splitLabels: Record<SplitMode, string> = {
    equal: t.group.splitEqual,
    shares: t.group.splitShares,
    percent: t.group.splitPercent,
    exact: t.group.splitExact,
    itemized: t.group.splitItemized,
  }
  return (
    <button
      onClick={onClick}
      className="card press w-full grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-3 p-3.5 text-left lg:grid-cols-[2.5rem_minmax(0,1fr)_auto] lg:p-4"
    >
      <Avatar name={payerName} color={payerColor} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm leading-snug line-clamp-3 break-words lg:text-[15px]">
          {expense.title}
        </p>
        <p className="mt-0.5 text-xs text-muted leading-snug line-clamp-2 break-words">
          {payerName}
          {payerCount && payerCount > 1 ? ` +${payerCount - 1}` : ''} {t.group.paidLabel} ·{' '}
          {splitLabels[expense.splitMode]} · {formatRelative(expense.paidAt)}
        </p>
      </div>
      <span className="mt-0.5 max-w-[8.5rem] text-right font-extrabold tnum text-sm leading-tight text-app shrink-0 sm:max-w-none lg:text-[15px]">
        {formatVnd(expense.amount)}
      </span>
    </button>
  )
}
