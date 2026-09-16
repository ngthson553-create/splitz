// Dựng SỐ LIỆU chính xác (client) cho Insight AI — gửi sang Edge Function để LLM viết
// nhận xét tự nhiên. Tính toán deterministic ở đây (không nhờ AI tính số → tránh sai).
import type { Group } from './types'
import { balancesForGroup, memberContributions, totalGroupSpend } from './settlement/balances'
import { settleGroup } from './settlement'
import { findMyMember } from './profile'
import { buildDashboard } from './dashboard'

const TOP_N = 6

function ym(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function thisMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function lastMonth(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export type GroupInsightStats = {
  scope: 'group'
  groupName: string
  memberCount: number
  totalSpend: number
  expenseCount: number
  thisMonthSpend: number
  lastMonthSpend: number
  topExpenses: { title: string; amount: number }[]
  perMember: { name: string; spent: number; owed: number }[]
  me: { name: string; balance: number } | null
  isSettled: boolean
}

export function buildGroupInsightStats(group: Group, myName: string): GroupInsightStats {
  const tm = thisMonth()
  const lm = lastMonth()
  let thisMonthSpend = 0
  let lastMonthSpend = 0
  for (const e of group.expenses) {
    const m = ym(e.paidAt)
    if (m === tm) thisMonthSpend += e.amount
    else if (m === lm) lastMonthSpend += e.amount
  }

  const nameById = new Map(group.members.map((m) => [m.id, m.name]))
  const contrib = memberContributions(group)
  const perMember = group.members.map((m) => {
    const c = contrib.get(m.id) ?? { spent: 0, owed: 0 }
    return { name: m.name, spent: Math.round(c.spent), owed: Math.round(c.owed) }
  })

  const topExpenses = [...group.expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_N)
    .map((e) => ({ title: e.title, amount: e.amount }))

  let me: { name: string; balance: number } | null = null
  const my = findMyMember(group, myName)
  if (my) {
    const bal = balancesForGroup(group).find((b) => b.memberId === my.id)
    if (bal) me = { name: nameById.get(my.id) ?? myName, balance: Math.round(bal.balance) }
  }

  return {
    scope: 'group',
    groupName: group.name,
    memberCount: group.members.length,
    totalSpend: Math.round(totalGroupSpend(group)),
    expenseCount: group.expenses.length,
    thisMonthSpend: Math.round(thisMonthSpend),
    lastMonthSpend: Math.round(lastMonthSpend),
    topExpenses,
    perMember,
    me,
    isSettled: settleGroup(group).isSettled,
  }
}

export type DashboardInsightStats = {
  scope: 'dashboard'
  myName: string
  groupCount: number
  totalSpend: number
  myNet: number
  toReceive: number
  toPay: number
  thisMonthSpend: number
  lastMonthSpend: number
  perGroup: { name: string; total: number; myBalance: number | null }[]
  topExpenses: { title: string; amount: number; group: string }[]
}

export function buildDashboardInsightStats(groups: Group[], myName: string): DashboardInsightStats {
  const d = buildDashboard(groups, myName)
  const tm = thisMonth()
  const lm = lastMonth()
  let thisMonthSpend = 0
  let lastMonthSpend = 0
  const allExpenses: { title: string; amount: number; group: string }[] = []
  const perGroup: { name: string; total: number; myBalance: number | null }[] = []

  for (const g of groups) {
    for (const e of g.expenses) {
      const m = ym(e.paidAt)
      if (m === tm) thisMonthSpend += e.amount
      else if (m === lm) lastMonthSpend += e.amount
      allExpenses.push({ title: e.title, amount: e.amount, group: g.name })
    }
    const my = findMyMember(g, myName)
    let myBalance: number | null = null
    if (my) {
      const bal = balancesForGroup(g).find((b) => b.memberId === my.id)
      if (bal) myBalance = Math.round(bal.balance)
    }
    perGroup.push({ name: g.name, total: Math.round(totalGroupSpend(g)), myBalance })
  }

  const topExpenses = allExpenses.sort((a, b) => b.amount - a.amount).slice(0, TOP_N)

  return {
    scope: 'dashboard',
    myName,
    groupCount: groups.length,
    totalSpend: Math.round(d.totalSpend),
    myNet: Math.round(d.myNet),
    toReceive: Math.round(d.toReceive),
    toPay: Math.round(d.toPay),
    thisMonthSpend: Math.round(thisMonthSpend),
    lastMonthSpend: Math.round(lastMonthSpend),
    perGroup,
    topExpenses,
  }
}

export type InsightStats = GroupInsightStats | DashboardInsightStats
