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
import { t } from './i18n'
import type { Group, Member } from './types'

export type Profile = {
  /** Tên hiển thị của bạn, dùng để tự khớp với thành viên cùng tên trong các nhóm. */
  name: string
  /** Ảnh đại diện: data URL (tự upload) hoặc URL từ Google/Zalo khi có đăng nhập. */
  avatarUrl?: string
}

type ProfileValue = {
  profile: Profile
  setName: (name: string) => void
  setAvatar: (avatarUrl: string | undefined) => void
  /** Đã đặt tên chưa (để gợi ý onboarding). */
  hasName: boolean
}

const KEY = 'splitz.profile.v1'
const ProfileContext = createContext<ProfileValue | null>(null)

function readProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Profile>
      if (typeof parsed.name === 'string')
        return {
          name: parsed.name,
          avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : undefined,
        }
    }
  } catch {
    // bỏ qua
  }
  return { name: '' }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { cloud, profile: cloudProfile, updateProfile } = useAuth()
  const [local, setLocal] = useState<Profile>(() =>
    typeof window === 'undefined' ? { name: '' } : readProfile(),
  )

  useEffect(() => {
    if (cloud) return // chế độ cloud: nguồn chân lý là hồ sơ Supabase
    localStorage.setItem(KEY, JSON.stringify(local))
  }, [cloud, local])

  // Ở chế độ cloud, lấy tên/avatar trực tiếp từ hồ sơ đám mây (reactive).
  const profile = useMemo<Profile>(() => {
    if (cloud) {
      return { name: cloudProfile?.displayName ?? '', avatarUrl: cloudProfile?.avatarUrl }
    }
    return local
  }, [cloud, cloudProfile, local])

  const setName = useCallback(
    (name: string) => {
      if (cloud) {
        void updateProfile({ displayName: name })
        return
      }
      setLocal((prev) => ({ ...prev, name: name.trim() }))
    },
    [cloud, updateProfile],
  )

  const setAvatar = useCallback(
    (avatarUrl: string | undefined) => {
      if (cloud) {
        void updateProfile({ avatarUrl })
        return
      }
      setLocal((prev) => ({ ...prev, avatarUrl }))
    },
    [cloud, updateProfile],
  )

  const value = useMemo<ProfileValue>(
    () => ({ profile, setName, setAvatar, hasName: profile.name.trim().length > 0 }),
    [profile, setName, setAvatar],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile(): ProfileValue {
  const ctx = useContext(ProfileContext)
  if (!ctx)
    throw new Error(t().errors.hookOutsideProvider.replace('{fn}', 'useProfile').replace('{provider}', 'ProfileProvider'))
  return ctx
}

/** So khớp tên (bỏ dấu cách thừa, không phân biệt hoa thường). */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Tìm thành viên ứng với "tôi" trong nhóm theo tên hồ sơ. */
export function findMyMember(group: Group, myName: string): Member | undefined {
  const target = normalizeName(myName)
  if (!target) return undefined
  return group.members.find((m) => normalizeName(m.name) === target)
}
