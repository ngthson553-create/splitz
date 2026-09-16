import { useEffect, useState } from 'react'
import { Crown, ShieldCheck } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button, Field, Input } from '../../components/ui'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useConfirm } from '../../components/ConfirmDialog'
import { useToast } from '../../components/Toast'
import { BANK_GROUPS, bankDisplayName } from '../../lib/settlement/vietqr'
import type { Group, Member } from '../../lib/types'

export function MemberSheet({
  group,
  member,
  onClose,
}: {
  group: Group
  member: Member | null
  onClose: () => void
}) {
  const { updateGroup, transferOwnership, mode } = useStore()
  const { profile } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()

  const [name, setName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')

  useEffect(() => {
    if (member) {
      setName(member.name)
      setBankCode(member.bankCode ?? '')
      setAccountNumber(member.bankAccountNumber ?? '')
      setAccountName(member.bankAccountName ?? '')
    }
  }, [member])

  if (!member) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const isCloud = mode === 'cloud'
  // Thành viên "thật" (đã liên kết tài khoản) tự quản STK của họ — owner không sửa.
  const isReal = isCloud && Boolean(member.userId)
  const isMe = isCloud && member.userId === profile?.id
  const isOwner = !isCloud || group.ownerId === profile?.id
  const hasBank = Boolean(member.bankCode && member.bankAccountNumber)

  async function save() {
    await updateGroup(group.id, (g) => ({
      ...g,
      members: g.members.map((m) =>
        m.id === member!.id
          ? isReal
            ? { ...m, name: name.trim() || m.name } // thật: chỉ đổi tên hiển thị, GIỮ STK
            : {
                ...m,
                name: name.trim() || m.name,
                bankCode: bankCode || undefined,
                bankAccountNumber: accountNumber.trim() || undefined,
                bankAccountName: accountName.trim() || undefined,
              }
          : m,
      ),
    }))
    onClose()
  }

  async function doTransfer() {
    const ok = await confirm({
      title: `Chuyển quyền cho ${member!.name}?`,
      description:
        'Người này sẽ trở thành chủ nhóm (sửa/xoá nhóm, quản lý thành viên). Bạn sẽ trở thành thành viên thường.',
      confirmLabel: 'Chuyển quyền',
      danger: true,
    })
    if (!ok) return
    try {
      await transferOwnership(group.id, member!.id)
      toast.success('Đã chuyển quyền chủ nhóm')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không chuyển được quyền.')
    }
  }

  return (
    <Sheet
      open={Boolean(member)}
      onClose={onClose}
      title="Thông tin thành viên"
      footer={
        <Button fullWidth size="lg" onClick={save}>
          Lưu
        </Button>
      }
    >
      <div className="space-y-5 py-1">
        <div className="flex flex-col items-center gap-2 pt-2">
          <Avatar name={name || '?'} color={member.color} src={member.avatarUrl} size="lg" />
          {member.role === 'owner' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
              <Crown size={13} /> Chủ nhóm
            </span>
          )}
          {isReal && member.role !== 'owner' && (
            <span className="text-xs text-muted">{isMe ? 'Bạn' : 'Đã có tài khoản Splitz'}</span>
          )}
        </div>

        <Field label="Tên">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên thành viên" />
        </Field>

        {isReal ? (
          // STK của thành viên thật — chỉ hiển thị, do họ tự quản.
          <div className="pt-1">
            <p className="text-sm font-semibold text-muted mb-1">Tài khoản nhận tiền</p>
            <div className="flex items-start gap-2.5 p-3 rounded-2xl surface-sunken">
              <ShieldCheck size={18} className="text-brand-600 dark:text-brand-300 mt-0.5 shrink-0" />
              <div className="text-sm">
                {hasBank ? (
                  <p className="font-semibold">
                    {bankDisplayName(member.bankCode)} · {member.bankAccountNumber}
                  </p>
                ) : (
                  <p className="text-muted">Chưa cấu hình</p>
                )}
                <p className="text-xs text-faint mt-0.5">
                  Thành viên tự quản tài khoản của họ trong phần Cài đặt cá nhân.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Thành viên ảo — owner nhập STK hộ để tạo QR.
          <div className="pt-1">
            <p className="text-sm font-semibold text-muted mb-1">Tài khoản nhận tiền (để tạo QR)</p>
            <div className="space-y-3">
              <Field label="Ngân hàng">
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full h-12 px-4 rounded-2xl text-app surface-sunken border border-[var(--border)] focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 outline-none"
                >
                  <option value="">— Chọn ngân hàng —</option>
                  {BANK_GROUPS.map((grp) => (
                    <optgroup key={grp.label} label={grp.label}>
                      {grp.banks.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </Field>

              <Field label="Số tài khoản">
                <Input
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="VD: 0123456789"
                />
              </Field>

              <Field label="Tên chủ tài khoản" hint="Viết không dấu, đúng như trên app ngân hàng.">
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                />
              </Field>
            </div>
          </div>
        )}

        {/* Phân quyền: chuyển quyền chủ nhóm cho thành viên thật khác */}
        {isOwner && isReal && !isMe && (
          <div className="pt-1">
            <p className="text-sm font-semibold text-muted mb-1">Phân quyền</p>
            <Button fullWidth variant="secondary" onClick={doTransfer}>
              <Crown size={16} /> Chuyển quyền chủ nhóm
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
