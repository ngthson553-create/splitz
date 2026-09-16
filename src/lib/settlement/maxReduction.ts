import type { MaxReductionMode, MemberBalance, SettlementTransfer } from '../types'
import { assertBalancesSumToZero, normalizeMoney } from './money'
import { generateSmartSettleTransfers, validateTransfers } from './smartSettle'

export type MaxReductionResult = {
  transfers: SettlementTransfer[]
  groups: MemberBalance[][]
  mode: MaxReductionMode
  stats: {
    nonZeroMembers: number
    zeroSumGroups: number
    transferCount: number
    theoreticalMinimum: number
  }
}

/** Tối thiểu số lượt chuyển: tách thành các cụm có tổng bằng 0 rồi smart-settle từng cụm. */
export function generateMaxReductionTransfers(balances: MemberBalance[]): MaxReductionResult {
  assertBalancesSumToZero(balances)
  const nonZero = balances
    .map((b) => ({ ...b, balance: normalizeMoney(b.balance) }))
    .filter((b) => b.balance !== 0)

  if (nonZero.length === 0) {
    return {
      transfers: [],
      groups: [],
      mode: 'exact',
      stats: { nonZeroMembers: 0, zeroSumGroups: 0, transferCount: 0, theoreticalMinimum: 0 },
    }
  }

  const mode: MaxReductionMode = nonZero.length <= 10 ? 'exact' : 'heuristic'
  const groups = mode === 'exact' ? exactZeroSumGroups(nonZero) : heuristicZeroSumGroups(nonZero)
  const transfers = groups.flatMap((group, index) =>
    generateSmartSettleTransfers(group).map((transfer) => ({
      ...transfer,
      method: 'maximize_reduction' as const,
      groupId: `g${index + 1}`,
    })),
  )

  validateTransfers(nonZero, transfers)

  return {
    transfers,
    groups,
    mode,
    stats: {
      nonZeroMembers: nonZero.length,
      zeroSumGroups: groups.length,
      transferCount: transfers.length,
      theoreticalMinimum: nonZero.length - groups.length,
    },
  }
}

function exactZeroSumGroups(items: MemberBalance[]): MemberBalance[][] {
  const n = items.length
  const sums = new Map<number, number>()
  for (let mask = 1; mask < 1 << n; mask += 1) {
    let sum = 0
    for (let i = 0; i < n; i += 1) {
      if (mask & (1 << i)) sum += normalizeMoney(items[i].balance)
    }
    if (sum === 0) sums.set(mask, bitCount(mask))
  }

  const memo = new Map<number, { count: number; masks: number[] }>()
  const solve = (mask: number): { count: number; masks: number[] } => {
    if (mask === 0) return { count: 0, masks: [] }
    const cached = memo.get(mask)
    if (cached) return cached

    let best = { count: 1, masks: [mask] }
    for (const zeroMask of sums.keys()) {
      if ((zeroMask & mask) !== zeroMask) continue
      const rest = solve(mask ^ zeroMask)
      const candidate = { count: rest.count + 1, masks: [zeroMask, ...rest.masks] }
      if (candidate.count > best.count) best = candidate
    }
    memo.set(mask, best)
    return best
  }

  return solve((1 << n) - 1).masks.map((mask) =>
    items.filter((_, index) => Boolean(mask & (1 << index))),
  )
}

function heuristicZeroSumGroups(items: MemberBalance[]): MemberBalance[][] {
  const remaining = [...items]
  const groups: MemberBalance[][] = []

  const takeGroup = (indexes: number[]) => {
    groups.push(indexes.map((index) => remaining[index]))
    indexes.sort((a, b) => b - a).forEach((index) => remaining.splice(index, 1))
  }

  for (let i = 0; i < remaining.length; i += 1) {
    const j = remaining.findIndex(
      (item, index) => index > i && normalizeMoney(item.balance + remaining[i].balance) === 0,
    )
    if (j > i) {
      takeGroup([i, j])
      i = -1
    }
  }

  for (const size of [3, 4]) {
    let found = true
    while (found) {
      found = false
      const combo = findZeroCombo(remaining, size)
      if (combo) {
        takeGroup(combo)
        found = true
      }
    }
  }

  if (remaining.length) groups.push([...remaining])
  return groups
}

function findZeroCombo(items: MemberBalance[], size: number): number[] | null {
  const pick = (start: number, chosen: number[], sum: number): number[] | null => {
    if (chosen.length === size) return sum === 0 ? chosen : null
    for (let i = start; i < items.length; i += 1) {
      const result = pick(i + 1, [...chosen, i], sum + normalizeMoney(items[i].balance))
      if (result) return result
    }
    return null
  }
  return pick(0, [], 0)
}

function bitCount(mask: number): number {
  let count = 0
  let value = mask
  while (value) {
    value &= value - 1
    count += 1
  }
  return count
}
