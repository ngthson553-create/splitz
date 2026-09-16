import type { Group, Member } from './types'
import { settleState } from './settlement'

export type CrossGroupDebtBreakdown = {
  groupId: string
  groupName: string
  groupEmoji?: string
  /** > 0: tôi được nhận trong nhóm này; < 0: tôi còn nợ trong nhóm này. */
  signedAmount: number
}

export type CrossGroupDebtItem = {
  otherUserId: string
  otherName: string
  otherAvatarUrl?: string
  otherColor?: string
  direction: 'pay' | 'receive'
  netAmount: number
  groupCount: number
  groups: CrossGroupDebtBreakdown[]
}

export type CrossGroupDebtSummary = {
  items: CrossGroupDebtItem[]
  totalToPay: number
  totalToReceive: number
}

type Accumulator = {
  other: Member
  groups: Map<string, CrossGroupDebtBreakdown>
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function inferCrossGroupUserId(groups: Group[], myName: string): string | null {
  const target = normalizeName(myName)
  if (!target) return null

  const matches = new Set<string>()
  for (const group of groups) {
    for (const member of group.members) {
      if (member.userId && normalizeName(member.name) === target) matches.add(member.userId)
    }
  }
  return matches.size === 1 ? [...matches][0] : null
}

function addSigned(groups: Map<string, CrossGroupDebtBreakdown>, group: Group, signedAmount: number) {
  const current = groups.get(group.id)
  if (current) {
    groups.set(group.id, { ...current, signedAmount: current.signedAmount + signedAmount })
    return
  }
  groups.set(group.id, {
    groupId: group.id,
    groupName: group.name,
    groupEmoji: group.emoji,
    signedAmount,
  })
}

/**
 * Gộp các lượt chuyển còn lại giữa user hiện tại và cùng một user thật qua nhiều nhóm.
 * Không ghi nhận quyết toán liên nhóm; đây chỉ là lớp tổng hợp trên engine từng nhóm.
 */
export function buildCrossGroupDebts(
  groups: Group[],
  currentUserId: string | null | undefined,
): CrossGroupDebtSummary {
  if (!currentUserId) return { items: [], totalToPay: 0, totalToReceive: 0 }

  const byOtherUser = new Map<string, Accumulator>()

  for (const group of groups) {
    const memberById = new Map(group.members.map((m) => [m.id, m]))
    for (const transfer of settleState(group).transfers) {
      const from = memberById.get(transfer.fromMemberId)
      const to = memberById.get(transfer.toMemberId)
      if (!from?.userId || !to?.userId || from.userId === to.userId) continue

      const currentIsPayer = from.userId === currentUserId
      const currentIsReceiver = to.userId === currentUserId
      if (!currentIsPayer && !currentIsReceiver) continue

      const other = currentIsPayer ? to : from
      if (!other.userId) continue
      const signedAmount = currentIsReceiver ? transfer.amount : -transfer.amount

      const acc = byOtherUser.get(other.userId) ?? { other, groups: new Map() }
      acc.other = { ...acc.other, ...other }
      addSigned(acc.groups, group, signedAmount)
      byOtherUser.set(other.userId, acc)
    }
  }

  const items = [...byOtherUser.entries()]
    .map(([otherUserId, acc]) => {
      const breakdown = [...acc.groups.values()].filter((g) => g.signedAmount !== 0)
      const net = breakdown.reduce((sum, g) => sum + g.signedAmount, 0)
      return { otherUserId, other: acc.other, breakdown, net }
    })
    .filter((item) => item.breakdown.length >= 2 && item.net !== 0)
    .map<CrossGroupDebtItem>((item) => ({
      otherUserId: item.otherUserId,
      otherName: item.other.name,
      otherAvatarUrl: item.other.avatarUrl,
      otherColor: item.other.color,
      direction: item.net < 0 ? 'pay' : 'receive',
      netAmount: Math.abs(item.net),
      groupCount: item.breakdown.length,
      groups: item.breakdown.sort((a, b) => Math.abs(b.signedAmount) - Math.abs(a.signedAmount)),
    }))
    .sort((a, b) => b.netAmount - a.netAmount)

  return {
    items,
    totalToPay: items.filter((i) => i.direction === 'pay').reduce((sum, i) => sum + i.netAmount, 0),
    totalToReceive: items
      .filter((i) => i.direction === 'receive')
      .reduce((sum, i) => sum + i.netAmount, 0),
  }
}
