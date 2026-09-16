// Điều chỉnh số dư theo các quyết toán ĐÃ GHI NHẬN — hàm THUẦN, không đụng
// balancesForGroup (engine cốt lõi đã test). A(trả) → B(nhận) số tiền X:
// nợ của A giảm (+X về phía 0), khoản B được nhận giảm (−X về phía 0).
import type { Group, MemberBalance, Settlement, SettlementStatus, SettlementTransfer } from '../types'
import { balancesForGroup } from './balances'
import { generateSmartSettleTransfers } from './smartSettle'
import { generateMaxReductionTransfers } from './maxReduction'

function transfers(balances: MemberBalance[], method: Group['settlementMethod']): SettlementTransfer[] {
  return method === 'maximize_reduction'
    ? generateMaxReductionTransfers(balances).transfers
    : generateSmartSettleTransfers(balances)
}

export function applySettlements(
  balances: MemberBalance[],
  settlements: Settlement[],
  statuses: SettlementStatus[],
): MemberBalance[] {
  const net = new Map(balances.map((b) => [b.memberId, b.balance]))
  for (const s of settlements) {
    if (!statuses.includes(s.status)) continue
    net.set(s.fromMemberId, (net.get(s.fromMemberId) ?? 0) + s.amount)
    net.set(s.toMemberId, (net.get(s.toMemberId) ?? 0) - s.amount)
  }
  return balances.map((b) => ({ ...b, balance: net.get(b.memberId) ?? b.balance }))
}

export type SettleState = {
  /** Số dư sau khi trừ quyết toán ĐÃ xác nhận (sự thật về tiền đã chuyển). */
  confirmedBalances: MemberBalance[]
  /** Gợi ý chuyển còn lại (đã loại cả pending để không gợi ý trùng). */
  transfers: SettlementTransfer[]
  /** Các quyết toán đang chờ xác nhận. */
  pending: Settlement[]
  /** Sòng phẳng: không còn nợ sau xác nhận VÀ không còn gì đang chờ. */
  isSettled: boolean
}

export function settleState(group: Group): SettleState {
  const base = balancesForGroup(group)
  const settlements = group.settlements ?? []
  const confirmedBalances = applySettlements(base, settlements, ['confirmed'])
  const displayBalances = applySettlements(base, settlements, ['confirmed', 'pending'])
  const pending = settlements.filter((s) => s.status === 'pending')
  return {
    confirmedBalances,
    transfers: transfers(displayBalances, group.settlementMethod),
    pending,
    isSettled: confirmedBalances.every((b) => b.balance === 0) && pending.length === 0,
  }
}

/** Số dư (đã trừ quyết toán xác nhận) của 1 thành viên — dùng chặn rời nhóm khi còn nợ. */
export function memberNetBalance(group: Group, memberId: string): number {
  const bal = applySettlements(balancesForGroup(group), group.settlements ?? [], ['confirmed'])
  return bal.find((b) => b.memberId === memberId)?.balance ?? 0
}
