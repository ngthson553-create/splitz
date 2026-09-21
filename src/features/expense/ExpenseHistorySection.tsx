import { useEffect, useMemo, useState } from 'react'
import { History, Pencil, PlusCircle, Trash2 } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Badge } from '../../components/ui'
import { listExpenseHistory } from '../../lib/data/expenseHistory'
import { formatRelative } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { useStore } from '../../lib/store'
import type { ExpenseHistoryAction, ExpenseHistoryEntry } from '../../lib/expenseHistory'

export function ExpenseHistorySection({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const { mode } = useStore()
  const t = useT()
  const [items, setItems] = useState<ExpenseHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true
    listExpenseHistory(mode, groupId, expenseId)
      .then((rows) => active && setItems(rows))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [mode, groupId, expenseId])

  const preview = useMemo(() => items.slice(0, 2), [items])

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold text-muted flex items-center gap-1.5">
          <History size={14} /> {t.expense.historyTitle} {items.length > 0 && `(${items.length})`}
        </h3>
        {items.length > 2 && (
          <button
            onClick={() => setOpen(true)}
            className="press text-xs font-semibold text-brand-600 dark:text-brand-300"
          >
            {t.expense.viewAll}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-faint">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-faint">{t.expense.historyEmpty}</p>
      ) : (
        <div className="space-y-1.5">
          {preview.map((item) => (
            <HistoryRow key={item.id} item={item} compact />
          ))}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={t.expense.historyTitle}>
        <div className="space-y-2.5 py-1">
          {items.map((item) => (
            <HistoryRow key={item.id} item={item} />
          ))}
        </div>
      </Sheet>
    </section>
  )
}

function HistoryRow({ item, compact = false }: { item: ExpenseHistoryEntry; compact?: boolean }) {
  const t = useT()
  const ACTION_LABEL: Record<ExpenseHistoryAction, string> = {
    'expense.create': t.common.add,
    'expense.update': t.common.edit,
    'expense.delete': t.common.delete,
  }
  return (
    <div className="rounded-2xl surface-sunken border border-[var(--border)] p-3 space-y-2">
      <div className="flex items-start gap-2.5">
        <span className="grid place-items-center h-8 w-8 rounded-xl bg-[var(--surface-2)] text-brand-600 dark:text-brand-300 shrink-0">
          <ActionIcon action={item.action} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-app truncate">{item.summary}</p>
          <p className="text-[11px] text-muted">
            {item.actorName ?? t.expense.someone} · {formatRelative(item.createdAt)}
          </p>
        </div>
        <Badge tone={item.action === 'expense.delete' ? 'neg' : 'brand'} className="shrink-0">
          {ACTION_LABEL[item.action]}
        </Badge>
      </div>

      {item.changes.length > 0 && (
        <div className="space-y-1">
          {item.changes.slice(0, compact ? 2 : undefined).map((change) => (
            <div key={change.field} className="text-xs flex gap-2">
              <span className="text-muted shrink-0 w-20">{change.label}</span>
              <span className="min-w-0 flex-1 text-app truncate">
                {change.before && <span className="text-faint line-through">{change.before}</span>}
                {change.before && change.after && <span className="text-faint"> → </span>}
                {change.after && <span className="font-semibold">{change.after}</span>}
              </span>
            </div>
          ))}
          {compact && item.changes.length > 2 && (
            <p className="text-[11px] text-faint">{t.expense.moreChanges({ n: item.changes.length - 2 })}</p>
          )}
        </div>
      )}
    </div>
  )
}

function ActionIcon({ action }: { action: ExpenseHistoryAction }) {
  if (action === 'expense.create') return <PlusCircle size={15} />
  if (action === 'expense.delete') return <Trash2 size={15} />
  return <Pencil size={15} />
}
