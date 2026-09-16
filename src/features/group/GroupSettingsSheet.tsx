import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BadgeCheck, Check, Copy, Crown, Download, LinkIcon, LogOut, Pencil, Trash2, UserPlus } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Badge, Button, Input, Segmented } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { createInvite } from '../../lib/data/invites'
import { useConfirm } from '../../components/ConfirmDialog'
import { useToast } from '../../components/Toast'
import { createMember } from '../../lib/groupFactory'
import { bankDisplayName } from '../../lib/settlement/vietqr'
import { memberNetBalance } from '../../lib/settlement'
import { exportGroupReport } from '../../lib/report'
import { trackEvent } from '../../lib/analytics'
import type { Group, Member, SettlementMethod } from '../../lib/types'
import { MemberSheet } from '../members/MemberSheet'

const EMOJIS = ['💸', '🍜', '✈️', '🏠', '🎉', '⚽', '🏖️', '☕', '🎬', '🛒', '🍻', '🚕']

export function GroupSettingsSheet({
  group,
  open,
  onClose,
}: {
  group: Group
  open: boolean
  onClose: () => void
}) {
  const { updateGroup, removeGroup, leaveGroup, mode } = useStore()
  const { profile } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState(group.name)
  const [emoji, setEmoji] = useState(group.emoji ?? '💸')
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [invite, setInvite] = useState<{ label: string; value: string } | null>(null)
  const [inviting, setInviting] = useState(false)

  const isCloud = mode === 'cloud'
  // Local: toàn quyền. Cloud: chỉ chủ nhóm mới quản lý thành viên/nhóm.
  const isOwner = !isCloud || group.ownerId === profile?.id

  useEffect(() => {
    if (open) {
      setName(group.name)
      setEmoji(group.emoji ?? '💸')
    }
  }, [open, group.name, group.emoji])

  const usedIds = new Set(
    group.expenses.flatMap((e) => [
      ...e.payers.map((p) => p.memberId),
      ...e.participants.map((p) => p.memberId),
    ]),
  )

  const dirty = name.trim() !== group.name || emoji !== (group.emoji ?? '💸')

  async function saveGroup() {
    await updateGroup(group.id, (g) => ({ ...g, name: name.trim() || g.name, emoji }))
    toast.success('Đã lưu nhóm')
  }

  async function addMember() {
    const member = createMember(`Thành viên ${group.members.length + 1}`, group.members.length)
    await updateGroup(group.id, (g) => ({ ...g, members: [...g.members, member] }))
    // Local: mở luôn để sửa. Cloud: id thật do DB cấp sau reload → user bấm sửa từ danh sách.
    if (!isCloud) setEditingMember(member)
  }

  async function removeMember(id: string, mname: string) {
    const ok = await confirm({
      title: `Xoá ${mname}?`,
      description: 'Thành viên này chưa tham gia khoản chi nào.',
      confirmLabel: 'Xoá',
      danger: true,
    })
    if (!ok) return
    await updateGroup(group.id, (g) => ({ ...g, members: g.members.filter((m) => m.id !== id) }))
  }

  async function setMethod(method: SettlementMethod) {
    await updateGroup(group.id, (g) => ({ ...g, settlementMethod: method }))
  }

  async function makeInvite(kind: 'link' | 'code', targetMemberId?: string) {
    setInviting(true)
    try {
      const res = await createInvite(group.id, { kind, targetMemberId })
      trackEvent('invite_created', { kind, is_claim: Boolean(targetMemberId) })
      if (kind === 'code') setInvite({ label: 'Mã nhóm', value: res.code ?? res.token })
      else setInvite({ label: targetMemberId ? 'Link nhận thành viên' : 'Link mời', value: res.url })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không tạo được lời mời.')
    } finally {
      setInviting(false)
    }
  }

  async function copyInvite() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.value)
      toast.success('Đã sao chép')
    } catch {
      toast.error('Không sao chép được')
    }
  }

  async function exportReport() {
    try {
      await exportGroupReport(group)
      trackEvent('group_report_exported', { member_count: group.members.length, expense_count: group.expenses.length })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không xuất được báo cáo.')
    }
  }

  async function leave() {
    // CHẶN rời nhóm khi còn nợ/được nợ (số dư sau quyết toán xác nhận ≠ 0).
    const myMemberId = group.members.find((m) => m.userId === profile?.id)?.id
    if (myMemberId) {
      const bal = memberNetBalance(group, myMemberId)
      if (bal !== 0) {
        toast.error(
          bal < 0
            ? 'Bạn còn nợ trong nhóm. Hãy tất toán hết trước khi rời.'
            : 'Nhóm còn nợ bạn. Hãy quyết toán xong trước khi rời.',
        )
        return
      }
    }
    const ok = await confirm({
      title: `Rời nhóm “${group.name}”?`,
      description: 'Bạn sẽ không còn thấy nhóm này. Có thể tham gia lại nếu được mời.',
      confirmLabel: 'Rời nhóm',
      danger: true,
    })
    if (!ok) return
    try {
      await leaveGroup(group.id)
      toast.success('Đã rời nhóm')
      onClose()
      navigate('/groups')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không rời được nhóm.')
    }
  }

  async function deleteGroup() {
    const ok = await confirm({
      title: `Xoá nhóm “${group.name}”?`,
      description: 'Toàn bộ khoản chi và thành viên sẽ bị xoá vĩnh viễn.',
      confirmLabel: 'Xoá nhóm',
      danger: true,
    })
    if (!ok) return
    await removeGroup(group.id)
    trackEvent('group_deleted', { member_count: group.members.length, expense_count: group.expenses.length })
    toast.success('Đã xoá nhóm')
    onClose()
    navigate('/groups')
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cài đặt nhóm"
      footer={
        dirty && isOwner ? (
          <Button fullWidth size="lg" onClick={saveGroup}>
            <Check size={18} /> Lưu thay đổi
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5 py-1">
        {/* Tên + emoji */}
        {isOwner ? (
          <section className="space-y-3">
            <div className="flex flex-wrap gap-2 justify-center">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`press grid place-items-center h-9 w-9 rounded-xl text-lg transition ${
                    emoji === e ? 'gradient-brand-soft shadow-soft' : 'surface-sunken'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên nhóm" />
          </section>
        ) : (
          <section className="flex items-center gap-3">
            <div className="grid place-items-center h-12 w-12 rounded-2xl gradient-brand-soft text-2xl shadow-soft">
              {group.emoji ?? '💸'}
            </div>
            <div>
              <p className="font-bold text-app">{group.name}</p>
              <p className="text-xs text-muted">Bạn là thành viên của nhóm này.</p>
            </div>
          </section>
        )}

        {/* Thành viên */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-muted">
              Thành viên ({group.members.length})
            </h3>
          </div>
          <p className="text-xs text-faint">
            {isCloud
              ? 'Thành viên “ảo” chỉ có tên; mời họ nhận danh tính để tự quản tài khoản của mình.'
              : 'Gõ tên tự do cho từng thành viên.'}
          </p>
          <div className="space-y-1.5">
            {group.members.map((m) => {
              const hasBank = Boolean(m.bankCode && m.bankAccountNumber)
              const canRemove = !usedIds.has(m.id) && group.members.length > 1
              const isMe = isCloud && m.userId && m.userId === profile?.id
              const isVirtual = isCloud && !m.userId
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl surface-sunken"
                >
                  <Avatar name={m.name} color={m.color} src={m.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                      {m.name}
                      {m.role === 'owner' && <Crown size={13} className="text-amber-500 shrink-0" />}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {isMe
                        ? 'Bạn'
                        : isVirtual
                          ? 'Thành viên ảo — chưa có tài khoản'
                          : hasBank
                            ? `${bankDisplayName(m.bankCode)} · ${m.bankAccountNumber}`
                            : 'Chưa có tài khoản'}
                    </p>
                  </div>
                  {hasBank && !isVirtual && (
                    <Badge tone="pos" className="shrink-0">
                      <BadgeCheck size={12} /> QR
                    </Badge>
                  )}
                  {isOwner && isVirtual && (
                    <button
                      onClick={() => makeInvite('link', m.id)}
                      disabled={inviting}
                      className="press grid place-items-center h-8 w-8 rounded-lg text-faint hover:text-brand-600 shrink-0"
                      aria-label="Mời nhận thành viên này"
                    >
                      <LinkIcon size={15} />
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setEditingMember(m)}
                      className="press grid place-items-center h-8 w-8 rounded-lg text-faint hover:text-brand-600 shrink-0"
                      aria-label="Sửa"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {isOwner && canRemove && !isMe && (
                    <button
                      onClick={() => removeMember(m.id, m.name)}
                      className="press grid place-items-center h-8 w-8 rounded-lg text-faint hover:text-neg shrink-0"
                      aria-label="Xoá"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {isOwner && (
            <Button fullWidth variant="secondary" onClick={addMember}>
              <UserPlus size={16} /> Thêm thành viên
            </Button>
          )}
        </section>

        {/* Mời thành viên (cloud) */}
        {isCloud && (
          <section className="space-y-2">
            <h3 className="text-[13px] font-semibold text-muted">Mời thành viên</h3>
            <div className="flex gap-2">
              <Button fullWidth variant="secondary" onClick={() => makeInvite('link')} disabled={inviting}>
                <LinkIcon size={16} /> Link mời
              </Button>
              <Button fullWidth variant="secondary" onClick={() => makeInvite('code')} disabled={inviting}>
                <UserPlus size={16} /> Mã nhóm
              </Button>
            </div>
            {invite && (
              <div className="flex items-center gap-2 p-2.5 rounded-2xl surface-sunken">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{invite.label}</p>
                  <p className="font-semibold text-sm truncate tnum">{invite.value}</p>
                </div>
                <button
                  onClick={copyInvite}
                  className="press grid place-items-center h-9 w-9 rounded-lg text-faint hover:text-brand-600 shrink-0"
                  aria-label="Sao chép"
                >
                  <Copy size={16} />
                </button>
              </div>
            )}
            <p className="text-xs text-faint">
              Chia sẻ link/mã để người khác tham gia. Link “nhận thành viên” gắn người dùng vào đúng tên ảo.
            </p>
          </section>
        )}

        {/* Cách quyết toán */}
        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold text-muted">Cách quyết toán</h3>
          <Segmented<SettlementMethod>
            value={group.settlementMethod}
            onChange={isOwner ? setMethod : () => {}}
            options={[
              { value: 'smart_settle', label: 'Thông minh' },
              { value: 'maximize_reduction', label: 'Tối thiểu lượt' },
            ]}
          />
          <p className="text-xs text-faint">
            “Thông minh” ghép nợ trực tiếp; “Tối thiểu lượt” gom cụm để giảm số lần chuyển.
          </p>
        </section>

        {/* Báo cáo */}
        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold text-muted">Báo cáo</h3>
          <Button fullWidth variant="secondary" onClick={exportReport}>
            <Download size={16} /> Xuất báo cáo PDF (kèm chứng từ)
          </Button>
          <p className="text-xs text-faint">
            Mở cửa sổ in để lưu PDF. Ảnh chứng từ được nhúng; file PDF chứng từ được liệt kê theo khoản chi.
          </p>
        </section>

        {/* Vùng nguy hiểm */}
        <section className="pt-1">
          {isOwner ? (
            <>
              <button
                onClick={deleteGroup}
                className="press w-full flex items-center justify-center gap-2 h-11 rounded-xl text-neg font-semibold text-sm hover:bg-neg/10 transition"
              >
                <Trash2 size={16} /> Xoá nhóm này
              </button>
              {isCloud && (
                <p className="mt-2 text-xs text-faint text-center">
                  Muốn rời nhưng giữ nhóm? Mở một thành viên đã có tài khoản → “Chuyển quyền chủ
                  nhóm”, sau đó bạn mới có thể rời.
                </p>
              )}
            </>
          ) : isCloud ? (
            <button
              onClick={leave}
              className="press w-full flex items-center justify-center gap-2 h-11 rounded-xl text-neg font-semibold text-sm hover:bg-neg/10 transition"
            >
              <LogOut size={16} /> Rời nhóm
            </button>
          ) : null}
        </section>
      </div>

      <MemberSheet group={group} member={editingMember} onClose={() => setEditingMember(null)} />
    </Sheet>
  )
}
