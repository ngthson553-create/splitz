import type { Expense, Group } from './types'
import { balancesForGroup, totalGroupSpend } from './settlement/balances'
import { settleGroup } from './settlement'
import { findMyMember } from './profile'

export type GroupDebt = {
  group: Group
  /** Số dư ròng của "tôi" trong nhóm: >0 được nhận, <0 còn nợ, undefined nếu không khớp được. */
  myBalance: number | undefined
  isSettled: boolean
  transfers: number
}

export type DashboardSummary = {
  /** Tổng chi tiêu mọi nhóm. */
  totalSpend: number
  /** Tổng nợ ròng của tôi (gộp mọi nhóm). >0 được nhận, <0 còn nợ. */
  myNet: number
  /** Có khớp được "tôi" ở ít nhất 1 nhóm không. */
  hasMe: boolean
  /** Tổng tiền tôi được nhận (cộng các nhóm dương). */
  toReceive: number
  /** Tổng tiền tôi còn nợ (cộng các nhóm âm, trả về số dương). */
  toPay: number
  /** Các nhóm chưa quyết toán, sắp xếp nhóm có nợ của tôi lên đầu. */
  unsettled: GroupDebt[]
}

export function buildDashboard(groups: Group[], myName: string): DashboardSummary {
  let totalSpend = 0
  let myNet = 0
  let toReceive = 0
  let toPay = 0
  let hasMe = false
  const unsettled: GroupDebt[] = []

  for (const group of groups) {
    totalSpend += totalGroupSpend(group)

    let myBalance: number | undefined
    const me = findMyMember(group, myName)
    if (me) {
      const balances = balancesForGroup(group)
      const mine = balances.find((b) => b.memberId === me.id)
      if (mine) {
        myBalance = mine.balance
        hasMe = true
        myNet += mine.balance
        if (mine.balance > 0) toReceive += mine.balance
        else if (mine.balance < 0) toPay += -mine.balance
      }
    }

    const settlement = settleGroup(group)
    if (!settlement.isSettled) {
      unsettled.push({
        group,
        myBalance,
        isSettled: false,
        transfers: settlement.transfers.length,
      })
    }
  }

  // Nhóm tôi còn nợ → ưu tiên, rồi nhóm tôi được nhận, rồi còn lại; trong mỗi cụm theo nợ lớn.
  unsettled.sort((a, b) => {
    const rank = (d: GroupDebt) =>
      d.myBalance == null ? 1 : d.myBalance < 0 ? 0 : d.myBalance > 0 ? 0 : 2
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    return Math.abs(b.myBalance ?? 0) - Math.abs(a.myBalance ?? 0)
  })

  return { totalSpend, myNet, hasMe, toReceive, toPay, unsettled }
}

export type RecentExpense = {
  expense: Expense
  group: Group
  payerName: string
}

/** Các khoản chi mới nhất across mọi nhóm. */
export function recentExpenses(groups: Group[], limit = 5): RecentExpense[] {
  const all: RecentExpense[] = []
  for (const group of groups) {
    const memberById = new Map(group.members.map((m) => [m.id, m]))
    for (const expense of group.expenses) {
      all.push({
        expense,
        group,
        payerName: memberById.get(expense.payers[0]?.memberId)?.name ?? '—',
      })
    }
  }
  all.sort((a, b) => b.expense.paidAt.localeCompare(a.expense.paidAt))
  return all.slice(0, limit)
}
