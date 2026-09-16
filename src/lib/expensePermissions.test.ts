import { describe, expect, it } from 'vitest'
import { canManageExpense } from './expensePermissions'
import type { Expense, Group, Member } from './types'

const ownerUserId = 'user-owner'
const memberUserId = 'user-member'
const otherUserId = 'user-other'

const members: Member[] = [
  { id: 'member-owner', name: 'Owner', userId: ownerUserId },
  { id: 'member-user', name: 'Member', userId: memberUserId },
  { id: 'member-other', name: 'Other', userId: otherUserId },
]

const group: Group = {
  id: 'group-1',
  name: 'Trip',
  createdAt: '2026-06-10T00:00:00.000Z',
  updatedAt: '2026-06-10T00:00:00.000Z',
  settlementMethod: 'smart_settle',
  ownerId: ownerUserId,
  members,
  expenses: [],
}

const expense: Expense = {
  id: 'expense-1',
  groupId: group.id,
  title: 'Dinner',
  amount: 300000,
  paidAt: '2026-06-10T00:00:00.000Z',
  splitMode: 'equal',
  payers: [{ memberId: 'member-user', amount: 300000 }],
  participants: members.map((member) => ({ memberId: member.id })),
  createdByMemberId: 'member-user',
}

describe('canManageExpense', () => {
  it('keeps local/demo expenses editable', () => {
    expect(canManageExpense({ group, expense, mode: 'local' })).toBe(true)
  })

  it('allows the group owner to edit any cloud expense', () => {
    expect(canManageExpense({ group, expense, mode: 'cloud', userId: ownerUserId })).toBe(true)
  })

  it('allows a cloud member to edit only expenses they created', () => {
    expect(canManageExpense({ group, expense, mode: 'cloud', userId: memberUserId })).toBe(true)
    expect(canManageExpense({ group, expense, mode: 'cloud', userId: otherUserId })).toBe(false)
  })
})

