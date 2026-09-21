import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, Plus, Trash2 } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button, Field, Input, Segmented } from '../../components/ui'
import { useStore } from '../../lib/store'
import { errorMessage, isConflict } from '../../lib/data/errors'
import { useToast } from '../../components/Toast'
import { useNotifications } from '../../lib/notifications'
import { newId } from '../../lib/id'
import { formatVnd, parseMoneyInput } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { CURRENCIES, currencySymbol, getRateToVnd } from '../../lib/exchange'
import { sharesForExpense } from '../../lib/settlement/balances'
import { trackEvent } from '../../lib/analytics'
import { QuickParseBox } from './QuickParseBox'
import type { ParsedExpense } from '../../lib/ai/parseExpense'
import type { OcrItem } from '../../lib/ai/ocr'
import { uploadAttachment } from '../../lib/data/attachments'
import type {
  Expense,
  ExpenseItem,
  ExpenseParticipant,
  ExpensePayer,
  Group,
  SplitMode,
} from '../../lib/types'

const MODE_VALUES: SplitMode[] = ['equal', 'exact', 'percent', 'shares', 'itemized']

type DraftItem = { id: string; title: string; amountRaw: string; members: Set<string> }

export function ExpenseSheet({
  group,
  open,
  expense,
  onClose,
}: {
  group: Group
  open: boolean
  /** Có giá trị = chế độ sửa; undefined = tạo mới. */
  expense?: Expense
  onClose: () => void
}) {
  const { saveExpense } = useStore()
  const toast = useToast()
  const notifications = useNotifications()
  const t = useT()
  const isEdit = Boolean(expense)

  const MODES: { value: SplitMode; label: string }[] = MODE_VALUES.map((value) => ({
    value,
    label: {
      equal: t.expense.modeEqual,
      exact: t.expense.modeExact,
      percent: t.expense.modePercent,
      shares: t.expense.modeShares,
      itemized: t.expense.modeItemized,
    }[value],
  }))

  const [title, setTitle] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [payerIds, setPayerIds] = useState<Set<string>>(new Set())
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({})
  const [mode, setMode] = useState<SplitMode>('equal')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [values, setValues] = useState<Record<string, string>>({})
  const [items, setItems] = useState<DraftItem[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [currency, setCurrency] = useState('VND')
  const [fxRate, setFxRate] = useState<number | null>(1)
  const [fxLoading, setFxLoading] = useState(false)
  // Ảnh hoá đơn vừa quét (OCR) — upload làm chứng từ SAU khi lưu khoản chi (cần expense id).
  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null)

  const amount = parseMoneyInput(amountRaw)

  // Lấy tỷ giá khi chọn ngoại tệ (chỉ lúc TẠO MỚI).
  useEffect(() => {
    if (currency === 'VND') {
      setFxRate(1)
      return
    }
    let active = true
    setFxLoading(true)
    setFxRate(null)
    getRateToVnd(currency)
      .then((r) => active && setFxRate(r))
      .catch(() => active && setError(t.expense.fxError))
      .finally(() => active && setFxLoading(false))
    return () => {
      active = false
    }
  }, [currency])

  // Khoá khởi tạo theo lần MỞ + danh tính expense — KHÔNG reset theo `group.members`
  // (poll realtime tạo mảng mới sẽ xoá form đang nhập). Vẫn dùng members mới nhất khi nạp.
  const initKey = useRef<string | null>(null)
  useEffect(() => {
    if (!open) {
      initKey.current = null
      return
    }
    const key = expense?.id ?? '__new__'
    if (initKey.current === key) return
    initKey.current = key
    if (expense) {
      // Nạp dữ liệu khoản chi để sửa.
      const liveIds = new Set(group.members.map((m) => m.id))
      setTitle(expense.title)
      setAmountRaw(String(expense.amount))
      const livePayers = expense.payers.filter((p) => liveIds.has(p.memberId))
      setPayerIds(
        new Set(
          livePayers.length
            ? livePayers.map((p) => p.memberId)
            : ([group.members[0]?.id].filter(Boolean) as string[]),
        ),
      )
      setPayerAmounts(Object.fromEntries(livePayers.map((p) => [p.memberId, String(p.amount)])))
      setMode(expense.splitMode)
      setSelected(new Set(expense.participants.map((p) => p.memberId).filter((id) => liveIds.has(id))))
      const vals: Record<string, string> = {}
      for (const p of expense.participants) {
        if (p.splitValue != null) vals[p.memberId] = String(p.splitValue)
      }
      setValues(vals)
      setItems(
        (expense.items ?? []).map((it) => ({
          id: it.id,
          title: it.title,
          amountRaw: String(it.amount),
          members: new Set(it.participants.map((p) => p.memberId).filter((id) => liveIds.has(id))),
        })),
      )
      setNote(expense.note ?? '')
      setPendingReceipt(null)
    } else {
      setTitle('')
      setAmountRaw('')
      setPayerIds(new Set([group.members[0]?.id].filter(Boolean) as string[]))
      setPayerAmounts({})
      setMode('equal')
      setSelected(new Set(group.members.map((m) => m.id)))
      setValues({})
      setItems([])
      setNote('')
      setCurrency('VND')
      setFxRate(1)
      setPendingReceipt(null)
    }
    setError(null)
  }, [open, expense, group.members])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePayer(id: string) {
    setPayerIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const participantIds = useMemo(
    () => group.members.filter((m) => selected.has(m.id)).map((m) => m.id),
    [group.members, selected],
  )

  const equalPreview = participantIds.length > 0 ? Math.floor(amount / participantIds.length) : 0

  // Tổng tiền các món (chế độ itemized).
  const itemsTotal = useMemo(
    () => items.reduce((acc, it) => acc + parseMoneyInput(it.amountRaw), 0),
    [items],
  )

  // Người trả (nhiều người): tổng cần phân bổ + tổng đã nhập.
  const payTotal = mode === 'itemized' ? itemsTotal : amount
  const activePayerIds = useMemo(
    () => group.members.filter((m) => payerIds.has(m.id)).map((m) => m.id),
    [group.members, payerIds],
  )
  const paidSum = useMemo(
    () => activePayerIds.reduce((acc, id) => acc + parseMoneyInput(payerAmounts[id] ?? ''), 0),
    [activePayerIds, payerAmounts],
  )

  function splitPayEqually() {
    if (activePayerIds.length === 0) return
    const base = Math.floor(payTotal / activePayerIds.length)
    let rem = payTotal - base * activePayerIds.length
    const next: Record<string, string> = { ...payerAmounts }
    for (const id of activePayerIds) {
      const extra = rem > 0 ? 1 : 0
      next[id] = String(base + extra)
      rem -= extra
    }
    setPayerAmounts(next)
  }

  // ── itemized helpers ──
  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: newId('item'), title: '', amountRaw: '', members: new Set(group.members.map((m) => m.id)) },
    ])
  }
  function updateItem(id: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }
  function toggleItemMember(itemId: string, memberId: string) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it
        const next = new Set(it.members)
        if (next.has(memberId)) next.delete(memberId)
        else next.add(memberId)
        return { ...it, members: next }
      }),
    )
  }

  async function submit() {
    setError(null)
    if (activePayerIds.length === 0) return setError(t.expense.needPayer)

    let finalAmount = amount
    let participants: ExpenseParticipant[]
    let expenseItems: ExpenseItem[] | undefined

    if (mode === 'itemized') {
      const valid = items
        .map((it) => ({ ...it, amount: parseMoneyInput(it.amountRaw) }))
        .filter((it) => it.amount > 0 && it.members.size > 0)
      if (valid.length === 0) return setError(t.expense.needValidItem)
      finalAmount = valid.reduce((acc, it) => acc + it.amount, 0)
      expenseItems = valid.map((it) => ({
        id: it.id,
        title: it.title.trim() || t.expense.defaultItemTitle,
        amount: it.amount,
        participants: [...it.members].map((memberId) => ({ memberId })),
      }))
      // Participants = hợp của tất cả người trong các món.
      const union = new Set<string>()
      for (const it of valid) for (const m of it.members) union.add(m)
      participants = [...union].map((memberId) => ({ memberId }))
    } else {
      if (amount <= 0) return setError(t.expense.needValidAmount)
      if (participantIds.length === 0) return setError(t.expense.needParticipant)
      if (mode === 'equal') {
        participants = participantIds.map((memberId) => ({ memberId }))
      } else {
        participants = participantIds.map((memberId) => ({
          memberId,
          splitValue:
            mode === 'exact'
              ? parseMoneyInput(values[memberId] ?? '')
              : Number(values[memberId] ?? 0) || 0,
        }))
        const sum = participants.reduce((a, p) => a + (p.splitValue ?? 0), 0)
        if (mode === 'percent' && Math.abs(sum - 100) > 0.001)
          return setError(t.expense.percentMustBe100({ sum: String(sum) }))
        if (mode === 'exact' && sum !== amount)
          return setError(
            t.expense.exactMustMatch({ expected: formatVnd(amount), actual: formatVnd(sum) }),
          )
        if (mode === 'shares' && sum <= 0) return setError(t.expense.sharesMustBePositive)
      }
    }

    let payers: ExpensePayer[]
    if (activePayerIds.length === 1) {
      payers = [{ memberId: activePayerIds[0], amount: finalAmount }]
    } else {
      payers = activePayerIds.map((id) => ({
        memberId: id,
        amount: parseMoneyInput(payerAmounts[id] ?? ''),
      }))
      const sum = payers.reduce((a, p) => a + p.amount, 0)
      if (sum !== finalAmount)
        return setError(
          t.expense.payMustMatch({ expected: formatVnd(finalAmount), actual: formatVnd(sum) }),
        )
    }

    // ── Đa tiền tệ (chỉ khi TẠO MỚI): quy đổi mọi số tiền sang VND (base) nhất quán ──
    let baseAmount = finalAmount
    let curr: string | undefined
    let amountOriginal: number | undefined
    let exchangeRate: number | undefined
    if (!isEdit && currency !== 'VND') {
      if (!fxRate) return setError(t.expense.rateLoading)
      const rate = fxRate
      baseAmount = Math.round(finalAmount * rate)
      const scale = (parts: number[]): number[] => {
        let acc = 0
        return parts.map((p, i) => {
          if (i === parts.length - 1) return baseAmount - acc
          const v = Math.round((p / finalAmount) * baseAmount)
          acc += v
          return v
        })
      }
      if (mode === 'exact') {
        const sc = scale(participants.map((p) => p.splitValue ?? 0))
        participants = participants.map((p, i) => ({ ...p, splitValue: sc[i] }))
      }
      if (expenseItems) {
        const sc = scale(expenseItems.map((it) => it.amount))
        expenseItems = expenseItems.map((it, i) => ({ ...it, amount: sc[i] }))
      }
      const sp = scale(payers.map((p) => p.amount))
      payers = payers.map((p, i) => ({ ...p, amount: sp[i] }))
      amountOriginal = finalAmount
      exchangeRate = rate
      curr = currency
    }

    const next: Expense = {
      id: expense?.id ?? newId('exp'),
      groupId: group.id,
      title:
        title.trim() || (mode === 'itemized' ? t.expense.defaultBillTitle : t.expense.defaultExpenseTitle),
      amount: baseAmount,
      note: note.trim() || undefined,
      paidAt: expense?.paidAt ?? new Date().toISOString(),
      splitMode: mode,
      payers,
      participants,
      items: expenseItems,
      version: expense?.version,
      createdByMemberId: expense?.createdByMemberId,
      currency: curr,
      amountOriginal,
      exchangeRate,
    }

    try {
      sharesForExpense(next)
    } catch (e) {
      return setError(e instanceof Error ? e.message : t.expense.invalidExpense)
    }

    try {
      const saved = await saveExpense(group.id, next)
      trackEvent('expense_saved', {
        is_edit: isEdit,
        split_mode: mode,
        amount_vnd: baseAmount,
        currency,
        member_count: participants.length,
      })
      // Đính kèm ảnh hoá đơn vừa quét (chỉ đặt được ở cloud). Lỗi đính kèm KHÔNG làm hỏng lưu chi.
      if (pendingReceipt) {
        try {
          await uploadAttachment(group.id, saved.id, pendingReceipt)
        } catch {
          toast.error(t.expense.receiptAttachFailed)
        }
        setPendingReceipt(null)
      }
    } catch (e) {
      if (isConflict(e)) {
        return setError(t.expense.conflictUpdated)
      }
      return setError(errorMessage(e, t.expense.saveFailed))
    }

    const payerName = group.members.find((m) => m.id === activePayerIds[0])?.name ?? t.expense.someone
    notifications.add({
      kind: 'activity',
      title: isEdit
        ? t.expense.editedExpense({ title: next.title })
        : t.expense.paidExpense({ name: payerName, title: next.title }),
      body: `${formatVnd(finalAmount)} · ${group.name}`,
      href: `/g/${group.id}`,
    })

    toast.success(isEdit ? t.expense.savedUpdated : t.expense.savedCreated)
    onClose()
  }

  // Điền sẵn form từ kết quả "Nhập nhanh" (quy tắc hoặc AI). Map tên → member id.
  // Luôn để chia ĐỀU (không bóc giá trị % / phần) — user chỉnh thêm nếu cần.
  function applyParsed(p: ParsedExpense) {
    const byName = new Map(group.members.map((m) => [m.name.trim().toLowerCase(), m.id]))
    if (p.title) setTitle(p.title)
    if (p.amount > 0) setAmountRaw(String(p.amount))
    if (p.payerName) {
      const id = byName.get(p.payerName.trim().toLowerCase())
      if (id) {
        setPayerIds(new Set([id]))
        setPayerAmounts({})
      }
    }
    if (p.participantNames?.length) {
      const ids = p.participantNames
        .map((n) => byName.get(n.trim().toLowerCase()))
        .filter((id): id is string => Boolean(id))
      if (ids.length) setSelected(new Set(ids))
    }
    setMode('equal')
    setError(null)
  }

  // Áp kết quả OCR hoá đơn: tạo các MÓN (mặc định cả nhóm cùng chia mỗi món) + chế độ "Món".
  // Giữ ảnh để đính kèm sau khi lưu. User chỉnh người chia / sửa giá trước khi lưu.
  function applyOcr(ocrItems: OcrItem[], file: File) {
    if (ocrItems.length === 0) return
    const allMembers = group.members.map((m) => m.id)
    setItems(
      ocrItems.map((it) => ({
        id: newId('item'),
        title: it.title,
        amountRaw: String(it.amount),
        members: new Set(allMembers),
      })),
    )
    setMode('itemized')
    if (!title.trim()) setTitle(t.expense.defaultBillTitle)
    setPendingReceipt(file)
    setError(null)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? t.expense.editTitle : t.expense.createTitle}
      footer={
        <div className="space-y-2">
          {error && <p className="text-sm text-neg font-medium text-center">{error}</p>}
          <Button fullWidth size="lg" onClick={submit}>
            {isEdit ? t.expense.saveChanges : t.expense.saveExpense}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 py-1">
        {/* Nhập nhanh bằng một câu (chỉ khi TẠO MỚI) — quy tắc FREE + AI (Premium/quota). */}
        {!isEdit && (
          <QuickParseBox group={group} onApply={applyParsed} onReceiptScanned={applyOcr} />
        )}
        {pendingReceipt && (
          <p className="flex items-center gap-1.5 text-xs text-pos -mt-2">
            <Check size={13} /> {t.expense.receiptAttachPending}
          </p>
        )}

        {/* Số tiền lớn — ẩn ở chế độ itemized (tự tính từ các món) */}
        {mode === 'itemized' ? (
          <div className="text-center py-2">
            <p className="text-sm text-muted">{t.expense.billTotal}</p>
            <p className="mt-1 text-3xl font-extrabold tnum text-app">{formatVnd(itemsTotal)}</p>
            <p className="text-xs text-faint mt-0.5">{t.expense.billTotalHint}</p>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted">{t.expense.amount}</p>
            <input
              autoFocus={!isEdit}
              inputMode="numeric"
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              placeholder="0"
              className="mt-1 bg-transparent text-center text-4xl font-extrabold tnum w-full outline-none text-app placeholder:text-faint"
            />
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-300 tnum min-h-5">
              {currency === 'VND'
                ? amount > 0
                  ? formatVnd(amount)
                  : t.expense.amountHint
                : fxLoading
                  ? t.expense.fetchingRate
                  : fxRate && amount > 0
                    ? `${amount.toLocaleString('vi-VN')} ${currencySymbol(currency)} ≈ ${formatVnd(Math.round(amount * fxRate))}`
                    : t.expense.enterAmount}
            </p>
            {!isEdit && (
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-2 h-9 px-3 rounded-xl text-sm surface-sunken border border-[var(--border)] outline-none text-app"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <Field label={t.expense.titleLabel}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.expense.titlePlaceholder} />
        </Field>

        {/* Ai trả (hỗ trợ nhiều người) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-muted">
              {t.expense.paidBy}
              {activePayerIds.length > 1 ? ` (${activePayerIds.length})` : ''}
            </span>
            {activePayerIds.length > 1 && (
              <button
                onClick={splitPayEqually}
                className="text-xs font-semibold text-brand-600 dark:text-brand-300 press"
              >
                {t.expense.splitPayerPay}
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {group.members.map((m) => (
              <button
                key={m.id}
                onClick={() => togglePayer(m.id)}
                className={clsx(
                  'press flex flex-col items-center gap-1.5 shrink-0 w-16 py-2 rounded-2xl border transition',
                  payerIds.has(m.id) ? 'border-brand-400 bg-brand-500/10' : 'border-transparent surface-sunken',
                )}
              >
                <Avatar name={m.name} color={m.color} size="sm" />
                <span className="text-[11px] font-semibold truncate w-full text-center">{m.name}</span>
              </button>
            ))}
          </div>
          {activePayerIds.length > 1 && (
            <div className="space-y-1.5 pt-1">
              {group.members
                .filter((m) => payerIds.has(m.id))
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-2xl surface-sunken">
                    <Avatar name={m.name} color={m.color} size="sm" />
                    <span className="font-semibold text-sm truncate flex-1">{m.name}</span>
                    <input
                      inputMode="numeric"
                      value={payerAmounts[m.id] ?? ''}
                      onChange={(e) => setPayerAmounts((v) => ({ ...v, [m.id]: e.target.value }))}
                      placeholder="0"
                      className="w-28 h-9 px-3 rounded-xl surface-sunken border border-[var(--border)] text-right text-sm font-semibold tnum outline-none focus:border-brand-400"
                    />
                  </div>
                ))}
              <p
                className={clsx(
                  'text-xs tnum text-right',
                  paidSum === payTotal ? 'text-faint' : 'text-neg',
                )}
              >
                {t.expense.paidTotal({ paid: formatVnd(paidSum), total: formatVnd(payTotal) })}
              </p>
            </div>
          )}
        </div>

        {/* Cách chia */}
        <div className="space-y-2">
          <span className="text-[13px] font-semibold text-muted">{t.expense.splitModeLabel}</span>
          <Segmented value={mode} onChange={setMode} options={MODES} />
        </div>

        {/* Chia theo món */}
        {mode === 'itemized' ? (
          <div className="space-y-2.5">
            {items.map((it, idx) => (
              <ItemEditor
                key={it.id}
                index={idx}
                item={it}
                members={group.members}
                onChange={(patch) => updateItem(it.id, patch)}
                onToggleMember={(mid) => toggleItemMember(it.id, mid)}
                onRemove={() => removeItem(it.id)}
              />
            ))}
            <Button fullWidth variant="secondary" onClick={addItem}>
              <Plus size={16} /> {t.expense.addItem}
            </Button>
          </div>
        ) : (
          /* Chia cho ai (các mode còn lại) */
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-muted">
                {t.expense.splitAmong} ({participantIds.length})
              </span>
              <button
                onClick={() =>
                  setSelected((prev) =>
                    prev.size === group.members.length ? new Set() : new Set(group.members.map((m) => m.id)),
                  )
                }
                className="text-xs font-semibold text-brand-600 dark:text-brand-300 press"
              >
                {selected.size === group.members.length ? t.expense.deselectAll : t.expense.selectAll}
              </button>
            </div>
            <div className="space-y-1.5">
              {group.members.map((m) => {
                const on = selected.has(m.id)
                return (
                  <div
                    key={m.id}
                    className={clsx(
                      'flex items-center gap-3 p-2 rounded-2xl border transition',
                      on ? 'border-[var(--border-strong)] bg-[var(--surface-2)]' : 'border-transparent opacity-60',
                    )}
                  >
                    <button onClick={() => toggle(m.id)} className="press flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className={clsx(
                          'grid place-items-center h-6 w-6 rounded-lg border-2 shrink-0 transition',
                          on ? 'gradient-brand border-transparent text-white' : 'border-[var(--border-strong)]',
                        )}
                      >
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <Avatar name={m.name} color={m.color} size="sm" />
                      <span className="font-semibold text-sm truncate">{m.name}</span>
                    </button>
                    {on && mode === 'equal' && (
                      <span className="text-sm font-bold tnum text-muted shrink-0">{formatVnd(equalPreview)}</span>
                    )}
                    {on && mode !== 'equal' && (
                      <input
                        inputMode="numeric"
                        value={values[m.id] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value }))}
                        placeholder={mode === 'percent' ? '%' : mode === 'shares' ? t.expense.sharesPlaceholder : '0'}
                        className="w-24 h-9 px-3 rounded-xl surface-sunken border border-[var(--border)] text-right text-sm font-semibold tnum outline-none focus:border-brand-400"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <Field label={t.expense.noteLabel}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.expense.notePlaceholder} />
        </Field>
      </div>
    </Sheet>
  )
}

function ItemEditor({
  index,
  item,
  members,
  onChange,
  onToggleMember,
  onRemove,
}: {
  index: number
  item: DraftItem
  members: Group['members']
  onChange: (patch: Partial<DraftItem>) => void
  onToggleMember: (memberId: string) => void
  onRemove: () => void
}) {
  const amount = parseMoneyInput(item.amountRaw)
  const t = useT()
  return (
    <div className="rounded-2xl surface-sunken border border-[var(--border)] p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-faint w-5 shrink-0">#{index + 1}</span>
        <input
          value={item.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder={t.expense.itemNamePlaceholder}
          className="flex-1 min-w-0 h-9 px-3 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-sm font-semibold outline-none focus:border-brand-400"
        />
        <input
          inputMode="numeric"
          value={item.amountRaw}
          onChange={(e) => onChange({ amountRaw: e.target.value })}
          placeholder="0"
          className="w-24 h-9 px-3 rounded-xl bg-[var(--surface-solid)] border border-[var(--border)] text-right text-sm font-semibold tnum outline-none focus:border-brand-400"
        />
        <button
          onClick={onRemove}
          className="press grid place-items-center h-9 w-9 rounded-xl text-faint hover:text-neg shrink-0"
          aria-label={t.expense.deleteItem}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => {
          const on = item.members.has(m.id)
          return (
            <button
              key={m.id}
              onClick={() => onToggleMember(m.id)}
              className={clsx(
                'press inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-semibold border transition',
                on
                  ? 'border-brand-400 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                  : 'border-[var(--border)] text-muted opacity-70',
              )}
            >
              <Avatar name={m.name} color={m.color} size="sm" className="h-5 w-5 text-[9px] ring-0" />
              {m.name}
            </button>
          )
        })}
      </div>
      {amount > 0 && item.members.size > 0 && (
        <p className="text-xs text-faint tnum">
          {t.expense.perPerson({
            amount: formatVnd(Math.floor(amount / item.members.size)),
            count: item.members.size,
          })}
        </p>
      )}
    </div>
  )
}
