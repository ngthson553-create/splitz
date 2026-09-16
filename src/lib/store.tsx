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
import { getRepository } from './data'
import { joinViaInvite as joinViaInviteApi } from './data/invites'
import { leaveGroup as leaveGroupApi, transferOwnership as transferOwnershipApi } from './data/membership'
import { touchGroup } from './groupFactory'
import { isConflict } from './data/errors'
import { recordExpenseHistory } from './data/expenseHistory'
import { buildExpenseHistoryEntry } from './expenseHistory'
import type { Expense, Group, Settlement } from './types'

type StoreValue = {
  groups: Group[]
  loading: boolean
  error: string | null
  mode: 'local' | 'cloud'
  reload: () => Promise<void>
  getGroup: (id: string) => Group | undefined
  createGroup: (name: string, memberNames: string[]) => Promise<Group>
  upsertGroup: (group: Group, removedMemberIds?: string[]) => Promise<void>
  updateGroup: (id: string, mutate: (group: Group) => Group) => Promise<void>
  removeGroup: (id: string) => Promise<void>
  /** Tham gia/claim nhóm qua token lời mời (cloud). Trả về groupId. */
  joinViaInvite: (token: string) => Promise<string>
  /** Member tự rời nhóm (cloud). */
  leaveGroup: (groupId: string) => Promise<void>
  /** Chủ nhóm chuyển quyền cho thành viên khác (cloud). */
  transferOwnership: (groupId: string, toMemberId: string) => Promise<void>
  /** Ghi 1 khoản chi (per-record, cloud kiểm version). Ném ConflictError nếu lệch. */
  saveExpense: (groupId: string, expense: Expense) => Promise<{ id: string; version: number }>
  /** Xoá 1 khoản chi (kiểm version để không xoá đè bản người khác vừa sửa). */
  removeExpense: (groupId: string, expenseId: string, version?: number) => Promise<void>
  /** Ghi nhận "tôi đã chuyển" (người trả) → quyết toán pending. */
  createSettlement: (groupId: string, fromMemberId: string, toMemberId: string, amount: number) => Promise<string>
  /** Người nhận xác nhận "đã nhận" → confirmed (trừ nợ). */
  confirmSettlement: (groupId: string, settlementId: string) => Promise<void>
  /** Huỷ quyết toán đang chờ. */
  cancelSettlement: (groupId: string, settlementId: string) => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

function sortByUpdated(groups: Group[]): Group[] {
  return [...groups].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const repo = useMemo(() => getRepository(), [])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGroups(await repo.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.')
    } finally {
      setLoading(false)
    }
  }, [repo])

  // Nạp lại NGẦM (không bật spinner, không ghi đè error) — dùng cho đồng bộ định kỳ.
  const refresh = useCallback(async () => {
    try {
      setGroups(await repo.list())
    } catch {
      // lỗi mạng tạm thời khi poll → bỏ qua, giữ dữ liệu đang có
    }
  }, [repo])

  // Chỉ nạp khi auth đã sẵn sàng — tránh query Supabase (nội bộ gọi getSession)
  // chạy song song lúc khởi tạo auth gây deadlock lock, và tránh race sau đăng nhập.
  const { cloud, loading: authLoading, session, profile: authProfile } = useAuth()
  const uid = session?.user?.id ?? null
  const actorName = authProfile?.displayName || session?.user?.email || 'Bạn'
  useEffect(() => {
    if (cloud && authLoading) return // chờ auth resolve
    if (cloud && !uid) {
      // Chưa đăng nhập: không có nhóm để tải.
      setGroups([])
      setLoading(false)
      return
    }
    void reload()
  }, [cloud, authLoading, uid, reload])

  // Đồng bộ realtime tiết kiệm tài nguyên: poll 20s khi tab hiển thị; ẩn >60s → tắt;
  // quay lại tab → đồng bộ ngay rồi bật lại. (ROADMAP: 20s active, off khi hidden >60s.)
  useEffect(() => {
    if (repo.mode !== 'cloud' || !uid) return
    let interval: number | undefined
    let stopTimer: number | undefined
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const start = () => {
      if (interval == null) interval = window.setInterval(tick, 20000)
    }
    const stop = () => {
      if (interval != null) {
        window.clearInterval(interval)
        interval = undefined
      }
    }
    const onVisibility = () => {
      if (stopTimer) {
        window.clearTimeout(stopTimer)
        stopTimer = undefined
      }
      if (document.visibilityState === 'visible') {
        void refresh()
        start()
      } else {
        stopTimer = window.setTimeout(stop, 60000)
      }
    }
    start()
    // Nếu tab nạp lúc đang ẩn: lên lịch tắt sau 60s (visibilitychange sẽ không tự kích hoạt).
    if (document.visibilityState !== 'visible') {
      stopTimer = window.setTimeout(stop, 60000)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      if (stopTimer) window.clearTimeout(stopTimer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [repo, uid, refresh])

  const replaceGroup = useCallback((next: Group) => {
    setGroups((prev) => {
      const i = prev.findIndex((g) => g.id === next.id)
      const copy = [...prev]
      if (i >= 0) copy[i] = next
      else copy.unshift(next)
      return sortByUpdated(copy)
    })
  }, [])

  const refreshGroupSilently = useCallback(
    async (groupId: string) => {
      try {
        const fresh = await repo.get(groupId)
        if (fresh) replaceGroup(fresh)
      } catch {
        // RPC đã thành công; bỏ qua lỗi nạp lại để không báo sai là thao tác thất bại.
      }
    },
    [repo, replaceGroup],
  )

  const patchGroupSettlement = useCallback(
    (groupId: string, mutate: (settlements: Settlement[]) => Settlement[]) => {
      setGroups((prev) =>
        sortByUpdated(
          prev.map((group) => {
            if (group.id !== groupId) return group
            return {
              ...group,
              updatedAt: new Date().toISOString(),
              settlements: mutate(group.settlements ?? []),
            }
          }),
        ),
      )
    },
    [],
  )

  const createGroup = useCallback(
    async (name: string, memberNames: string[]) => {
      const group = await repo.createGroup(name, memberNames)
      replaceGroup(group)
      return group
    },
    [repo, replaceGroup],
  )

  const upsertGroup = useCallback(
    async (group: Group, removedMemberIds?: string[]) => {
      const next = touchGroup(group)
      replaceGroup(next)
      await repo.save(next, removedMemberIds)
      // Cloud: id thành viên mới do DB cấp → đồng bộ lại bản chuẩn.
      if (repo.mode === 'cloud') {
        const fresh = await repo.get(next.id)
        if (fresh) replaceGroup(fresh)
      }
    },
    [repo, replaceGroup],
  )

  const updateGroup = useCallback(
    async (id: string, mutate: (group: Group) => Group) => {
      const current = groups.find((g) => g.id === id)
      if (!current) return
      const next = mutate(current)
      // Thành viên người dùng chủ động bỏ = có ở bản đang cầm, không còn ở bản mới.
      const nextIds = new Set(next.members.map((m) => m.id))
      const removedMemberIds = current.members
        .map((m) => m.id)
        .filter((mid) => !nextIds.has(mid))
      await upsertGroup(next, removedMemberIds)
    },
    [groups, upsertGroup],
  )

  const removeGroup = useCallback(
    async (id: string) => {
      setGroups((prev) => prev.filter((g) => g.id !== id))
      await repo.remove(id)
    },
    [repo],
  )

  const joinViaInvite = useCallback(
    async (token: string) => {
      const groupId = await joinViaInviteApi(token)
      await reload()
      return groupId
    },
    [reload],
  )

  const leaveGroup = useCallback(
    async (groupId: string) => {
      await leaveGroupApi(groupId)
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
    },
    [],
  )

  const transferOwnership = useCallback(
    async (groupId: string, toMemberId: string) => {
      await transferOwnershipApi(groupId, toMemberId)
      const fresh = await repo.get(groupId)
      if (fresh) replaceGroup(fresh)
    },
    [repo, replaceGroup],
  )

  const saveExpense = useCallback(
    async (groupId: string, expense: Expense) => {
      const current = groups.find((g) => g.id === groupId)
      const before = current?.expenses.find((e) => e.id === expense.id) ?? null
      let saved: { id: string; version: number }
      try {
        saved = await repo.saveExpense(groupId, expense)
      } catch (e) {
        // Xung đột: tải lại nhóm để UI hiện bản mới nhất, rồi ném tiếp cho màn nhập xử lý.
        if (isConflict(e)) {
          const fresh = await repo.get(groupId)
          if (fresh) replaceGroup(fresh)
        }
        throw e
      }
      const fresh = await repo.get(groupId)
      if (fresh) replaceGroup(fresh)
      const after = fresh?.expenses.find((e) => e.id === saved.id) ?? {
        ...expense,
        id: saved.id,
        version: saved.version,
      }
      const historyGroup = fresh ?? current
      if (historyGroup) {
        await recordExpenseHistory(
          repo.mode,
          buildExpenseHistoryEntry({
            group: historyGroup,
            action: before ? 'expense.update' : 'expense.create',
            before,
            after,
            actorName,
            actorUserId: uid,
          }),
        )
      }
      return saved
    },
    [actorName, groups, repo, replaceGroup, uid],
  )

  const removeExpense = useCallback(
    async (groupId: string, expenseId: string, version?: number) => {
      const current = groups.find((g) => g.id === groupId)
      const before = current?.expenses.find((e) => e.id === expenseId) ?? null
      try {
        await repo.removeExpense(groupId, expenseId, version)
      } catch (e) {
        if (isConflict(e)) {
          const fresh = await repo.get(groupId)
          if (fresh) replaceGroup(fresh)
        }
        throw e
      }
      const fresh = await repo.get(groupId)
      if (fresh) replaceGroup(fresh)
      if (current && before) {
        await recordExpenseHistory(
          repo.mode,
          buildExpenseHistoryEntry({
            group: current,
            action: 'expense.delete',
            before,
            actorName,
            actorUserId: uid,
          }),
        )
      }
    },
    [actorName, groups, repo, replaceGroup, uid],
  )

  const createSettlement = useCallback(
    async (groupId: string, fromMemberId: string, toMemberId: string, amount: number) => {
      const id = await repo.createSettlement(groupId, fromMemberId, toMemberId, amount)
      const createdAt = new Date().toISOString()
      patchGroupSettlement(groupId, (settlements) => [
        ...settlements,
        {
          id,
          groupId,
          fromMemberId,
          toMemberId,
          amount,
          status: 'pending',
          paymentMethod: 'bank_transfer',
          createdAt,
        },
      ])
      void refreshGroupSilently(groupId)
      return id
    },
    [patchGroupSettlement, refreshGroupSilently, repo],
  )

  const confirmSettlement = useCallback(
    async (groupId: string, settlementId: string) => {
      await repo.confirmSettlement(groupId, settlementId)
      patchGroupSettlement(groupId, (settlements) =>
        settlements.map((settlement) =>
          settlement.id === settlementId
            ? {
                ...settlement,
                status: 'confirmed',
                confirmedAt: new Date().toISOString(),
              }
            : settlement,
        ),
      )
      void refreshGroupSilently(groupId)
    },
    [patchGroupSettlement, refreshGroupSilently, repo],
  )

  const cancelSettlement = useCallback(
    async (groupId: string, settlementId: string) => {
      await repo.cancelSettlement(groupId, settlementId)
      patchGroupSettlement(groupId, (settlements) =>
        settlements.filter((settlement) => settlement.id !== settlementId),
      )
      void refreshGroupSilently(groupId)
    },
    [patchGroupSettlement, refreshGroupSilently, repo],
  )

  const getGroup = useCallback((id: string) => groups.find((g) => g.id === id), [groups])

  const value: StoreValue = {
    groups,
    loading,
    error,
    mode: repo.mode,
    reload,
    getGroup,
    createGroup,
    upsertGroup,
    updateGroup,
    removeGroup,
    joinViaInvite,
    leaveGroup,
    transferOwnership,
    saveExpense,
    removeExpense,
    createSettlement,
    confirmSettlement,
    cancelSettlement,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore phải nằm trong StoreProvider.')
  return ctx
}
