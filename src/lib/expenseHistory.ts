import { formatDate, formatVnd } from './format'
import { t } from './i18n'
import { newId } from './id'
import type { Expense, Group, SplitMode } from './types'

export type ExpenseHistoryAction = 'expense.create' | 'expense.update' | 'expense.delete'

export type ExpenseHistoryChange = {
  field: string
  label: string
  before?: string
  after?: string
}

export type ExpenseHistoryEntry = {
  id: string
  groupId: string
  expenseId: string
  action: ExpenseHistoryAction
  actorName?: string
  actorUserId?: string | null
  createdAt: string
  summary: string
  changes: ExpenseHistoryChange[]
}

export type ExpenseHistoryInput = {
  id?: string
  group: Group
  action: ExpenseHistoryAction
  before?: Expense | null
  after?: Expense | null
  actorName?: string
  actorUserId?: string | null
  createdAt?: string
}

/** Nhãn chế độ chia đọc theo ngôn ngữ hiện hành (gọi tại thời điểm dùng). */
function splitModeLabel(mode: SplitMode): string {
  const e = t().expense
  return {
    equal: e.splitEqual,
    shares: e.splitShares,
    percent: e.splitPercent,
    exact: e.splitExact,
    itemized: e.splitItemized,
  }[mode]
}

/** Nhãn trường lịch sử đọc theo ngôn ngữ hiện hành (gọi tại thời điểm dùng). */
function fieldLabel(field: string): string {
  const e = t().expense
  switch (field) {
    case 'title':
      return e.fieldTitle
    case 'amount':
      return e.fieldAmount
    case 'paidAt':
      return e.fieldPaidAt
    case 'splitMode':
      return e.fieldSplitMode
    case 'payers':
      return e.fieldPayers
    case 'participants':
      return e.fieldParticipants
    case 'note':
      return e.fieldNote
    default:
      return field
  }
}

function memberName(group: Group, memberId: string): string {
  return group.members.find((m) => m.id === memberId)?.name ?? '—'
}

function payerText(expense: Expense | null | undefined, group: Group): string | undefined {
  if (!expense) return undefined
  return expense.payers
    .map((p) => `${memberName(group, p.memberId)} ${formatVnd(p.amount)}`)
    .join(', ')
}

function participantsText(expense: Expense | null | undefined, group: Group): string | undefined {
  if (!expense) return undefined
  return expense.participants.map((p) => memberName(group, p.memberId)).join(', ')
}

function valueFor(field: string, expense: Expense | null | undefined, group: Group): string | undefined {
  if (!expense) return undefined
  if (field === 'title') return expense.title
  if (field === 'amount') return formatVnd(expense.amount)
  if (field === 'paidAt') return formatDate(expense.paidAt)
  if (field === 'splitMode') return splitModeLabel(expense.splitMode)
  if (field === 'payers') return payerText(expense, group)
  if (field === 'participants') return participantsText(expense, group)
  if (field === 'note') return expense.note?.trim() || t().expense.fieldEmpty
  return undefined
}

function expenseTitle(input: ExpenseHistoryInput): string {
  return input.after?.title ?? input.before?.title ?? t().expense.defaultExpenseTitle
}

export function expenseHistorySummary(input: ExpenseHistoryInput): string {
  const e = t().expense
  const title = expenseTitle(input)
  if (input.action === 'expense.create') return e.historyAdded({ title })
  if (input.action === 'expense.delete') return e.historyDeleted({ title })
  return e.historyEdited({ title })
}

export function expenseHistoryChanges(input: ExpenseHistoryInput): ExpenseHistoryChange[] {
  const fields = ['title', 'amount', 'paidAt', 'splitMode', 'payers', 'participants', 'note']
  if (input.action === 'expense.create') {
    return fields
      .filter((f) => ['amount', 'payers', 'participants', 'splitMode'].includes(f))
      .map((field) => ({ field, label: fieldLabel(field), after: valueFor(field, input.after, input.group) }))
      .filter((c) => Boolean(c.after))
  }
  if (input.action === 'expense.delete') {
    return fields
      .filter((f) => ['amount', 'payers', 'participants', 'splitMode'].includes(f))
      .map((field) => ({ field, label: fieldLabel(field), before: valueFor(field, input.before, input.group) }))
      .filter((c) => Boolean(c.before))
  }
  return fields
    .map((field) => {
      const before = valueFor(field, input.before, input.group)
      const after = valueFor(field, input.after, input.group)
      return { field, label: fieldLabel(field), before, after }
    })
    .filter((c) => c.before !== c.after)
}

export function buildExpenseHistoryEntry(input: ExpenseHistoryInput): ExpenseHistoryEntry {
  const expenseId = input.after?.id ?? input.before?.id
  if (!expenseId) throw new Error(t().expense.missingExpenseForHistory)
  return {
    id: input.id ?? newId('hist'),
    groupId: input.group.id,
    expenseId,
    action: input.action,
    actorName: input.actorName,
    actorUserId: input.actorUserId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    summary: expenseHistorySummary(input),
    changes: expenseHistoryChanges(input),
  }
}

export function parseExpenseHistoryEntry(raw: unknown): ExpenseHistoryEntry | null {
  const item = raw as Partial<ExpenseHistoryEntry> | null
  if (!item || typeof item !== 'object') return null
  if (!item.id || !item.groupId || !item.expenseId || !item.action || !item.createdAt || !item.summary) return null
  return {
    id: item.id,
    groupId: item.groupId,
    expenseId: item.expenseId,
    action: item.action,
    actorName: item.actorName,
    actorUserId: item.actorUserId,
    createdAt: item.createdAt,
    summary: item.summary,
    changes: Array.isArray(item.changes) ? item.changes : [],
  }
}
