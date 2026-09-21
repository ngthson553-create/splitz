import type { vi } from '../vi'
import { auth } from './auth'
import { common } from './common'
import { errors } from './errors'
import { expense } from './expense'
import { format } from './format'
import { group } from './group'
import { home } from './home'
import { legal } from './legal'
import { settings } from './settings'

export const en: typeof vi = {
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
