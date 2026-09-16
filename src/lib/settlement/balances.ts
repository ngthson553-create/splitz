import type { Expense, Group, MemberBalance } from '../types'
import { normalizeMoney } from './money'

/**
 * Phần chia mỗi người phải gánh cho một khoản chi.
 * Quy ước làm tròn lẻ:
 *  - 'equal' / 'itemized': phần dư chia lần lượt từng đồng từ người đầu danh sách.
 *  - 'shares' / 'percent': người cuối hấp thụ phần lẻ để tổng khớp tuyệt đối.
 */
export function sharesForExpense(expense: Expense): Map<string, number> {
  const shares = new Map<string, number>()
  const amount = normalizeMoney(expense.amount)
  const participants = expense.participants
  if (!participants.length) throw new Error('Khoản chi cần ít nhất một người tham gia.')

  if (expense.splitMode === 'itemized') {
    const items = expense.items ?? []
    let totalAllocated = 0
    for (const item of items) {
      const itemAmount = normalizeMoney(item.amount)
      const itemParts = item.participants ?? []
      if (itemParts.length === 0) continue
      const base = Math.floor(itemAmount / itemParts.length)
      let remainder = itemAmount - base * itemParts.length
      for (const p of itemParts) {
        const extra = remainder > 0 ? 1 : 0
        shares.set(p.memberId, (shares.get(p.memberId) ?? 0) + base + extra)
        remainder -= extra
        totalAllocated += base + extra
      }
    }
    const diff = amount - totalAllocated
    if (diff !== 0 && participants.length > 0) {
      const last = participants[participants.length - 1].memberId
      shares.set(last, (shares.get(last) ?? 0) + diff)
    }
  }

  if (expense.splitMode === 'equal') {
    const base = Math.floor(amount / participants.length)
    let remainder = amount - base * participants.length
    for (const participant of participants) {
      const extra = remainder > 0 ? 1 : 0
      shares.set(participant.memberId, base + extra)
      remainder -= extra
    }
  }

  if (expense.splitMode === 'exact') {
    for (const participant of participants) {
      shares.set(participant.memberId, normalizeMoney(participant.splitValue ?? 0))
    }
  }

  if (expense.splitMode === 'shares') {
    const totalShares = participants.reduce((acc, p) => acc + (p.splitValue ?? 1), 0)
    if (totalShares <= 0) throw new Error('Tổng số phần chia phải lớn hơn 0.')
    let allocated = 0
    participants.forEach((participant, index) => {
      const isLast = index === participants.length - 1
      const value = isLast
        ? amount - allocated
        : Math.floor((amount * (participant.splitValue ?? 1)) / totalShares)
      shares.set(participant.memberId, value)
      allocated += value
    })
  }

  if (expense.splitMode === 'percent') {
    let allocated = 0
    participants.forEach((participant, index) => {
      const isLast = index === participants.length - 1
      const value = isLast
        ? amount - allocated
        : Math.floor((amount * (participant.splitValue ?? 0)) / 100)
      shares.set(participant.memberId, value)
      allocated += value
    })
  }

  const total = [...shares.values()].reduce((acc, value) => acc + value, 0)
  if (total !== amount) throw new Error('Tổng phần chia không khớp số tiền khoản chi.')
  return shares
}

/** Số dư ròng của từng thành viên trong nhóm (đã chi − phải gánh). */
export function balancesForGroup(group: Group): MemberBalance[] {
  const net = new Map(group.members.map((m) => [m.id, 0]))

  for (const expense of group.expenses) {
    for (const payer of expense.payers) {
      net.set(payer.memberId, (net.get(payer.memberId) ?? 0) + normalizeMoney(payer.amount))
    }
    for (const [memberId, share] of sharesForExpense(expense)) {
      net.set(memberId, (net.get(memberId) ?? 0) - share)
    }
  }

  return group.members.map((member) => ({
    memberId: member.id,
    name: member.name,
    balance: normalizeMoney(net.get(member.id) ?? 0),
  }))
}

/** Tổng đã chi / phải gánh mỗi người — cho dashboard, không ném lỗi nếu khoản chi sai. */
export function memberContributions(group: Group): Map<string, { spent: number; owed: number }> {
  const result = new Map<string, { spent: number; owed: number }>()
  for (const member of group.members) result.set(member.id, { spent: 0, owed: 0 })

  for (const expense of group.expenses) {
    for (const payer of expense.payers) {
      const current = result.get(payer.memberId) ?? { spent: 0, owed: 0 }
      current.spent += normalizeMoney(payer.amount)
      result.set(payer.memberId, current)
    }
    try {
      for (const [memberId, share] of sharesForExpense(expense)) {
        const current = result.get(memberId) ?? { spent: 0, owed: 0 }
        current.owed += share
        result.set(memberId, current)
      }
    } catch {
      // Bỏ qua khoản chi lỗi khi dựng tổng quan.
    }
  }
  return result
}

export function totalGroupSpend(group: Group): number {
  return group.expenses.reduce((acc, expense) => acc + normalizeMoney(expense.amount), 0)
}
