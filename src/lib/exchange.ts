// Tỷ giá ngoại tệ → VND. Nguồn miễn phí open.er-api.com (cập nhật theo ngày, không key).
// Cache theo ngày trong localStorage; có fallback nhập tay khi API lỗi.
import { t } from './i18n'

export type Currency = { code: string; symbol: string; name: string }

// Tên tiền tệ dịch theo ngôn ngữ hiện hành: đọc qua getter để không "đóng băng"
// giá trị lúc import module (Currency giữ nguyên hình dạng { code, symbol, name }).
export const CURRENCIES: Currency[] = [
  { code: 'VND', symbol: '₫', get name(): string { return t().common.currencyVnd } },
  { code: 'USD', symbol: '$', get name(): string { return t().common.currencyUsd } },
  { code: 'EUR', symbol: '€', get name(): string { return t().common.currencyEur } },
  { code: 'JPY', symbol: '¥', get name(): string { return t().common.currencyJpy } },
  { code: 'KRW', symbol: '₩', get name(): string { return t().common.currencyKrw } },
  { code: 'THB', symbol: '฿', get name(): string { return t().common.currencyThb } },
  { code: 'SGD', symbol: 'S$', get name(): string { return t().common.currencySgd } },
  { code: 'CNY', symbol: '¥', get name(): string { return t().common.currencyCny } },
  { code: 'GBP', symbol: '£', get name(): string { return t().common.currencyGbp } },
  { code: 'AUD', symbol: 'A$', get name(): string { return t().common.currencyAud } },
]

export function currencySymbol(code?: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code ?? ''
}

const CACHE_PREFIX = 'splitz.fx.'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Số VND cho 1 đơn vị `currency`. VND → 1. Ném lỗi nếu không lấy được. */
export async function getRateToVnd(currency: string): Promise<number> {
  if (!currency || currency === 'VND') return 1
  const key = `${CACHE_PREFIX}${currency}.${today()}`
  const cached = localStorage.getItem(key)
  if (cached) {
    const n = Number(cached)
    if (n > 0) return n
  }
  const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`)
  if (!res.ok) throw new Error(t().errors.rateFetchFailed)
  const data = await res.json()
  const rate = data?.rates?.VND
  if (!rate || rate <= 0) throw new Error(t().errors.rateInvalid)
  localStorage.setItem(key, String(rate))
  return rate
}
