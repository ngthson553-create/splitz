import type { MemberBalance, SettlementTransfer } from '../types'
import { assertBalancesSumToZero, normalizeMoney } from './money'

type WorkingBalance = MemberBalance & { balance: number }

/** Greedy: ghép người nợ với người nhận, tối thiểu hóa số lần chuyển theo thứ tự ổn định. */
export function generateSmartSettleTransfers(balances: MemberBalance[]): SettlementTransfer[] {
  assertBalancesSumToZero(balances)

  const debtors: WorkingBalance[] = balances
    .map((b) => ({ ...b, balance: normalizeMoney(b.balance) }))
    .filter((b) => b.balance < 0)
    .sort((a, b) => a.memberId.localeCompare(b.memberId))

  const creditors: WorkingBalance[] = balances
    .map((b) => ({ ...b, balance: normalizeMoney(b.balance) }))
    .filter((b) => b.balance > 0)
    .sort((a, b) => a.memberId.localeCompare(b.memberId))

  const transfers: SettlementTransfer[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = Math.min(-debtor.balance, creditor.balance)

    if (amount > 0 && debtor.memberId !== creditor.memberId) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount,
        method: 'smart_settle',
      })
    }

    debtor.balance += amount
    creditor.balance -= amount
    if (debtor.balance === 0) debtorIndex += 1
    if (creditor.balance === 0) creditorIndex += 1
  }

  validateTransfers(balances, transfers)
  return transfers
}

export function validateTransfers(balances: MemberBalance[], transfers: SettlementTransfer[]): void {
  assertBalancesSumToZero(balances)
  const paid = new Map<string, number>()
  const received = new Map<string, number>()

  for (const transfer of transfers) {
    if (transfer.amount <= 0) throw new Error('Số tiền chuyển phải dương.')
    if (transfer.fromMemberId === transfer.toMemberId) {
      throw new Error('Không thể chuyển cho chính mình.')
    }
    paid.set(transfer.fromMemberId, (paid.get(transfer.fromMemberId) ?? 0) + normalizeMoney(transfer.amount))
    received.set(transfer.toMemberId, (received.get(transfer.toMemberId) ?? 0) + normalizeMoney(transfer.amount))
  }

  for (const balance of balances) {
    const value = normalizeMoney(balance.balance)
    if (value < 0 && (paid.get(balance.memberId) ?? 0) !== Math.abs(value)) {
      throw new Error(`Tổng chuyển của ${balance.memberId} không hợp lệ.`)
    }
    if (value > 0 && (received.get(balance.memberId) ?? 0) !== value) {
      throw new Error(`Tổng nhận của ${balance.memberId} không hợp lệ.`)
    }
    if (value === 0 && ((paid.get(balance.memberId) ?? 0) > 0 || (received.get(balance.memberId) ?? 0) > 0)) {
      throw new Error(`Thành viên cân bằng ${balance.memberId} không nên có giao dịch.`)
    }
  }
}
