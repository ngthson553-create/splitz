import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, ExternalLink, Landmark, Loader2, Paperclip, TriangleAlert } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { uploadSettlementProof } from '../../lib/data/attachments'
import { errorMessage } from '../../lib/data/errors'
import { formatVnd } from '../../lib/format'
import { bankDisplayName, generateVietQR } from '../../lib/settlement/vietqr'
import { resolveMemberPayment } from '../../lib/settlement/paymentQr'
import { useT } from '../../lib/i18n'
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
  const t = useT()
  const [copiedValue, setCopiedValue] = useState<string | null>(null)
  const [busy, setBusy] = useState<'paid' | 'proof' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const open = Boolean(transfer)
  const from = transfer ? group.members.find((m) => m.id === transfer.fromMemberId) : null
  const to = transfer ? group.members.find((m) => m.id === transfer.toMemberId) : null

  // Phương thức nhận tiền của người NHẬN — quyết định rail + payload QR.
  const pay = transfer && to ? resolveMemberPayment(to) : null
  // Mọi rail đều cho đánh dấu "đã chuyển" — handle không QR vẫn chuyển ngoài app.
  const canMarkPaid = Boolean(transfer && pay)

  useEffect(() => {
    if (transfer) {
      trackEvent('settlement_qr_viewed', {
        has_bank: pay?.rail === 'vietqr',
        rail: pay?.rail ?? 'none',
        amount_vnd: transfer.amount,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer?.fromMemberId, transfer?.toMemberId, transfer?.amount])

  const qr = useMemo(() => {
    if (!transfer || !to || !pay) return ''
    // Các rail ngoài VietQR đã có sẵn payload chuỗi (EPC, upi://, EMVCo, URL).
    if (pay.rail !== 'vietqr') return pay.payload ?? ''
    // Đường cũ: VietQR tự dựng kèm số tiền VND + nội dung chuyển khoản.
    return generateVietQR({
      bankBin: pay.bankCode,
      accountNumber: pay.accountNumber,
      amount: transfer.amount,
      content: `Splitz ${group.name} ${from?.name ?? ''}`.slice(0, 40),
    })
  }, [transfer, to, pay, from, group.name])

  async function copyText(value: string, copiedToast: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedValue(value)
      toast.success(copiedToast)
      window.setTimeout(() => setCopiedValue((cur) => (cur === value ? null : cur)), 1500)
    } catch {
      toast.error(t.group.copyError)
    }
  }

  function openHandleLink() {
    if (pay?.rail !== 'handle' || !pay.payload) return
    window.open(pay.payload, '_blank', 'noopener,noreferrer')
  }

  async function markPaid() {
    if (!transfer) return
    if (!pay) {
      toast.error(t.group.qrUnavailableToast)
      return
    }
    setBusy('paid')
    try {
      await createSettlement(group.id, transfer.fromMemberId, transfer.toMemberId, transfer.amount)
      trackEvent('settlement_marked_paid', { amount_vnd: transfer.amount, method: 'bank_transfer' })
      toast.success(t.group.markedPaidToast)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e, t.group.markPaidError))
    } finally {
      setBusy(null)
    }
  }

  async function onPickProof(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!transfer || !file) return
    if (file.size > MAX_PROOF_BYTES) {
      toast.error(t.group.proofTooLarge)
      return
    }

    setBusy('proof')
    let settlementId: string | null = null
    try {
      settlementId = await createSettlement(group.id, transfer.fromMemberId, transfer.toMemberId, transfer.amount)
      await uploadSettlementProof(group.id, settlementId, file)
      void reload()
      trackEvent('settlement_proof_uploaded', { amount_vnd: transfer.amount, mime: file.type || 'unknown' })
      toast.success(t.group.proofUploadedToast)
      onClose()
    } catch (e) {
      if (settlementId) {
        void reload()
        toast.error(t.group.proofFailedToast)
        onClose()
      } else {
        toast.error(errorMessage(e, t.group.proofUploadError))
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.group.qrSheetTitle}
      footer={
        transfer ? (
          <div className="space-y-2">
            <Button fullWidth onClick={() => void markPaid()} disabled={busy !== null || !canMarkPaid}>
              {busy === 'paid' ? <Loader2 size={16} className="animate-spin" /> : null}
              {t.group.iHavePaid}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
            >
              {busy === 'proof' ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
              {t.group.payOtherWay}
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

          {pay && qr ? (
            <>
              <div className="flex justify-center">
                <div className="p-3 rounded-2xl bg-white shadow-glow">
                  <QRCodeSVG value={qr} size={180} level="M" marginSize={0} />
                </div>
              </div>
              <div className="card p-3 space-y-1.5 text-sm">
                {pay.rail === 'vietqr' && (
                  <>
                    <Row label={t.group.bankLabel} value={bankDisplayName(pay.bankCode)} icon={<Landmark size={14} />} />
                    <CopyRow
                      label={t.group.accountNumberLabel}
                      value={pay.accountNumber}
                      copied={copiedValue === pay.accountNumber}
                      onCopy={() => void copyText(pay.accountNumber, t.group.accountCopiedToast)}
                    />
                    {pay.accountName && <Row label={t.group.accountHolder} value={pay.accountName} />}
                  </>
                )}
                {pay.rail === 'sepa' && (
                  <>
                    <CopyRow
                      label={t.payments.ibanLabel}
                      value={pay.iban}
                      copied={copiedValue === pay.iban}
                      onCopy={() => void copyText(pay.iban, t.common.copied)}
                    />
                    <Row label={t.payments.nameOnAccount} value={pay.name} />
                    {pay.bic && <Row label={t.payments.bicShort} value={pay.bic} />}
                  </>
                )}
                {pay.rail === 'upi' && (
                  <>
                    <CopyRow
                      label={t.payments.vpaLabel}
                      value={pay.vpa}
                      copied={copiedValue === pay.vpa}
                      onCopy={() => void copyText(pay.vpa, t.common.copied)}
                    />
                    <Row label={t.payments.nameOnAccount} value={pay.name} />
                  </>
                )}
                {pay.rail === 'promptpay' && (
                  <>
                    <CopyRow
                      label={t.payments.promptpayValueLabel}
                      value={pay.proxyValue}
                      copied={copiedValue === pay.proxyValue}
                      onCopy={() => void copyText(pay.proxyValue, t.common.copied)}
                    />
                    <Row
                      label={pay.proxyType === 'phone' ? t.payments.proxyPhone : t.payments.proxyNationalId}
                      value={pay.proxyValue}
                    />
                  </>
                )}
                {pay.rail === 'pix' && (
                  <>
                    <CopyRow
                      label={t.payments.pixKeyLabel}
                      value={pay.pixKey}
                      copied={copiedValue === pay.pixKey}
                      onCopy={() => void copyText(pay.pixKey, t.common.copied)}
                    />
                    <Row label={t.payments.nameOnAccount} value={pay.name} />
                  </>
                )}
                {pay.rail === 'handle' && (
                  <>
                    <CopyRow
                      label={pay.label || t.payments.handleValueField}
                      value={pay.value}
                      copied={copiedValue === pay.value}
                      onCopy={() => void copyText(pay.value, t.common.copied)}
                    />
                    {pay.payload && (
                      <button
                        onClick={openHandleLink}
                        className="press flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] py-2 font-semibold text-app"
                      >
                        <ExternalLink size={14} />
                        {t.payments.openLink}
                      </button>
                    )}
                  </>
                )}
              </div>
              {/* Rail ngoài VietQR là QR static không nhúng số tiền — người trả tự nhập */}
              {pay.rail !== 'vietqr' && (
                <p className="text-xs text-faint text-center px-2">{t.payments.amountNotInQr}</p>
              )}
              {pay.rail === 'vietqr' && (
                <>
                  <p className="text-xs text-faint text-center px-2">
                    {t.group.qrHintStart}
                    <b>{t.group.qrHintHighlight}</b>
                    {t.group.qrHintEnd}
                  </p>
                  <p className="text-xs text-faint text-center px-2">
                    {t.group.altPaymentHint}
                  </p>
                </>
              )}
            </>
          ) : (
            <div className="card p-5 text-center space-y-3">
              <div className="grid place-items-center h-12 w-12 mx-auto rounded-2xl bg-neg/12 text-neg">
                <TriangleAlert size={22} />
              </div>
              <p className="text-sm text-muted">
                <b className="text-app">{to.name}</b>
                {t.group.noBankHint}
              </p>
              {/* Handle dạng text thuần: không QR được nhưng vẫn copy để chuyển ngoài app */}
              {pay?.rail === 'handle' && (
                <CopyRow
                  label={pay.label || t.payments.handleValueField}
                  value={pay.value}
                  copied={copiedValue === pay.value}
                  onCopy={() => void copyText(pay.value, t.common.copied)}
                />
              )}
              <p className="text-xs text-faint">
                {t.group.altPaymentStillHint}
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

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <button onClick={onCopy} className="press inline-flex items-center gap-1.5 font-semibold text-app tnum">
        {value}
        {copied ? <Check size={14} className="text-pos" /> : <Copy size={14} className="text-faint" />}
      </button>
    </div>
  )
}
