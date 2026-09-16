import type { Group, MemberBalance, SettlementMethod, SettlementTransfer } from '../types'
import { balancesForGroup } from './balances'
import { generateMaxReductionTransfers } from './maxReduction'
import { generateSmartSettleTransfers } from './smartSettle'

export * from './money'
export * from './balances'
export * from './smartSettle'
export * from './maxReduction'
export * from './settlements'

export type GroupSettlement = {
  balances: MemberBalance[]
  transfers: SettlementTransfer[]
  method: SettlementMethod
  isSettled: boolean
}

export function transfersForBalances(
  balances: MemberBalance[],
  method: SettlementMethod,
): SettlementTransfer[] {
  if (method === 'maximize_reduction') return generateMaxReductionTransfers(balances).transfers
  return generateSmartSettleTransfers(balances)
}

export function settleGroup(group: Group, method?: SettlementMethod): GroupSettlement {
  const balances = balancesForGroup(group)
  const chosen = method ?? group.settlementMethod
  const transfers = transfersForBalances(balances, chosen)
  return {
    balances,
    transfers,
    method: chosen,
    isSettled: balances.every((b) => b.balance === 0),
  }
}
