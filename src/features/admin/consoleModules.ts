import {
  Activity,
  Bell,
  Clock,
  CreditCard,
  FileText,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { t } from '../../lib/i18n'

// Giá trị group là id nội bộ, không hiển thị trực tiếp — nhãn nằm ở dict
// adminPages.group để đổi ngôn ngữ không phải đụng logic.
export type ConsoleModuleGroup = 'operations' | 'growth' | 'configuration' | 'control'

export type ConsoleModule = {
  id: string
  slug: string
  label: string
  group: ConsoleModuleGroup
  summary: string
  icon: LucideIcon
  bullets: string[]
}

// label/summary/bullets đọc qua getter để mỗi lần render lấy đúng ngôn ngữ hiện hành.
export const consoleModules: ConsoleModule[] = [
  {
    id: 'health',
    slug: 'health',
    group: 'operations',
    icon: Activity,
    get label() {
      return t().adminPages.modules.health.label
    },
    get summary() {
      return t().adminPages.modules.health.summary
    },
    get bullets() {
      return t().adminPages.modules.health.bullets
    },
  },
  {
    id: 'notifications',
    slug: 'notifications',
    group: 'operations',
    icon: Bell,
    get label() {
      return t().adminPages.modules.notifications.label
    },
    get summary() {
      return t().adminPages.modules.notifications.summary
    },
    get bullets() {
      return t().adminPages.modules.notifications.bullets
    },
  },
  {
    id: 'jobs',
    slug: 'jobs',
    group: 'operations',
    icon: Clock,
    get label() {
      return t().adminPages.modules.jobs.label
    },
    get summary() {
      return t().adminPages.modules.jobs.summary
    },
    get bullets() {
      return t().adminPages.modules.jobs.bullets
    },
  },
  {
    id: 'redeem',
    slug: 'redeem',
    group: 'growth',
    icon: Ticket,
    get label() {
      return t().adminPages.modules.redeem.label
    },
    get summary() {
      return t().adminPages.modules.redeem.summary
    },
    get bullets() {
      return t().adminPages.modules.redeem.bullets
    },
  },
  {
    id: 'billing',
    slug: 'billing',
    group: 'growth',
    icon: CreditCard,
    get label() {
      return t().adminPages.modules.billing.label
    },
    get summary() {
      return t().adminPages.modules.billing.summary
    },
    get bullets() {
      return t().adminPages.modules.billing.bullets
    },
  },
  {
    id: 'ai',
    slug: 'ai',
    group: 'configuration',
    icon: Sparkles,
    get label() {
      return t().adminPages.modules.ai.label
    },
    get summary() {
      return t().adminPages.modules.ai.summary
    },
    get bullets() {
      return t().adminPages.modules.ai.bullets
    },
  },
  {
    id: 'email',
    slug: 'email',
    group: 'configuration',
    icon: Mail,
    get label() {
      return t().adminPages.modules.email.label
    },
    get summary() {
      return t().adminPages.modules.email.summary
    },
    get bullets() {
      return t().adminPages.modules.email.bullets
    },
  },
  {
    id: 'config',
    slug: 'config',
    group: 'configuration',
    icon: SlidersHorizontal,
    get label() {
      return t().adminPages.modules.config.label
    },
    get summary() {
      return t().adminPages.modules.config.summary
    },
    get bullets() {
      return t().adminPages.modules.config.bullets
    },
  },
  {
    id: 'support',
    slug: 'support',
    group: 'control',
    icon: Users,
    get label() {
      return t().adminPages.modules.support.label
    },
    get summary() {
      return t().adminPages.modules.support.summary
    },
    get bullets() {
      return t().adminPages.modules.support.bullets
    },
  },
  {
    id: 'admin-access',
    slug: 'admin-access',
    group: 'control',
    icon: ShieldCheck,
    get label() {
      return t().adminPages.modules.adminAccess.label
    },
    get summary() {
      return t().adminPages.modules.adminAccess.summary
    },
    get bullets() {
      return t().adminPages.modules.adminAccess.bullets
    },
  },
  {
    id: 'releases',
    slug: 'releases',
    group: 'control',
    icon: FileText,
    get label() {
      return t().adminPages.modules.releases.label
    },
    get summary() {
      return t().adminPages.modules.releases.summary
    },
    get bullets() {
      return t().adminPages.modules.releases.bullets
    },
  },
  {
    id: 'data-quality',
    slug: 'data-quality',
    group: 'control',
    icon: Search,
    get label() {
      return t().adminPages.modules.dataQuality.label
    },
    get summary() {
      return t().adminPages.modules.dataQuality.summary
    },
    get bullets() {
      return t().adminPages.modules.dataQuality.bullets
    },
  },
  {
    id: 'audit',
    slug: 'audit',
    group: 'control',
    icon: Shield,
    get label() {
      return t().adminPages.modules.audit.label
    },
    get summary() {
      return t().adminPages.modules.audit.summary
    },
    get bullets() {
      return t().adminPages.modules.audit.bullets
    },
  },
]

export const consoleModuleGroups: ConsoleModuleGroup[] = ['operations', 'growth', 'configuration', 'control']

export function pathForConsoleModule(module: ConsoleModule): string {
  return `/console/${module.slug}`
}
