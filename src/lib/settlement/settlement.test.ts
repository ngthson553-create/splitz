import { describe, expect, it } from 'vitest'
import type { Group } from '../types'
import { balancesForGroup, sharesForExpense } from './balances'
import { generateSmartSettleTransfers } from './smartSettle'
import { generateMaxReductionTransfers } from './maxReduction'
import { settleGroup } from './index'

function group(partial: Partial<Group>): Group {
  return {
    id: 'g1',
    name: 'Test',
    createdAt: '',
    updatedAt: '',
    settlementMethod: 'smart_settle',
    members: [],
    expenses: [],
    ...partial,
  }
}

describe('sharesForExpense', () => {
  it('chia đều có phân phối phần lẻ từng đồng', () => {
    const shares = sharesForExpense({
      id: 'e',
      groupId: 'g1',
      title: 't',
      amount: 100,
      paidAt: '',
      splitMode: 'equal',
      payers: [{ memberId: 'a', amount: 100 }],
      participants: [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }],
    })
    expect(shares.get('a')).toBe(34)
    expect(shares.get('b')).toBe(33)
    expect(shares.get('c')).toBe(33)
    expect([...shares.values()].reduce((x, y) => x + y, 0)).toBe(100)
  })

  it('phần trăm: người cuối hấp thụ phần lẻ', () => {
    const shares = sharesForExpense({
      id: 'e',
      groupId: 'g1',
      title: 't',
      amount: 100,
      paidAt: '',
      splitMode: 'percent',
      payers: [{ memberId: 'a', amount: 100 }],
      participants: [
        { memberId: 'a', splitValue: 33 },
        { memberId: 'b', splitValue: 33 },
        { memberId: 'c', splitValue: 34 },
      ],
    })
    expect([...shares.values()].reduce((x, y) => x + y, 0)).toBe(100)
  })
})

describe('settlement', () => {
  const g = group({
    members: [
      { id: 'a', name: 'An' },
      { id: 'b', name: 'Bình' },
      { id: 'c', name: 'Châu' },
    ],
    expenses: [
      {
        id: 'e1',
        groupId: 'g1',
        title: 'Ăn tối',
        amount: 300000,
        paidAt: '',
        splitMode: 'equal',
        payers: [{ memberId: 'a', amount: 300000 }],
        participants: [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }],
      },
    ],
  })

  it('số dư đúng và tổng bằng 0', () => {
    const balances = balancesForGroup(g)
    expect(balances.find((b) => b.memberId === 'a')?.balance).toBe(200000)
    expect(balances.reduce((x, b) => x + b.balance, 0)).toBe(0)
  })

  it('smart settle: 2 lượt chuyển về An', () => {
    const transfers = generateSmartSettleTransfers(balancesForGroup(g))
    expect(transfers).toHaveLength(2)
    expect(transfers.every((t) => t.toMemberId === 'a')).toBe(true)
  })

  it('settleGroup nhất quán giữa smart và max reduction', () => {
    const smart = settleGroup(g, 'smart_settle')
    const max = generateMaxReductionTransfers(smart.balances)
    expect(max.transfers.length).toBeLessThanOrEqual(smart.transfers.length)
  })
})
