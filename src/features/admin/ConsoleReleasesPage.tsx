import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, FileText, Loader2, Megaphone, RefreshCw, Save, Send, XCircle } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Field, Input, Segmented } from '../../components/ui'
import {
  cancelAdminRelease,
  loadAdminReleasesSnapshot,
  publishAdminRelease,
  saveAdminReleaseDraft,
  type AdminReleaseAudience,
  type AdminReleaseNote,
  type AdminReleaseStatus,
  type AdminReleasesSnapshot,
} from '../../lib/adminReleases'

const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
const NUMBER_FORMAT = new Intl.NumberFormat('vi-VN')

const AUDIENCE_OPTIONS: { value: AdminReleaseAudience; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
]

const STATUS_LABEL: Record<AdminReleaseStatus, string> = {
  draft: 'Nháp',
  published: 'Đã xuất bản',
  cancelled: 'Đã hủy',
}

const AUDIENCE_LABEL: Record<AdminReleaseAudience, string> = {
  all: 'Tất cả user',
  free: 'User Free',
  premium: 'User Premium',
}

type DraftState = {
  releaseId: string | null
  version: string
  title: string
  body: string
  audience: AdminReleaseAudience
  href: string
}

const EMPTY_DRAFT: DraftState = {
  releaseId: null,
  version: '',
  title: '',
  body: '',
  audience: 'all',
  href: '/notifications',
}

function draftFromRelease(release: AdminReleaseNote): DraftState {
  return {
    releaseId: release.id,
    version: release.version,
    title: release.title,
    body: release.body,
    audience: release.audience,
    href: release.href ?? '/notifications',
  }
}

export function ConsoleReleasesPage() {
  const [snapshot, setSnapshot] = useState<AdminReleasesSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT)
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    const next = await loadAdminReleasesSnapshot()
    setSnapshot(next)
    if (next) {
      const nextSelected = next.releases.find((release) => release.status === 'draft') ?? next.releases[0] ?? null
      setSelectedId(nextSelected?.id ?? null)
      if (nextSelected?.status === 'draft') setDraft(draftFromRelease(nextSelected))
      setNotice(null)
    } else {
      setNotice('Không tải được release notes. Kiểm tra quyền admin hoặc Edge Function admin-releases.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSnapshot()
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [loadSnapshot])

  const releases = useMemo(() => snapshot?.releases ?? [], [snapshot?.releases])
  const selected = useMemo(
    () => releases.find((release) => release.id === selectedId) ?? releases.find((release) => release.status === 'draft') ?? releases[0] ?? null,
    [releases, selectedId],
  )

  function approvalReady() {
    if (!reason.trim()) {
      setNotice('Cần nhập lý do để ghi audit.')
      return false
    }
    return true
  }

  function updateDraft<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function newDraft() {
    setSelectedId(null)
    setDraft(EMPTY_DRAFT)
    setReason('')
    setNotice(null)
  }

  function selectRelease(release: AdminReleaseNote) {
    setSelectedId(release.id)
    if (release.status === 'draft') setDraft(draftFromRelease(release))
  }

  async function onSaveDraft() {
    if (!approvalReady()) return
    if (!draft.version.trim() || !draft.title.trim() || !draft.body.trim()) {
      setNotice('Cần nhập version, tiêu đề và nội dung release note.')
      return
    }
    setBusy(true)
    const releaseId = await saveAdminReleaseDraft(undefined, { ...draft, reason })
    if (releaseId) {
      setNotice('Đã lưu draft release note và ghi audit.')
      setSelectedId(releaseId)
      setReason('')
      await loadSnapshot()
    } else {
      setNotice('Không lưu được draft. Kiểm tra version trùng hoặc quyền admin.')
    }
    setBusy(false)
  }

  async function onPublish() {
    if (!draft.releaseId || !approvalReady()) return
    const ok = window.confirm('Publish release note và gửi in-app announcement tới audience đã chọn?')
    if (!ok) return
    setBusy(true)
    const result = await publishAdminRelease(undefined, { releaseId: draft.releaseId, reason })
    if (result) {
      setNotice(`Đã publish release và gửi ${NUMBER_FORMAT.format(result.inAppSent)} in-app announcement.`)
      setReason('')
      await loadSnapshot()
    } else {
      setNotice('Không publish được release. Chỉ draft mới được publish.')
    }
    setBusy(false)
  }

  async function onCancel() {
    if (!draft.releaseId || !approvalReady()) return
    const ok = window.confirm('Hủy draft release note này? Published release không thể hủy bằng action MVP.')
    if (!ok) return
    setBusy(true)
    const cancelled = await cancelAdminRelease(undefined, { releaseId: draft.releaseId, reason })
    if (cancelled) {
      setNotice('Đã hủy draft release note và ghi audit.')
      setReason('')
      setDraft(EMPTY_DRAFT)
      await loadSnapshot()
    } else {
      setNotice('Không hủy được release note. Kiểm tra trạng thái hoặc quyền admin.')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Phase 11</Badge>
              <Badge tone="pos">Thông báo trong app</Badge>
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-app lg:text-3xl">Thông báo phiên bản</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Soạn release note, preview announcement và publish vào tab Hệ thống của thông báo người dùng qua pipeline admin có audit.
            </p>
          </div>
          <Button variant="secondary" onClick={() => void loadSnapshot()} disabled={loading || busy}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Làm mới
          </Button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          <SummaryPill label="Tổng" value={NUMBER_FORMAT.format(snapshot?.summary.total ?? 0)} tone="brand" />
          <SummaryPill label="Nháp" value={NUMBER_FORMAT.format(snapshot?.summary.draft ?? 0)} tone="muted" />
          <SummaryPill label="Đã xuất bản" value={NUMBER_FORMAT.format(snapshot?.summary.published ?? 0)} tone="pos" />
          <SummaryPill label="Đã hủy" value={NUMBER_FORMAT.format(snapshot?.summary.cancelled ?? 0)} tone="neg" />
        </div>
        {notice && <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold text-app">{notice}</p>}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
                <FileText size={20} />
              </span>
              <div>
                <h3 className="font-extrabold text-app">Trình soạn nháp</h3>
                <p className="text-xs text-muted">Lưu nháp trước, xuất bản sau khi xem trước ổn.</p>
              </div>
            </div>
            <Button variant="secondary" onClick={newDraft} disabled={busy}>Nháp mới</Button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <Field label="Version">
              <Input value={draft.version} onChange={(event) => updateDraft('version', event.target.value)} placeholder="1.3.0" />
            </Field>
            <Field label="Đối tượng">
              <Segmented options={AUDIENCE_OPTIONS} value={draft.audience} onChange={(value) => updateDraft('audience', value)} />
            </Field>
            <Field label="Tiêu đề">
              <Input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} placeholder="Splitz 1.3.0" />
            </Field>
            <Field label="Href">
              <Input value={draft.href} onChange={(event) => updateDraft('href', event.target.value)} placeholder="/notifications" />
            </Field>
            <label className="block space-y-1.5 lg:col-span-2">
              <span className="text-[13px] font-semibold text-muted">Nội dung</span>
              <textarea
                value={draft.body}
                onChange={(event) => updateDraft('body', event.target.value)}
                rows={7}
                className="w-full rounded-xl border border-[var(--border)] surface-sunken px-3.5 py-3 text-sm leading-6 text-app outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30"
                placeholder="Tóm tắt điểm mới, sửa lỗi và thay đổi quan trọng."
              />
            </label>
            <Field label="Lý do audit">
              <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Chuẩn bị release tháng 6" />
            </Field>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => void onSaveDraft()} disabled={busy || loading}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu nháp
            </Button>
            <Button onClick={() => void onPublish()} disabled={busy || !draft.releaseId}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Xuất bản
            </Button>
            <Button variant="danger" onClick={() => void onCancel()} disabled={busy || !draft.releaseId}>
              <XCircle size={16} /> Hủy
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl surface-sunken text-brand-600 dark:text-brand-300">
              <Megaphone size={20} />
            </span>
            <div>
              <h3 className="font-extrabold text-app">Xem trước trong app</h3>
              <p className="text-xs text-muted">Mẫu user sẽ thấy trong tab Hệ thống.</p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl gradient-brand text-white shadow-soft">
                <Bell size={19} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{draft.version || 'version'}</Badge>
                  <Badge tone="muted">{AUDIENCE_LABEL[draft.audience]}</Badge>
                </div>
                <p className="mt-3 font-extrabold text-app">{draft.title || 'Tiêu đề thông báo phiên bản'}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{draft.body || 'Nội dung thông báo phiên bản sẽ hiển thị ở đây.'}</p>
                <p className="mt-3 text-xs font-semibold text-faint">{draft.href || '/notifications'}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <MetaRow label="Nháp đang chọn" value={draft.releaseId ?? 'Nháp mới'} />
            <MetaRow label="Đã kiểm tra" value={snapshot ? formatDate(snapshot.checkedAt) : 'Đang tải'} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="overflow-hidden p-0">
          {loading && releases.length === 0 ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-[var(--surface-2)]" />)}
            </div>
          ) : releases.length === 0 ? (
            <EmptyState icon={<FileText size={28} />} title="Chưa có release note" description="Tạo draft đầu tiên để bắt đầu lịch sử release." />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {releases.map((release) => (
                <ReleaseRow key={release.id} release={release} active={release.id === selected?.id} onSelect={() => selectRelease(release)} />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-extrabold text-app">Audit thông báo phiên bản gần đây</h3>
          <div className="mt-4 space-y-3">
            {(snapshot?.recentChanges ?? []).length === 0 ? (
              <p className="text-sm text-muted">Chưa có audit release gần đây.</p>
            ) : snapshot?.recentChanges.map((change) => (
              <div key={change.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="text-sm font-extrabold text-app">{change.action}</p>
                <p className="mt-1 text-xs text-muted">{change.actorEmail ?? 'unknown'} · {formatDate(change.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ReleaseRow({ release, active, onSelect }: { release: AdminReleaseNote; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`press grid w-full gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] lg:grid-cols-[minmax(12rem,1fr)_8rem_8rem_9rem] lg:items-center ${active ? 'bg-brand-500/8' : ''}`}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-extrabold text-app">{release.title}</span>
          <Badge tone="brand">{release.version}</Badge>
        </span>
        <span className="mt-1 block truncate text-xs text-muted">{release.body}</span>
      </span>
      <ReleaseStatusBadge status={release.status} />
      <span className="text-sm font-bold text-app">{AUDIENCE_LABEL[release.audience]}</span>
      <span className="text-xs font-semibold text-muted">{release.publishedAt ? formatDate(release.publishedAt) : formatDate(release.updatedAt)}</span>
    </button>
  )
}

function ReleaseStatusBadge({ status }: { status: AdminReleaseStatus }) {
  if (status === 'published') return <Badge tone="pos"><CheckCircle2 size={13} />{STATUS_LABEL[status]}</Badge>
  if (status === 'cancelled') return <Badge tone="neg"><XCircle size={13} />{STATUS_LABEL[status]}</Badge>
  return <Badge tone="muted">{STATUS_LABEL[status]}</Badge>
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'pos' | 'neg' | 'muted' }) {
  const cls = tone === 'pos'
    ? 'text-pos'
    : tone === 'neg'
      ? 'text-neg'
      : tone === 'brand'
        ? 'text-brand-600 dark:text-brand-300'
        : 'text-muted'
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-faint">{label}</p>
      <p className={`mt-1 text-sm font-extrabold ${cls}`}>{value}</p>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
      <span className="font-semibold text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-extrabold text-app">{value}</span>
    </div>
  )
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return DATE_FORMAT.format(new Date(value))
}
