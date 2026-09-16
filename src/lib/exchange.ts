// Tỷ giá ngoại tệ → VND. Nguồn miễn phí open.er-api.com (cập nhật theo ngày, không key).
// Cache theo ngày trong localStorage; có fallback nhập tay khi API lỗi.

export type Currency = { code: string; symbol: string; name: string }

export const CURRENCIES: Currency[] = [
  { code: 'VND', symbol: '₫', name: 'Việt Nam Đồng' },
  { code: 'USD', symbol: '$', name: 'Đô la Mỹ' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'JPY', symbol: '¥', name: 'Yên Nhật' },
  { code: 'KRW', symbol: '₩', name: 'Won Hàn' },
  { code: 'THB', symbol: '฿', name: 'Baht Thái' },
  { code: 'SGD', symbol: 'S$', name: 'Đô la Singapore' },
  { code: 'CNY', symbol: '¥', name: 'Nhân dân tệ' },
  { code: 'GBP', symbol: '£', name: 'Bảng Anh' },
  { code: 'AUD', symbol: 'A$', name: 'Đô la Úc' },
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
  if (!res.ok) throw new Error('Không lấy được tỷ giá.')
  const data = await res.json()
  const rate = data?.rates?.VND
  if (!rate || rate <= 0) throw new Error('Tỷ giá không hợp lệ.')
  localStorage.setItem(key, String(rate))
  return rate
}
