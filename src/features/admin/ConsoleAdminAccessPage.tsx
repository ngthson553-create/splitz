import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Ban, CheckCircle2, Clock3, RefreshCw, Search, ShieldCheck, UserPlus } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, Input, Segmented } from '../../components/ui'
import {
  disableAdminAccess,
  loadAdminAccessSnapshot,
  normalizeAdminAccessRole,
  searchAdminAccessProfiles,
  upsertAdminAccess,
  type AdminAccessCandidate,
  type AdminAccessRole,
  type AdminAccessSnapshot,
  type AdminAccessStatus,
} from '../../lib/adminAccess'

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const ROLE_OPTIONS: { value: AdminAccessRole; label: string }[] = [
  { value: 'support', label: 'Support' },
  { value: 'readonly', label: 'Readonly' },
  { value: 'operator', label: 'Operator' },
  { value: 'owner', label: 'Owner' },
]

const STATUS_LABEL: Record<AdminAccessStatus, string> = {
  active: 'Đang bật',
  disabled: 'Đã tắt',
}

const ROLE_LABEL: Record<AdminAccessRole, string> = {
  owner: 'Owner',
  operator: 'Operator',
  support: 'Support',
  readonly: 'Readonly',
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Chưa rõ'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Chưa rõ' : DATE_FORMAT.format(date)
}

function roleTone(role: AdminAccessRole): 'brand' | 'pos' | 'muted' {
  if (role === 'owner') return 'brand'
  if (role === 'operator') return 'pos'
  return 'muted'
}

export function ConsoleAdminAccessPage() {
  const [snapshot, setSnapshot] = useState<AdminAccessSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<AdminAccessCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedRole, setSelectedRole] = useState<AdminAccessRole>('support')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [disableTarget, setDisableTarget] = useState<string | null>(null)
  const [disableReason, setDisableReason] = useState('')
  const [disableConfirmed, setDisableConfirmed] = useState(false)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminAccessSnapshot()
    setSnapshot(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSnapshot()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadSnapshot])

  const summary = snapshot?.summary ?? { total: 0, active: 0, disabled: 0, owners: 0 }
  const adminIds = useMemo(() => new Set((snapshot?.admins ?? []).map((admin) => admin.userId)), [snapshot])

  async function handleSearch() {
    const clean = query.trim()
    if (!clean) {
      setNotice('Nhập email hoặc user id trước khi tìm profile.')
      setCandidates([])
      return
    }
    setSearching(true)
    setNotice(null)
    const rows = await searchAdminAccessProfiles(undefined, clean)
    setCandidates(rows)
    setSearching(false)
    if (rows.length === 0) setNotice('Không tìm thấy profile phù hợp.')
  }

  async function handleGrant(candidate: AdminAccessCandidate) {
    if (!reason.trim() || !confirmed) {
      setNotice('Cần nhập lý do và tick xác nhận trước khi cấp quyền admin.')
      return
    }
    const ok = await upsertAdminAccess(undefined, {
      userId: candidate.userId,
      role: normalizeAdminAccessRole(selectedRole),
      status: 'active',
      reason: reason.trim(),
    })
    setNotice(ok ? 'Đã gửi yêu cầu cập nhật quyền admin và ghi audit.' : 'Không lưu được quyền admin. Hãy kiểm tra Edge Function hoặc quyền owner.')
    if (ok) {
      setReason('')
      setConfirmed(false)
      await loadSnapshot()
    }
  }

  async function handleDisable(userId: string) {
    if (disableTarget !== userId) {
      setDisableTarget(userId)
      setDisableReason('')
      setDisableConfirmed(false)
      setNotice('Nhập lý do và xác nhận trước khi tắt quyền admin.')
      return
    }
    if (!disableReason.trim() || !disableConfirmed) {
      setNotice('Cần nhập lý do và tick xác nhận trước khi tắt quyền admin.')
      return
    }
    const ok = await disableAdminAccess(undefined, { userId, reason: disableReason.trim() })
    setNotice(ok ? 'Đã tắt quyền admin và ghi audit.' : 'Không tắt được quyền admin. Có thể đây là owner cuối cùng hoặc function trả lỗi.')
    if (ok) {
      setDisableTarget(null)
      setDisableReason('')
      setDisableConfirmed(false)
      await loadSnapshot()
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
              <ShieldCheck size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">Owner-only</Badge>
                <Badge tone="muted">Không hiện trong app user</Badge>
              </div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-app">Quyền admin</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Quản lý người được vào console bằng profile Supabase, role và trạng thái. Mọi thay đổi đều cần lý do audit và được xử lý qua Edge Function có guard server-side.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading}>
            <RefreshCw size={16} /> Tải lại
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label="Tổng admin" value={summary.total} />
          <SummaryPill label="Đang bật" value={summary.active} tone="pos" />
          <SummaryPill label="Đã tắt" value={summary.disabled} tone="muted" />
          <SummaryPill label="Owner" value={summary.owners} tone="brand" />
        </div>
      </Card>

      {notice && (
        <div className="rounded-2xl border border-brand-400/20 bg-brand-500/8 p-4 text-sm font-semibold text-app">
          <div className="flex items-start gap-2">
            <AlertCircle size={17} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
            <span>{notice}</span>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-app">Danh sách admin</h3>
              <p className="text-xs text-muted">Profile đang hoặc từng có quyền console.</p>
            </div>
            <Badge tone="muted">Cập nhật {formatDate(snapshot?.checkedAt)}</Badge>
          </div>

          {loading ? (
            <EmptyState icon={<Clock3 size={24} />} title="Đang tải quyền admin" description="Console đang lấy snapshot qua admin-access." />
          ) : snapshot && snapshot.admins.length > 0 ? (
            <div className="mt-4 space-y-3">
              {snapshot.admins.map((admin) => (
                <div key={admin.userId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar name={admin.displayName ?? admin.email} src={admin.avatarUrl} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-app">{admin.email}</p>
                        <p className="text-xs text-muted">{admin.displayName ?? 'Chưa có tên hiển thị'}</p>
                        <p className="mt-1 text-xs text-faint">Tạo bởi {admin.createdByEmail ?? 'không rõ'} · {formatDate(admin.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      <Badge tone={roleTone(admin.role)}>{ROLE_LABEL[admin.role]}</Badge>
                      <Badge tone={admin.status === 'active' ? 'pos' : 'muted'}>{STATUS_LABEL[admin.status]}</Badge>
                    </div>
                  </div>

                  {admin.status === 'active' && (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      {disableTarget === admin.userId && (
                        <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                          <Input value={disableReason} onChange={(event) => setDisableReason(event.target.value)} placeholder="Lý do tắt quyền" />
                          <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-xs font-semibold text-muted">
                            <input type="checkbox" checked={disableConfirmed} onChange={(event) => setDisableConfirmed(event.target.checked)} />
                            Xác nhận
                          </label>
                        </div>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => void handleDisable(admin.userId)}>
                        <Ban size={15} /> Tắt quyền
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<ShieldCheck size={24} />} title="Chưa có dữ liệu admin" description="Nếu owner đã được seed, hãy kiểm tra Edge Function admin-access." />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-brand-600 dark:text-brand-300" />
              <h3 className="font-bold text-app">Thêm admin</h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">Tìm profile đã đăng nhập Splitz, chọn role, nhập lý do audit rồi cấp quyền.</p>

            <div className="mt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Email hoặc user id" />
                <Button variant="secondary" onClick={() => void handleSearch()} disabled={searching}>
                  <Search size={16} /> Tìm profile
                </Button>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-semibold text-muted">Role cấp quyền</p>
                <Segmented options={ROLE_OPTIONS} value={selectedRole} onChange={setSelectedRole} />
              </div>

              <label className="block space-y-1.5">
                <span className="text-[13px] font-semibold text-muted">Lý do audit</span>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-sunken)] px-3.5 py-3 text-sm text-app outline-none transition placeholder:text-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                  placeholder="Ví dụ: thêm support vận hành trong giai đoạn test nội bộ"
                />
              </label>

              <label className="flex items-start gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs font-semibold text-muted">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" />
                <span>Tôi xác nhận đây là profile đúng và thay đổi này sẽ được ghi vào audit log.</span>
              </label>
            </div>

            <div className="mt-4 space-y-2">
              {candidates.map((candidate) => (
                <div key={candidate.userId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <Avatar name={candidate.displayName ?? candidate.email} src={candidate.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-app">{candidate.email}</p>
                        <p className="text-xs text-muted">{candidate.displayName ?? 'Chưa có tên'} · {formatDate(candidate.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {(candidate.alreadyAdmin || adminIds.has(candidate.userId)) && <Badge tone="muted">Đã có quyền</Badge>}
                      <Button size="sm" onClick={() => void handleGrant(candidate)}>
                        <CheckCircle2 size={15} /> Cấp quyền
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-brand-600 dark:text-brand-300" />
              <h3 className="font-bold text-app">Audit gần đây</h3>
            </div>
            <div className="mt-4 space-y-2">
              {(snapshot?.recentChanges ?? []).length > 0 ? (
                snapshot?.recentChanges.map((change) => (
                  <div key={change.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                    <p className="text-sm font-bold text-app">{change.action}</p>
                    <p className="mt-1 text-xs text-muted">{change.actorEmail ?? 'Admin'} · {formatDate(change.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Chưa có audit cho quyền admin.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SummaryPill({ label, value, tone = 'muted' }: { label: string; value: number; tone?: 'brand' | 'pos' | 'muted' }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-app">{value}</p>
      <div className="mt-2"><Badge tone={tone}>Snapshot</Badge></div>
    </div>
  )
}
