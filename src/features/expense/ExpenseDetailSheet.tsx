import { useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button } from '../../components/ui'
import { formatRelative, formatVnd } from '../../lib/format'
import { currencySymbol } from '../../lib/exchange'
import { sharesForExpense } from '../../lib/settlement/balances'
import { AttachmentSection } from './AttachmentSection'
import { ExpenseHistorySection } from './ExpenseHistorySection'
import type { Expense, Group, SplitMode } from '../../lib/types'

const SPLIT_LABEL: Record<SplitMode, string> = {
  equal: 'Chia đều',
  shares: 'Theo phần',
  percent: 'Phần trăm',
  exact: 'Nhập tay',
  itemized: 'Theo món',
}

export function ExpenseDetailSheet({
  group,
  expense,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: {
  group: Group
  expense: Expense | null
  canManage: boolean
  onClose: () => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}) {
  const memberById = useMemo(() => new Map(group.members.map((m) => [m.id, m])), [group.members])

  const shares = useMemo(() => {
    if (!expense) return null
    try {
      return sharesForExpense(expense)
    } catch {
      return null
    }
  }, [expense])

  if (!expense) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const e = expense
  const payer = memberById.get(e.payers[0]?.memberId)

  return (
    <Sheet open={Boolean(expense)} onClose={onClose} title="Chi tiết khoản chi">
      <div className="space-y-5 py-1">
        <div className="text-center">
          <p className="text-3xl font-extrabold tnum text-gradient">{formatVnd(e.amount)}</p>
          {e.currency && e.currency !== 'VND' && e.amountOriginal != null && (
            <p className="text-xs text-muted mt-0.5">
              Gốc: {e.amountOriginal.toLocaleString('vi-VN')} {currencySymbol(e.currency)}
              {e.exchangeRate ? ` · tỷ giá ${e.exchangeRate.toLocaleString('vi-VN')}` : ''}
            </p>
          )}
          <p className="mt-1 font-bold">{e.title}</p>
          <p className="text-sm text-muted">
            {SPLIT_LABEL[e.splitMode]} · {formatRelative(e.paidAt)}
          </p>
        </div>

        {e.payers.length <= 1 ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl surface-sunken">
            <Avatar name={payer?.name ?? '?'} color={payer?.color} />
            <div>
              <p className="text-xs text-muted">Người trả</p>
              <p className="font-bold">{payer?.name ?? '—'}</p>
            </div>
            <span className="ml-auto font-extrabold tnum">{formatVnd(e.amount)}</span>
          </div>
        ) : (
          <section className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted">Người trả ({e.payers.length})</h3>
            <div className="space-y-1.5">
              {e.payers.map((p) => {
                const m = memberById.get(p.memberId)
                return (
                  <div key={p.memberId} className="flex items-center gap-3 p-2 rounded-2xl surface-sunken">
                    <Avatar name={m?.name ?? '?'} color={m?.color} size="sm" />
                    <span className="font-semibold text-sm truncate flex-1">{m?.name ?? '—'}</span>
                    <span className="font-bold tnum text-sm">{formatVnd(p.amount)}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Các món (itemized) */}
        {e.splitMode === 'itemized' && e.items && e.items.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted">Các món</h3>
            <div className="space-y-1.5">
              {e.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl surface-sunken text-sm">
                  <span className="font-semibold truncate">{it.title}</span>
                  <span className="text-faint shrink-0">{it.participants.length} người</span>
                  <span className="font-bold tnum shrink-0">{formatVnd(it.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Phần chia mỗi người */}
        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold text-muted">Mỗi người gánh</h3>
          <div className="space-y-1.5">
            {shares ? (
              [...shares.entries()].map(([memberId, value]) => {
                const m = memberById.get(memberId)
                return (
                  <div key={memberId} className="flex items-center gap-3 px-1">
                    <Avatar name={m?.name ?? '?'} color={m?.color} size="sm" />
                    <span className="font-semibold text-sm truncate flex-1">{m?.name ?? '—'}</span>
                    <span className="font-bold tnum text-sm">{formatVnd(value)}</span>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-neg">Khoản chi có dữ liệu không hợp lệ.</p>
            )}
          </div>
        </section>

        {e.note && (
          <section className="space-y-1">
            <h3 className="text-[13px] font-semibold text-muted">Ghi chú</h3>
            <p className="text-sm text-app">{e.note}</p>
          </section>
        )}

        <AttachmentSection group={group} expenseId={e.id} />

        <ExpenseHistorySection key={e.id} groupId={group.id} expenseId={e.id} />

        {canManage ? (
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" fullWidth onClick={() => onEdit(e)}>
              <Pencil size={16} /> Sửa
            </Button>
            <Button variant="danger" fullWidth onClick={() => onDelete(e)}>
              <Trash2 size={16} /> Xoá
            </Button>
          </div>
        ) : (
          <p className="rounded-2xl surface-sunken border border-[var(--border)] px-3 py-2.5 text-center text-xs leading-relaxed text-muted">
            Chỉ chủ nhóm hoặc người tạo khoản chi mới được sửa/xoá khoản này.
          </p>
        )}
      </div>
    </Sheet>
  )
}
