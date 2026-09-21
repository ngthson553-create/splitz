import { auth } from './auth'
import { adminBilling } from './adminBilling'
import { adminOps } from './adminOps'
import { adminPages } from './adminPages'
import { adminSystem } from './adminSystem'
import { common } from './common'
import { errors } from './errors'
import { expense } from './expense'
import { format } from './format'
import { group } from './group'
import { home } from './home'
import { legal } from './legal'
import { settings } from './settings'

/**
 * Bản gốc tiếng Việt. Thêm namespace ở đây thì thêm đúng một dòng tương ứng
 * trong `../en/index.ts`, nếu không TypeScript báo lỗi ngay.
 */
export const vi = {
  adminBilling,
  adminOps,
  adminPages,
  adminSystem,
  auth,
  common,
  errors,
  expense,
  format,
  group,
  home,
  legal,
  settings,
}
