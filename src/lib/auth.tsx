import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Member } from './types'
import { getSupabase, isSupabaseConfigured } from './supabase/client'
import { identifyUser, resetUser } from './analytics'
import { isZaloConfigured, startZaloLogin } from './zalo'
import { t } from './i18n'
import { runtimeEnv } from './env'

/** Hồ sơ người dùng (ánh xạ từ bảng public.profiles). */
export type CloudProfile = {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  bankCode?: string
  bankAccountNumber?: string
  bankAccountName?: string
  /** Phương thức nhận tiền ngoài VietQR (SEPA/UPI/PromptPay/Pix/handle). */
  paymentRail?: Member['paymentRail']
  paymentData?: Record<string, string>
  /** null = chưa hoàn tất onboarding 4 bước. */
  onboardedAt?: string | null
}

/** Dữ liệu user nhập ở onboarding để hoàn tất hồ sơ. */
export type OnboardingInput = {
  displayName: string
  avatarUrl?: string
  bankCode: string
  bankAccountNumber: string
  bankAccountName: string
  /** Dùng khi chọn rail ngoài VietQR thay vì ngân hàng VN. */
  paymentRail?: Member['paymentRail']
  paymentData?: Record<string, string>
}

type AuthValue = {
  /** true khi chạy chế độ cloud (đăng nhập bắt buộc); false = local/demo. */
  cloud: boolean
  loading: boolean
  session: Session | null
  profile: CloudProfile | null
  /** Đã đăng nhập và hoàn tất onboarding. */
  ready: boolean
  /** Zalo có được cấu hình không (ẩn/hiện nút). */
  zaloEnabled: boolean
  /** Bản self-host bật SPLITZ_ENABLE_PASSWORD_LOGIN → hiện form email/mật khẩu. */
  passwordLoginEnabled: boolean
  signInWithGoogle: () => Promise<void>
  signInWithZalo: () => Promise<void>
  /** Trả về "cần xác nhận email" khi GoTrue không tự xác nhận (không có session). */
  signInWithPassword: (email: string, password: string) => Promise<boolean>
  signUpWithPassword: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  completeOnboarding: (input: OnboardingInput) => Promise<void>
  updateProfile: (patch: Partial<OnboardingInput>) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

type ProfileRow = {
  id: string
  email: string
  display_name: string
  avatar_url: string | null
  bank_code: string | null
  bank_account_number: string | null
  bank_account_name: string | null
  payment_rail: string | null
  payment_data: Record<string, string> | null
  onboarded_at: string | null
}

function mapProfile(row: ProfileRow): CloudProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    bankCode: row.bank_code ?? undefined,
    bankAccountNumber: row.bank_account_number ?? undefined,
    bankAccountName: row.bank_account_name ?? undefined,
    paymentRail: (row.payment_rail as Member['paymentRail']) ?? undefined,
    paymentData: row.payment_data ?? undefined,
    onboardedAt: row.onboarded_at,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cloud = isSupabaseConfigured
  const [loading, setLoading] = useState(cloud)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<CloudProfile | null>(null)

  // Lấy hồ sơ; tự tạo row nếu lần đầu đăng nhập (email từ provider là khoá định danh).
  const loadProfile = useCallback(async (sess: Session) => {
    const sb = getSupabase()
    const userId = sess.user.id
    const email = sess.user.email
    const meta = sess.user.user_metadata ?? {}

    const { data, error } = await sb
      .from('profiles')
      .select('id,email,display_name,avatar_url,bank_code,bank_account_number,bank_account_name,payment_rail,payment_data,onboarded_at')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error

    if (data) {
      const mapped = mapProfile(data as ProfileRow)
      setProfile(mapped)
      identifyUser(mapped.id, { email: mapped.email })
      return
    }

    if (!email) throw new Error(t().errors.accountMissingEmail)
    const insertRow = {
      id: userId,
      email,
      display_name: (meta.full_name as string) || (meta.name as string) || email.split('@')[0],
      avatar_url: (meta.avatar_url as string) || (meta.picture as string) || null,
    }
    // upsert (không insert) để tránh đua khi 2 sự kiện auth chạy song song lần đầu.
    // onboarded_at không nằm trong insertRow nên ON CONFLICT không ghi đè hồ sơ đã onboard.
    const { data: created, error: insErr } = await sb
      .from('profiles')
      .upsert(insertRow, { onConflict: 'id' })
      .select('id,email,display_name,avatar_url,bank_code,bank_account_number,bank_account_name,payment_rail,payment_data,onboarded_at')
      .single()
    if (insErr) throw insErr
    setProfile(mapProfile(created as ProfileRow))
  }, [])

  useEffect(() => {
    if (!cloud) return
    const sb = getSupabase()
    let active = true

    // onAuthStateChange tự phát INITIAL_SESSION khi load → dùng làm nguồn DUY NHẤT.
    // KHÔNG gọi getSession() song song + KHÔNG await trong callback: cả hai gây
    // deadlock auth-lock (Web Locks) của supabase-js → spinner kẹt vĩnh viễn.
    // Mọi truy vấn Supabase được defer ra ngoài callback bằng setTimeout.
    const { data: sub } = sb.auth.onAuthStateChange((_event, sess) => {
      if (!active) return
      setSession(sess)
      if (sess) {
        setTimeout(() => {
          if (!active) return
          loadProfile(sess)
            .catch(() => setProfile(null))
            .finally(() => {
              if (active) setLoading(false)
            })
        }, 0)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [cloud, loadProfile])

  const signInWithGoogle = useCallback(async () => {
    const sb = getSupabase()
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }, [])

  const signInWithZalo = useCallback(async () => {
    await startZaloLogin()
  }, [])

  // Email + mật khẩu chỉ dùng cho self-host (GoTrue hỗ trợ sẵn). Trả về true
  // khi có session ngay; false = GoTrue chờ xác nhận email → UI nhắc kiểm tra hộp thư.
  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
    return Boolean(data.session)
  }, [])

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await getSupabase().auth.signUp({ email, password })
    if (error) throw error
    return Boolean(data.session)
  }, [])

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut()
    setProfile(null)
    resetUser()
  }, [])

  const completeOnboarding = useCallback(
    async (input: OnboardingInput) => {
      const sb = getSupabase()
      if (!session) throw new Error(t().errors.notSignedIn)
      const patch = {
        display_name: input.displayName.trim(),
        avatar_url: input.avatarUrl ?? null,
        bank_code: input.bankCode || null,
        bank_account_number: input.bankAccountNumber.trim() || null,
        bank_account_name: input.bankAccountName.trim() || null,
        payment_rail: input.paymentRail ?? null,
        payment_data: input.paymentData ?? null,
        onboarded_at: new Date().toISOString(),
      }
      const { data, error } = await sb
        .from('profiles')
        .update(patch)
        .eq('id', session.user.id)
        .select('id,email,display_name,avatar_url,bank_code,bank_account_number,bank_account_name,onboarded_at')
        .single()
      if (error) throw error
      const mapped = mapProfile(data as ProfileRow)
      setProfile(mapped)
    },
    [session],
  )

  const updateProfile = useCallback(
    async (patch: Partial<OnboardingInput>) => {
      const sb = getSupabase()
      if (!session) throw new Error(t().errors.notSignedIn)
      const row: Record<string, string | Record<string, string> | null> = {}
      if (patch.displayName !== undefined) row.display_name = patch.displayName.trim()
      if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl ?? null
      if (patch.bankCode !== undefined) row.bank_code = patch.bankCode || null
      if (patch.bankAccountNumber !== undefined) row.bank_account_number = patch.bankAccountNumber.trim() || null
      if (patch.bankAccountName !== undefined) row.bank_account_name = patch.bankAccountName.trim() || null
      // Mọi lần lưu bank* đều mang theo trạng thái rail đầy đủ — quay về
      // VietQR (rail undefined) cũng phải XOÁ rail cũ trong DB.
      if (patch.paymentRail !== undefined || patch.bankCode !== undefined) {
        row.payment_rail = patch.paymentRail ?? null
        row.payment_data = patch.paymentData ?? null
      }
      const { data, error } = await sb
        .from('profiles')
        .update(row)
        .eq('id', session.user.id)
        .select('id,email,display_name,avatar_url,bank_code,bank_account_number,bank_account_name,onboarded_at')
        .single()
      if (error) throw error
      const mapped = mapProfile(data as ProfileRow)
      setProfile(mapped)
    },
    [session],
  )

  const value = useMemo<AuthValue>(
    () => ({
      cloud,
      loading,
      session,
      profile,
      ready: !cloud || Boolean(session && profile?.onboardedAt),
      zaloEnabled: isZaloConfigured,
      passwordLoginEnabled: cloud && runtimeEnv('VITE_ENABLE_PASSWORD_LOGIN') === 'true',
      signInWithGoogle,
      signInWithZalo,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      completeOnboarding,
      updateProfile,
    }),
    [cloud, loading, session, profile, signInWithGoogle, signInWithZalo, signInWithPassword, signUpWithPassword, signOut, completeOnboarding, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx)
    throw new Error(t().errors.hookOutsideProvider.replace('{fn}', 'useAuth').replace('{provider}', 'AuthProvider'))
  return ctx
}
