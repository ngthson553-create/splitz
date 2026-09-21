import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button, Field, Input } from '../../components/ui'
import { PaymentMethodFields, type PaymentMethodValue } from '../../components/PaymentMethodFields'
import { useStore } from '../../lib/store'
import { useAuth } from '../../lib/auth'
import { useT } from '../../lib/i18n'
import { useConfirm } from '../../components/ConfirmDialog'
import { useToast } from '../../components/Toast'
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
  const t = useT()

  const [name, setName] = useState('')
  const [payout, setPayout] = useState<PaymentMethodValue>({
    bankCode: '',
    bankAccountNumber: '',
    bankAccountName: '',
  })

  useEffect(() => {
    if (member) {
      setName(member.name)
      setPayout({
        bankCode: member.bankCode ?? '',
        bankAccountNumber: member.bankAccountNumber ?? '',
        bankAccountName: member.bankAccountName ?? '',
        paymentRail: member.paymentRail,
        paymentData: member.paymentData,
      })
    }
  }, [member])

  if (!member) return <Sheet open={false} onClose={onClose} title="">{null}</Sheet>

  const isCloud = mode === 'cloud'
  // Thành viên "thật" (đã liên kết tài khoản) hay thành viên ảo đều chỉnh được
  // phần tài khoản nhận tiền (owner có thể nhập/sửa hộ rail cho thành viên ảo).
  const isReal = isCloud && Boolean(member.userId)
  const isMe = isCloud && member.userId === profile?.id
  const isOwner = !isCloud || group.ownerId === profile?.id

  async function save() {
    await updateGroup(group.id, (g) => ({
      ...g,
      members: g.members.map((m) =>
        m.id === member!.id
          ? {
              ...m,
              name: name.trim() || m.name,
              bankCode: payout.bankCode || undefined,
              bankAccountNumber: payout.bankAccountNumber.trim() || undefined,
              bankAccountName: payout.bankAccountName.trim() || undefined,
              paymentRail: payout.paymentRail,
              paymentData: payout.paymentData,
            }
          : m,
      ),
    }))
    onClose()
  }

  async function doTransfer() {
    const ok = await confirm({
      title: t.group.transferOwnershipTitle({ name: member!.name }),
      description: t.group.transferOwnershipDesc,
      confirmLabel: t.group.transferOwnership,
      danger: true,
    })
    if (!ok) return
    try {
      await transferOwnership(group.id, member!.id)
      toast.success(t.group.ownershipTransferredToast)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.group.transferOwnershipError)
    }
  }

  return (
    <Sheet
      open={Boolean(member)}
      onClose={onClose}
      title={t.group.memberSheetTitle}
      footer={
        <Button fullWidth size="lg" onClick={save}>
          {t.common.save}
        </Button>
      }
    >
      <div className="space-y-5 py-1">
        <div className="flex flex-col items-center gap-2 pt-2">
          <Avatar name={name || '?'} color={member.color} src={member.avatarUrl} size="lg" />
          {member.role === 'owner' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
              <Crown size={13} /> {t.group.owner}
            </span>
          )}
          {isReal && member.role !== 'owner' && (
            <span className="text-xs text-muted">{isMe ? t.common.you : t.group.hasSplitzAccount}</span>
          )}
        </div>

        <Field label={t.group.memberNameLabel}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.group.memberNamePlaceholder} />
        </Field>

        {/* Tài khoản nhận tiền — cả thành viên ảo lẫn thật đều chỉnh được,
            PaymentMethodFields hỗ trợ đủ 6 rail (VietQR/SEPA/UPI/PromptPay/Pix/handle). */}
        <div className="pt-1">
          <p className="text-sm font-semibold text-muted mb-1">{t.group.payoutAccountQr}</p>
          <PaymentMethodFields value={payout} onChange={setPayout} onScanError={(m) => toast.error(m)} />
        </div>

        {/* Phân quyền: chuyển quyền chủ nhóm cho thành viên thật khác */}
        {isOwner && isReal && !isMe && (
          <div className="pt-1">
            <p className="text-sm font-semibold text-muted mb-1">{t.group.permissionsTitle}</p>
            <Button fullWidth variant="secondary" onClick={doTransfer}>
              <Crown size={16} /> {t.group.transferOwnershipFull}
            </Button>
          </div>
        )}
      </div>
    </Sheet>
  )
}
