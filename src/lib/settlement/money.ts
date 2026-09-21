import { getIntlLocale } from '../i18n/locale'
import { t } from '../i18n'

export function normalizeMoney(value: number): number {
  if (!Number.isFinite(value)) throw new Error(t().errors.invalidAmount)
  return Math.round(value)
}

export function assertBalancesSumToZero(balances: { balance: number }[]): void {
  const sum = balances.reduce((acc, item) => acc + normalizeMoney(item.balance), 0)
  if (sum !== 0) throw new Error(t().errors.balancesMustSumToZero)
}

/**
 * Sổ cái luôn ghi bằng VND, nên số tiền KHÔNG đổi theo ngôn ngữ — chỉ cách
 * nhóm chữ số và ký hiệu là khác: 1.250.000đ (vi) ↔ 1,250,000₫ (en).
 */
export function formatVnd(amount: number): string {
  return `${normalizeMoney(amount).toLocaleString(getIntlLocale())}${t().format.currencySuffix}`
}
