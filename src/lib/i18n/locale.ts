/**
 * Ngôn ngữ hiện hành ở cấp module — KHÔNG phụ thuộc React.
 *
 * Các hàm định dạng (formatVnd, formatDate…) và tầng lỗi được gọi từ cả code
 * thuần (report.ts, expenseHistory.ts, data/*) lẫn component, nên trạng thái
 * ngôn ngữ phải đọc được ngoài cây React. I18nProvider đồng bộ xuống đây.
 */

export type Lang = 'vi' | 'en'

export const LANGS: Lang[] = ['vi', 'en']
export const STORAGE_KEY = 'splitz.lang'

/** Locale BCP-47 cho Intl, suy ra từ ngôn ngữ app. */
export const INTL_LOCALE: Record<Lang, string> = { vi: 'vi-VN', en: 'en-US' }

function isLang(value: unknown): value is Lang {
  return value === 'vi' || value === 'en'
}

/** Ưu tiên lựa chọn đã lưu; chưa chọn thì đoán theo trình duyệt, mặc định vi. */
export function detectLang(): Lang {
  if (typeof window === 'undefined') return 'vi'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLang(stored)) return stored
  } catch {
    // Safari chế độ riêng tư có thể chặn localStorage — bỏ qua, dùng trình duyệt.
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

// Khởi tạo lười: test setup kịp ghi localStorage trước lần đọc đầu tiên.
let active: Lang | null = null

export function getLang(): Lang {
  if (active === null) active = detectLang()
  return active
}

export function getIntlLocale(): string {
  return INTL_LOCALE[getLang()]
}

type Listener = (lang: Lang) => void
const listeners = new Set<Listener>()

/** Đổi ngôn ngữ hiện hành + lưu lại. I18nProvider gọi hàm này. */
export function setLang(lang: Lang): void {
  if (active === lang) return
  active = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Không lưu được thì vẫn đổi cho phiên hiện tại.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = lang
  listeners.forEach((fn) => fn(lang))
}

export function subscribeLang(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Chỉ dùng trong test: trả trạng thái về chưa khởi tạo. */
export function resetLangForTests(): void {
  active = null
}
