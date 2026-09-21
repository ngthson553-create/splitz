/** Xung đột phiên bản: có người vừa sửa/xoá khoản chi → client phải tải lại, không ghi đè. */
import { t } from '../i18n'

export class ConflictError extends Error {
  constructor(message: string = t().errors.expenseOutdated) {
    super(message)
    this.name = 'ConflictError'
  }
}

export function isConflict(e: unknown): e is ConflictError {
  return e instanceof ConflictError
}

export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e.trim()) return e
  if (e && typeof e === 'object' && 'message' in e) {
    const message = (e as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}
