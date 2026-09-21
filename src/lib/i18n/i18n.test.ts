import { afterEach, describe, expect, it } from 'vitest'
import { formatCompactVnd, formatDate, formatRelative } from '../format'
import { formatVnd } from '../settlement/money'
import { dictionaries } from './dict'
import { LANGS, setLang } from './locale'

// setup.ts ép 'vi'; mỗi test tự trả về để không rò sang file khác.
afterEach(() => setLang('vi'))

describe('dictionary parity', () => {
  it('covers every namespace in both languages', () => {
    const viKeys = Object.keys(dictionaries.vi).sort()
    const enKeys = Object.keys(dictionaries.en).sort()
    expect(enKeys).toEqual(viKeys)
  })

  // Kiểu đã chặn thiếu key lúc biên dịch; đây bắt lỗi còn lại: chép nguyên
  // bản tiếng Việt sang en rồi quên dịch.
  it('does not leave common labels untranslated in English', () => {
    expect(dictionaries.en.common.save).not.toBe(dictionaries.vi.common.save)
    expect(dictionaries.en.settings.title).not.toBe(dictionaries.vi.settings.title)
  })

  it('matches function arity for pluralised entries', () => {
    for (const lang of LANGS) {
      expect(dictionaries[lang].format.daysAgo({ count: 3 })).toContain('3')
    }
  })
})

describe('formatters follow the active language', () => {
  it('keeps VND as the currency in both languages', () => {
    expect(formatVnd(1250000)).toBe('1.250.000đ')
    setLang('en')
    expect(formatVnd(1250000)).toBe('1,250,000₫')
  })

  it('switches compact suffix and decimal mark', () => {
    expect(formatCompactVnd(1250000)).toBe('1,25tr')
    expect(formatCompactVnd(45000)).toBe('45k')
    setLang('en')
    expect(formatCompactVnd(1250000)).toBe('1.25M')
    expect(formatCompactVnd(45000)).toBe('45k')
  })

  // formatDate hiển thị theo múi giờ người xem — đúng ý đồ. Nên mốc thử phải
  // dựng từ giờ địa phương: không mốc UTC cố định nào rơi vào cùng một ngày
  // lịch ở mọi múi giờ (thế giới trải từ UTC-12 tới UTC+14).
  it('switches date order so en cannot be misread as day/month', () => {
    const localNoon = new Date(2026, 8, 21, 12, 0, 0).toISOString()
    expect(formatDate(localNoon)).toBe('21/09/2026')
    setLang('en')
    expect(formatDate(localNoon)).toBe('Sep 21, 2026')
  })

  it('pluralises relative days in English', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const oneDayAgo = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
    expect(formatRelative(threeDaysAgo)).toBe('3 ngày trước')
    setLang('en')
    expect(formatRelative(threeDaysAgo)).toBe('3 days ago')
    expect(formatRelative(oneDayAgo)).toBe('Yesterday')
  })

  it('returns empty string for an invalid date in both languages', () => {
    expect(formatDate('not-a-date')).toBe('')
    setLang('en')
    expect(formatDate('not-a-date')).toBe('')
  })
})
