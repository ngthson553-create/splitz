export { formatVnd } from './settlement/money'

/** Rút gọn số tiền: 1.250.000 → 1,25tr; 45.000 → 45k. Dùng cho thẻ thống kê. */
export function formatCompactVnd(amount: number): string {
  const v = Math.round(amount)
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}tr`
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}k`
  return `${sign}${abs}`
}

function trim(n: number): string {
  return n
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',')
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const day = 24 * 60 * 60 * 1000
  if (diffMs < day && d.toDateString() === new Date().toDateString()) return 'Hôm nay'
  if (diffMs < 2 * day) return 'Hôm qua'
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} ngày trước`
  return formatDate(iso)
}

/** Số tiền nhập dạng "1.250.000" hoặc "1250k" → số nguyên đồng. */
export function parseMoneyInput(raw: string): number {
  const text = raw.trim().toLowerCase().replace(/\s/g, '')
  if (!text) return 0
  const m = text.match(/^(\d+(?:[.,]\d+)?)(tr|m|k)?$/)
  if (m) {
    const value = parseFloat(m[1].replace(',', '.'))
    if (m[2] === 'tr' || m[2] === 'm') return Math.round(value * 1_000_000)
    if (m[2] === 'k') return Math.round(value * 1_000)
    return Math.round(value)
  }
  const digits = text.replace(/[^\d]/g, '')
  return digits ? parseInt(digits, 10) : 0
}

const PALETTE = [
  'violet',
  'indigo',
  'sky',
  'emerald',
  'amber',
  'rose',
  'fuchsia',
  'teal',
  'orange',
  'cyan',
]

export function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
