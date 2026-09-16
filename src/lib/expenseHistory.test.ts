import { describe, expect, it } from 'vitest'
import type { Expense, Group } from './types'
import { buildExpenseHistoryEntry } from './expenseHistory'

const group: Group = {
  id: 'g1',
  name: 'Nhóm test',
  createdAt: '',
  updatedAt: '',
  settlementMethod: 'smart_settle',
  members: [
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ],
  expenses: [],
}

function expense(patch: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    groupId: 'g1',
    title: 'Ăn tối',
    amount: 300_000,
    paidAt: '2026-06-09T10:00:00.000Z',
    splitMode: 'equal',
    payers: [{ memberId: 'a', amount: 300_000 }],
    participants: [{ memberId: 'a' }, { memberId: 'b' }],
    ...patch,
  }
}

describe('buildExpenseHistoryEntry', () => {
  it('mô tả các thay đổi quan trọng khi sửa khoản chi', () => {
    const entry = buildExpenseHistoryEntry({
      group,
      action: 'expense.update',
      before: expense(),
      after: expense({
        title: 'Ăn trưa',
        amount: 420_000,
        payers: [{ memberId: 'b', amount: 420_000 }],
      }),
      actorName: 'An',
      createdAt: '2026-06-09T11:00:00.000Z',
    })

    expect(entry.summary).toBe('Đã chỉnh sửa “Ăn trưa”')
    expect(entry.changes).toEqual(
      expect.arrayContaining([
        { field: 'title', label: 'Tên khoản', before: 'Ăn tối', after: 'Ăn trưa' },
        { field: 'amount', label: 'Số tiền', before: '300.000đ', after: '420.000đ' },
        { field: 'payers', label: 'Người trả', before: 'An 300.000đ', after: 'Bình 420.000đ' },
      ]),
    )
  })
})
