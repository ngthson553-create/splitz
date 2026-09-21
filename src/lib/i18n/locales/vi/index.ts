import { common } from './common'
import { errors } from './errors'
import { format } from './format'
import { settings } from './settings'

/**
 * Bản gốc tiếng Việt. Thêm namespace ở đây thì thêm đúng một dòng tương ứng
 * trong `../en/index.ts`, nếu không TypeScript báo lỗi ngay.
 */
export const vi = {
  common,
  errors,
  format,
  settings,
}
