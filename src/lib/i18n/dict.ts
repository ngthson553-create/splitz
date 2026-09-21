import { vi } from './locales/vi'
import { en } from './locales/en'
import type { Lang } from './locale'

/**
 * Tiếng Việt là bản gốc: kiểu từ điển suy ra từ nó, nên `en` thiếu key hoặc sai
 * chữ ký hàm là LỖI BIÊN DỊCH, không phải chuỗi rỗng lúc chạy.
 */
export type Dict = typeof vi

export const dictionaries: Record<Lang, Dict> = { vi, en }
