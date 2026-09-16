import { formatDate, formatVnd } from './format'
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

const SPLIT_LABEL: Record<SplitMode, string> = {
  equal: 'Chia đều',
  shares: 'Theo phần',
  percent: 'Phần trăm',
  exact: 'Nhập tay',
  itemized: 'Theo món',
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Tên khoản',
  amount: 'Số tiền',
  paidAt: 'Ngày chi',
  splitMode: 'Cách chia',
  payers: 'Người trả',
  participants: 'Người gánh',
  note: 'Ghi chú',
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
  if (field === 'splitMode') return SPLIT_LABEL[expense.splitMode]
  if (field === 'payers') return payerText(expense, group)
  if (field === 'participants') return participantsText(expense, group)
  if (field === 'note') return expense.note?.trim() || 'Không có'
  return undefined
}

function expenseTitle(input: ExpenseHistoryInput): string {
  return input.after?.title ?? input.before?.title ?? 'Khoản chi'
}

export function expenseHistorySummary(input: ExpenseHistoryInput): string {
  const title = expenseTitle(input)
  if (input.action === 'expense.create') return `Đã thêm “${title}”`
  if (input.action === 'expense.delete') return `Đã xoá “${title}”`
  return `Đã chỉnh sửa “${title}”`
}

export function expenseHistoryChanges(input: ExpenseHistoryInput): ExpenseHistoryChange[] {
  const fields = ['title', 'amount', 'paidAt', 'splitMode', 'payers', 'participants', 'note']
  if (input.action === 'expense.create') {
    return fields
      .filter((f) => ['amount', 'payers', 'participants', 'splitMode'].includes(f))
      .map((field) => ({ field, label: FIELD_LABELS[field], after: valueFor(field, input.after, input.group) }))
      .filter((c) => Boolean(c.after))
  }
  if (input.action === 'expense.delete') {
    return fields
      .filter((f) => ['amount', 'payers', 'participants', 'splitMode'].includes(f))
      .map((field) => ({ field, label: FIELD_LABELS[field], before: valueFor(field, input.before, input.group) }))
      .filter((c) => Boolean(c.before))
  }
  return fields
    .map((field) => {
      const before = valueFor(field, input.before, input.group)
      const after = valueFor(field, input.after, input.group)
      return { field, label: FIELD_LABELS[field], before, after }
    })
    .filter((c) => c.before !== c.after)
}

export function buildExpenseHistoryEntry(input: ExpenseHistoryInput): ExpenseHistoryEntry {
  const expenseId = input.after?.id ?? input.before?.id
  if (!expenseId) throw new Error('Thiếu khoản chi để ghi lịch sử.')
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
