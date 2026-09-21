import type { vi } from '../vi'
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
import { payments } from './payments'
import { settings } from './settings'

export const en: typeof vi = {
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
  payments,
  settings,
}
