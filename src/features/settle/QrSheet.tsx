import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Landmark, Loader2, Paperclip, TriangleAlert } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { uploadSettlementProof } from '../../lib/data/attachments'
import { errorMessage } from '../../lib/data/errors'
import { formatVnd } from '../../lib/format'
import { bankDisplayName, generateVietQR } from '../../lib/settlement/vietqr'
import { useStore } from '../../lib/store'
import { trackEvent } from '../../lib/analytics'
import type { Group, SettlementTransfer } from '../../lib/types'

const MAX_PROOF_BYTES = 10 * 1024 * 1024

export function QrSheet({
  group,
  transfer,
  onClose,
}: {
  group: Group
  transfer: SettlementTransfer | null
  onClose: () => void
}) {
  const { createSettlement, reload } = useStore()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState<'paid' | 'proof' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const open = Boolean(transfer)
  const from = transfer ? group.members.find((m) => m.id === transfer.fromMemberId) : null
  const to = transfer ? group.members.find((m) => m.id === transfer.toMemberId) : null

  const hasBank = Boolean(to?.bankCode && to?.bankAccountNumber)
  const canMarkPaid = Boolean(transfer && hasBank)

  useEffect(() => {
    if (transfer) {
      trackEvent('settlement_qr_viewed', { has_bank: hasBank, amount_vnd: transfer.amount })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer?.fromMemberId, transfer?.toMemberId, transfer?.amount])

  const qr = useMemo(() => {
    if (!transfer || !to || !hasBank) return ''
    return generateVietQR({
      bankBin: to.bankCode!,
      accountNumber: to.bankAccountNumber!,
      amount: transfer.amount,
      content: `Splitz ${group.name} ${from?.name ?? ''}`.slice(0, 40),
    })
  }, [transfer, to, from, hasBank, group.name])

  async function copyAccount() {
    if (!to?.bankAccountNumber) return
    try {
      await navigator.clipboard.writeText(to.bankAccountNumber)
      setCopied(true)
      toast.success('Đã sao chép số tài khoản')
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Không sao chép được')
    }
  }

  async function markPaid() {
    if (!transfer) return
    if (!hasBank) {
      toast.error('Chưa tạo được QR cho khoản này. Hãy thanh toán cách khác và đính kèm chứng từ.')
      return
    }
    setBusy('paid')
    try {
      await createSettlement(group.id, transfer.fromMemberId, transfer.toMemberId, transfer.amount)
      trackEvent('settlement_marked_paid', { amount_vnd: transfer.amount, method: 'bank_transfer' })
      toast.success('Đã ghi nhận. Chờ người nhận xác nhận.')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e, 'Không ghi nhận được.'))
    } finally {
      setBusy(null)
    }
  }

  async function onPickProof(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!transfer || !file) return
    if (file.size > MAX_PROOF_BYTES) {
      toast.error('Chứng từ vượt 10MB.')
      return
    }

    setBusy('proof')
    let settlementId: string | null = null
    try {
      settlementId = await createSettlement(group.id, transfer.fromMemberId, transfer.toMemberId, transfer.amount)
      await uploadSettlementProof(group.id, settlementId, file)
      void reload()
      trackEvent('settlement_proof_uploaded', { amount_vnd: transfer.amount, mime: file.type || 'unknown' })
      toast.success('Đã ghi nhận kèm chứng từ. Chờ người nhận xác nhận.')
      onClose()
    } catch (e) {
      if (settlementId) {
        void reload()
        toast.error('Đã ghi nhận chuyển tiền nhưng chưa đính kèm được chứng từ.')
        onClose()
      } else {
        toast.error(errorMessage(e, 'Không tải được chứng từ thanh toán.'))
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Thanh toán khoản nợ"
      footer={
        transfer ? (
          <div className="space-y-2">
            <Button fullWidth onClick={() => void markPaid()} disabled={busy !== null || !canMarkPaid}>
              {busy === 'paid' ? <Loader2 size={16} className="animate-spin" /> : null}
              Tôi đã chuyển
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
            >
              {busy === 'proof' ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
              Thanh toán cách khác + chứng từ
            </Button>
          </div>
        ) : undefined
      }
    >
      {transfer && to && (
        <div className="space-y-4 py-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={onPickProof}
          />
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex flex-col items-center gap-1">
              <Avatar name={from?.name ?? '?'} color={from?.color} size="sm" />
              <span className="font-semibold text-xs">{from?.name}</span>
            </div>
            <span className="text-faint">→</span>
            <div className="flex flex-col items-center gap-1">
              <Avatar name={to.name} color={to.color} size="sm" />
              <span className="font-semibold text-xs">{to.name}</span>
            </div>
          </div>

          <p className="text-center text-2xl font-extrabold tnum text-gradient">{formatVnd(transfer.amount)}</p>

          {hasBank ? (
            <>
              <div className="flex justify-center">
                <div className="p-3 rounded-2xl bg-white shadow-glow">
                  <QRCodeSVG value={qr} size={180} level="M" marginSize={0} />
                </div>
              </div>
              <div className="card p-3 space-y-1.5 text-sm">
                <Row label="Ngân hàng" value={bankDisplayName(to.bankCode)} icon={<Landmark size={14} />} />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Số tài khoản</span>
                  <button onClick={copyAccount} className="press inline-flex items-center gap-1.5 font-semibold text-app tnum">
                    {to.bankAccountNumber}
                    {copied ? <Check size={14} className="text-pos" /> : <Copy size={14} className="text-faint" />}
                  </button>
                </div>
                {to.bankAccountName && <Row label="Chủ tài khoản" value={to.bankAccountName} />}
              </div>
              <p className="text-xs text-faint text-center px-2">
                Mở app ngân hàng, quét QR và <b>kiểm tra tên người nhận</b> trước khi xác nhận chuyển.
              </p>
              <p className="text-xs text-faint text-center px-2">
                Nếu bạn đã thanh toán bằng tiền mặt, app khác hoặc gửi ảnh biên lai, hãy dùng nút
                chứng từ bên dưới để người nhận xác nhận dễ hơn.
              </p>
            </>
          ) : (
            <div className="card p-5 text-center space-y-3">
              <div className="grid place-items-center h-12 w-12 mx-auto rounded-2xl bg-neg/12 text-neg">
                <TriangleAlert size={22} />
              </div>
              <p className="text-sm text-muted">
                <b className="text-app">{to.name}</b> chưa có tài khoản nhận tiền. Thêm thông tin ngân hàng trong Cài đặt nhóm để tạo QR.
              </p>
              <p className="text-xs text-faint">
                Bạn vẫn có thể thanh toán cách khác và đính kèm chứng từ ở nút bên dưới.
              </p>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-app text-right tnum">{value}</span>
    </div>
  )
}
