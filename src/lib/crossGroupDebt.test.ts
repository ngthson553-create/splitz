import { describe, expect, it } from 'vitest'
import type { Group } from './types'
import { buildCrossGroupDebts, inferCrossGroupUserId } from './crossGroupDebt'

function group(id: string, payerId: string, amount: number): Group {
  return {
    id,
    name: id === 'trip' ? 'Đi chơi' : 'Nhà chung',
    emoji: id === 'trip' ? '✈️' : '🏠',
    createdAt: '',
    updatedAt: '',
    settlementMethod: 'smart_settle',
    members: [
      { id: `${id}-me`, name: 'Tôi', userId: 'user-me' },
      { id: `${id}-linh`, name: 'Linh', userId: 'user-linh', bankCode: '970436' },
    ],
    expenses: [
      {
        id: `${id}-expense`,
        groupId: id,
        title: 'Chi chung',
        amount,
        paidAt: '',
        splitMode: 'equal',
        payers: [{ memberId: payerId, amount }],
        participants: [{ memberId: `${id}-me` }, { memberId: `${id}-linh` }],
      },
    ],
  }
}

describe('buildCrossGroupDebts', () => {
  it('gộp công nợ hai chiều với cùng một user thật qua nhiều nhóm', () => {
    const summary = buildCrossGroupDebts(
      [group('trip', 'trip-linh', 200_000), group('home', 'home-me', 80_000)],
      'user-me',
    )

    expect(summary.items).toHaveLength(1)
    expect(summary.items[0]).toMatchObject({
      otherUserId: 'user-linh',
      otherName: 'Linh',
      direction: 'pay',
      netAmount: 60_000,
      groupCount: 2,
    })
    expect(summary.totalToPay).toBe(60_000)
    expect(summary.totalToReceive).toBe(0)
  })

  it('không gộp thành viên ảo hoặc cặp chỉ phát sinh ở một nhóm', () => {
    const virtualGroup = group('trip', 'trip-linh', 200_000)
    virtualGroup.members[1] = { ...virtualGroup.members[1], userId: null }

    const summary = buildCrossGroupDebts(
      [virtualGroup, group('home', 'home-linh', 80_000)],
      'user-me',
    )

    expect(summary.items).toHaveLength(0)
    expect(summary.totalToPay).toBe(0)
    expect(summary.totalToReceive).toBe(0)
  })
})

describe('inferCrossGroupUserId', () => {
  it('chỉ suy ra userId khi tên hồ sơ khớp duy nhất một user thật', () => {
    expect(inferCrossGroupUserId([group('trip', 'trip-linh', 200_000)], 'Tôi')).toBe('user-me')

    const ambiguous = group('home', 'home-linh', 80_000)
    ambiguous.members[0] = { ...ambiguous.members[0], userId: 'another-user-me' }

    expect(inferCrossGroupUserId([group('trip', 'trip-linh', 200_000), ambiguous], 'Tôi')).toBeNull()
  })
})
