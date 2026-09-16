// Tiện ích PayOS dùng chung: giá gói + chữ ký HMAC-SHA256 (hex).
export const PRICES: Record<string, Record<string, number>> = {
  personal: { month: 14000, year: 99000 },
  team: { month: 49000, year: 399000 },
}
export const CYCLE_DAYS: Record<string, number> = { month: 30, year: 365 }

export async function hmacHex(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Chuỗi ký theo quy ước PayOS: các khoá sắp xếp alpha, nối "key=value&..." */
export function sortedQuery(obj: Record<string, unknown>): string {
  return Object.keys(obj)
    .sort()
    .map((k) => `${k}=${obj[k] ?? ''}`)
    .join('&')
}


/** So sánh chuỗi hằng-thời-gian (chống dò timing khi verify chữ ký). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
