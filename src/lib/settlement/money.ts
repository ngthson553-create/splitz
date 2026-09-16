export function normalizeMoney(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Số tiền không hợp lệ.')
  return Math.round(value)
}

export function assertBalancesSumToZero(balances: { balance: number }[]): void {
  const sum = balances.reduce((acc, item) => acc + normalizeMoney(item.balance), 0)
  if (sum !== 0) throw new Error('Tổng số dư phải bằng 0.')
}

export function formatVnd(amount: number): string {
  return `${normalizeMoney(amount).toLocaleString('vi-VN')}đ`
}
