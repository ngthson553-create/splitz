import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './auth'
import { getSupabase } from './supabase/client'
import { t } from './i18n'

export type Plan = 'free' | 'personal' | 'team'

export type PlanInfo = {
  plan: Plan
  status: string | null
  periodEnd: string | null
  source: string | null
  /** null = không giới hạn. */
  maxGroups: number | null
  maxMembers: number
  groupCount: number
}

type SubscriptionValue = {
  info: PlanInfo
  loading: boolean
  isPremium: boolean
  /** Đã đạt giới hạn số nhóm (Free). */
  atGroupLimit: boolean
  /** Số ngày còn lại tới hạn (null nếu không có hạn). */
  daysLeft: number | null
  /** Sắp hết hạn (≤ 3 ngày). */
  expiringSoon: boolean
  reload: () => Promise<void>
}

// Local/demo (không cấu hình Supabase): không chặn gì.
const LOCAL_INFO: PlanInfo = {
  plan: 'free',
  status: null,
  periodEnd: null,
  source: null,
  maxGroups: null,
  maxMembers: 9999,
  groupCount: 0,
}

const SubscriptionContext = createContext<SubscriptionValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { cloud, session } = useAuth()
  const uid = session?.user?.id ?? null
  const [info, setInfo] = useState<PlanInfo>(LOCAL_INFO)
  const [loading, setLoading] = useState(cloud)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  const reload = useCallback(async () => {
    if (!cloud || !uid) {
      setInfo(LOCAL_INFO)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await getSupabase().rpc('my_plan_info')
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        setInfo({
          plan: (row.plan ?? 'free') as Plan,
          status: row.status ?? null,
          periodEnd: row.period_end ?? null,
          source: row.source ?? null,
          maxGroups: row.max_groups ?? null,
          maxMembers: Number(row.max_members ?? 8),
          groupCount: Number(row.group_count ?? 0),
        })
      }
    } catch {
      // giữ trạng thái cũ nếu lỗi mạng
    } finally {
      setLoading(false)
    }
  }, [cloud, uid])

  useEffect(() => {
    void reload()
  }, [reload])

  // Tính số ngày còn lại trong effect (tránh gọi Date.now() khi render — vi phạm purity).
  useEffect(() => {
    if (!info.periodEnd) {
      setDaysLeft(null)
      return
    }
    setDaysLeft(Math.ceil((new Date(info.periodEnd).getTime() - Date.now()) / 86_400_000))
  }, [info.periodEnd])

  const value = useMemo<SubscriptionValue>(() => {
    return {
      info,
      loading,
      isPremium: info.plan !== 'free',
      atGroupLimit: info.maxGroups != null && info.groupCount >= info.maxGroups,
      daysLeft,
      expiringSoon: info.plan !== 'free' && daysLeft != null && daysLeft <= 3 && daysLeft >= 0,
      reload,
    }
  }, [info, loading, daysLeft, reload])

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription(): SubscriptionValue {
  const ctx = useContext(SubscriptionContext)
  if (!ctx)
    throw new Error(
      t()
        .errors.hookOutsideProvider.replace('{fn}', 'useSubscription')
        .replace('{provider}', 'SubscriptionProvider'),
    )
  return ctx
}

// Getter (thay vì giá trị tĩnh) để gọi `PLAN_LABEL[plan]` ở đâu cũng đọc được
// nhãn theo ngôn ngữ hiện hành, không đổi hình dạng Record<Plan, string>.
export const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  get personal(): string {
    return t().common.planPersonal
  },
  get team(): string {
    return t().common.planTeam
  },
}
