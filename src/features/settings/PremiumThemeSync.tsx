import { useEffect, useRef } from 'react'
import { useTheme } from '../../lib/theme'
import { useSubscription } from '../../lib/subscription'

const SEEN_KEY = 'splitz.prestigeOffered.v1'

/**
 * Đồng bộ theme Prestige với trạng thái Premium:
 * - Lần ĐẦU thành Premium → tự bật Prestige (gây "wow"), chỉ 1 lần (user vẫn đổi lại được).
 * - Mất Premium mà đang dùng Prestige → hạ về Tối (tránh kẹt theme khoá).
 * Không render gì.
 */
export function PremiumThemeSync() {
  const { isPremium, loading } = useSubscription()
  const { theme, setTheme } = useTheme()
  const prevPremium = useRef<boolean | null>(null)

  useEffect(() => {
    if (loading) return

    // Hết Premium nhưng vẫn ở Prestige → hạ cấp theme.
    if (!isPremium && theme === 'prestige') {
      setTheme('dark')
    }

    // Vừa lên Premium (false→true) lần đầu → tự bật Prestige một lần.
    if (isPremium && prevPremium.current === false) {
      const offered = localStorage.getItem(SEEN_KEY)
      if (!offered) {
        localStorage.setItem(SEEN_KEY, '1')
        setTheme('prestige')
      }
    }

    prevPremium.current = isPremium
  }, [isPremium, loading, theme, setTheme])

  return null
}
