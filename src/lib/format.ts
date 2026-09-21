import { getIntlLocale, getLang } from './i18n/locale'
import { t } from './i18n'

export { formatVnd } from './settlement/money'

/** Rút gọn số tiền: 1.250.000 → 1,25tr (vi) / 1.25M (en); 45.000 → 45k. */
export function formatCompactVnd(amount: number): string {
  const v = Math.round(amount)
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  const f = t().format
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}${f.millionSuffix}`
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}${f.thousandSuffix}`
  return `${sign}${abs}`
}

function trim(n: number): string {
  return n
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', t().format.decimalMark)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // vi: 21/09/2026 (số, quen thuộc) — en: Sep 21, 2026 (tránh nhầm ngày/tháng).
  const opts: Intl.DateTimeFormatOptions =
    getLang() === 'vi'
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' }
  return d.toLocaleDateString(getIntlLocale(), opts)
}

export function formatRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const day = 24 * 60 * 60 * 1000
  const f = t().format
  if (diffMs < day && d.toDateString() === new Date().toDateString()) return f.today
  if (diffMs < 2 * day) return f.yesterday
  if (diffMs < 7 * day) return f.daysAgo({ count: Math.floor(diffMs / day) })
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
