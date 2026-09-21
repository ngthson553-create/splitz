import type { JSX } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Coins, Euro, IndianRupee, Landmark, Link2, Smartphone } from 'lucide-react'
import { BankFields } from './BankFields'
import { Field, Input } from './ui'
import { useT, type Dict } from '../lib/i18n'
import type { PaymentRail } from '../lib/types'

export type NonVietqrRail = Exclude<PaymentRail, 'vietqr'>

/**
 * Giá trị của khối chọn phương thức nhận tiền: VietQR dùng tiếp 3 field bank*
 * (tương thích dữ liệu cũ), các rail khác gọn trong paymentData.
 */
export type PaymentMethodValue = {
  bankCode: string
  bankAccountNumber: string
  bankAccountName: string
  paymentRail?: NonVietqrRail
  paymentData?: Record<string, string>
}

// Cấu hình selector: icon + cách lấy tên/hint từ từ điển cho từng rail.
const RAILS: Array<{
  rail: PaymentRail
  icon: LucideIcon
  label: (p: Dict['payments']) => string
  hint: (p: Dict['payments']) => string
}> = [
  { rail: 'vietqr', icon: Landmark, label: (p) => p.railVietqr, hint: (p) => p.railVietqrHint },
  { rail: 'sepa', icon: Euro, label: (p) => p.railSepa, hint: (p) => p.railSepaHint },
  { rail: 'upi', icon: IndianRupee, label: (p) => p.railUpi, hint: (p) => p.railUpiHint },
  { rail: 'promptpay', icon: Smartphone, label: (p) => p.railPromptpay, hint: (p) => p.railPromptpayHint },
  { rail: 'pix', icon: Coins, label: (p) => p.railPix, hint: (p) => p.railPixHint },
  { rail: 'handle', icon: Link2, label: (p) => p.railHandle, hint: (p) => p.railHandleHint },
]

/** Rail đang hiệu lực: paymentRail nếu có, ngược lại mặc định VietQR (người dùng VN cũ không thấy gì đổi). */
function effectiveRail(value: PaymentMethodValue): PaymentRail {
  return value.paymentRail ?? 'vietqr'
}

/**
 * Khối chọn phương thức nhận tiền đa quốc gia (onboarding + cài đặt + thành viên).
 * Mặc định VietQR tái dụng BankFields nguyên trạng; các rail khác (SEPA/UPI/
 * PromptPay/Pix/handle) gọn trong paymentData. Đổi rail luôn xoá dữ liệu của
 * rail cũ để không bao giờ có dữ liệu lai giữa hai phương thức.
 */
export function PaymentMethodFields({
  value,
  onChange,
  onScanError,
}: {
  value: PaymentMethodValue
  onChange: (next: PaymentMethodValue) => void
  onScanError?: (msg: string) => void
}): JSX.Element {
  const t = useT()
  const pays = t.payments
  const rail = effectiveRail(value)
  const data = value.paymentData ?? {}

  // Đổi rail: rời VietQR thì xoá 3 field bank*, sang VietQR thì xoá paymentData cũ.
  function switchRail(next: PaymentRail) {
    if (next === rail) return
    if (next === 'vietqr') {
      onChange({ ...value, paymentRail: undefined, paymentData: undefined })
    } else {
      onChange({
        ...value,
        bankCode: '',
        bankAccountNumber: '',
        bankAccountName: '',
        paymentRail: next,
        paymentData: {},
      })
    }
  }

  // Ghi một phần paymentData, giữ nguyên các key còn lại.
  function patchData(patch: Record<string, string>) {
    onChange({ ...value, paymentData: { ...data, ...patch } })
  }

  // Bắc cầu giữa kiểu BankValue (accountNumber/accountName) và PaymentMethodValue.
  function setBank(next: { bankCode: string; accountNumber: string; accountName: string }) {
    onChange({
      ...value,
      bankCode: next.bankCode,
      bankAccountNumber: next.accountNumber,
      bankAccountName: next.accountName,
    })
  }

  return (
    <div className="space-y-3">
      {/* Selector 6 rail: grid 2 cột, rail đang chọn viền brand */}
      <div className="space-y-1.5">
        <span className="block text-[13px] font-semibold text-muted">{pays.methodLabel}</span>
        <div role="radiogroup" aria-label={pays.methodLabel} className="grid grid-cols-2 gap-2">
          {RAILS.map(({ rail: r, icon: Icon, label, hint }) => {
            const active = r === rail
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={label(pays)}
                onClick={() => switchRail(r)}
                className={`press rounded-2xl p-3 border text-left transition bg-[var(--surface-solid)] ${
                  active ? 'border-brand-400 ring-2 ring-brand-400/30' : 'border-[var(--border)]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Icon size={16} className={active ? 'text-brand-600 dark:text-brand-300' : 'text-muted'} />
                  <span className="text-[13px] font-bold leading-tight text-app">{label(pays)}</span>
                </span>
                <span className="mt-1 block text-[11px] text-faint leading-snug">{hint(pays)}</span>
              </button>
            )
          })}
        </div>
        <span className="block text-xs text-faint">{pays.methodHint}</span>
      </div>

      {/* Field theo rail đang chọn */}
      {rail === 'vietqr' && (
        <BankFields
          value={{
            bankCode: value.bankCode,
            accountNumber: value.bankAccountNumber,
            accountName: value.bankAccountName,
          }}
          onChange={setBank}
          onScanError={onScanError}
        />
      )}

      {rail === 'sepa' && (
        <>
          <Field label={pays.ibanLabel}>
            <Input
              value={data.iban ?? ''}
              onChange={(e) => patchData({ iban: e.target.value.toUpperCase() })}
              placeholder={pays.ibanPlaceholder}
              autoComplete="off"
            />
          </Field>
          <Field label={pays.bicLabel}>
            <Input
              value={data.bic ?? ''}
              onChange={(e) => patchData({ bic: e.target.value.toUpperCase() })}
              placeholder={pays.bicPlaceholder}
              autoComplete="off"
            />
          </Field>
          <NameOnAccountField value={data.name ?? ''} onChange={(v) => patchData({ name: v })} />
        </>
      )}

      {rail === 'upi' && (
        <>
          <Field label={pays.vpaLabel}>
            <Input
              value={data.vpa ?? ''}
              onChange={(e) => patchData({ vpa: e.target.value })}
              placeholder={pays.vpaPlaceholder}
              inputMode="email"
              autoComplete="off"
            />
          </Field>
          <NameOnAccountField value={data.name ?? ''} onChange={(v) => patchData({ name: v })} />
        </>
      )}

      {rail === 'promptpay' && (
        <>
          <Field label={pays.promptpayProxyType}>
            <div role="radiogroup" aria-label={pays.promptpayProxyType} className="grid grid-cols-2 gap-2">
              {(['phone', 'nationalId'] as const).map((pt) => {
                const active = (data.proxyType ?? 'phone') === pt
                return (
                  <button
                    key={pt}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={pt === 'phone' ? pays.promptpayPhone : pays.promptpayNationalId}
                    onClick={() => patchData({ proxyType: pt })}
                    className={`press h-11 rounded-xl border font-semibold text-sm transition bg-[var(--surface-solid)] ${
                      active ? 'border-brand-400 ring-2 ring-brand-400/30 text-app' : 'border-[var(--border)] text-muted'
                    }`}
                  >
                    {pt === 'phone' ? pays.promptpayPhone : pays.promptpayNationalId}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label={pays.promptpayValueLabel}>
            <Input
              value={data.proxyValue ?? ''}
              onChange={(e) => patchData({ proxyValue: e.target.value })}
              placeholder={pays.promptpayPlaceholder}
              autoComplete="off"
            />
          </Field>
        </>
      )}

      {rail === 'pix' && (
        <>
          <Field label={pays.pixKeyLabel}>
            <Input
              value={data.pixKey ?? ''}
              onChange={(e) => patchData({ pixKey: e.target.value })}
              placeholder={pays.pixKeyPlaceholder}
              autoComplete="off"
            />
          </Field>
          <Field label={pays.pixCityLabel}>
            <Input
              value={data.city ?? ''}
              onChange={(e) => patchData({ city: e.target.value.toUpperCase() })}
              placeholder={pays.pixCityPlaceholder}
              autoComplete="off"
            />
          </Field>
          <NameOnAccountField value={data.name ?? ''} onChange={(v) => patchData({ name: v })} />
        </>
      )}

      {rail === 'handle' && (
        <>
          <Field label={pays.handleLabelField}>
            <Input
              value={data.label ?? ''}
              onChange={(e) => patchData({ label: e.target.value })}
              placeholder={pays.handleLabelPlaceholder}
              autoComplete="off"
            />
          </Field>
          <Field label={pays.handleValueField} hint={pays.handleHint}>
            <Input
              value={data.value ?? ''}
              onChange={(e) => patchData({ value: e.target.value })}
              placeholder={pays.handleValuePlaceholder}
              autoComplete="off"
            />
          </Field>
        </>
      )}
    </div>
  )
}

/** Field "Tên chủ tài khoản" dùng chung cho SEPA / UPI / Pix (ghi vào paymentData.name). */
function NameOnAccountField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT()
  return (
    <Field label={t.payments.nameOnAccount}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.payments.nameOnAccountPlaceholder}
        autoComplete="off"
      />
    </Field>
  )
}

/**
 * Đã đủ thông tin để sinh QR cho rail hiện tại chưa?
 * - vietqr: đủ ngân hàng + số TK + tên chủ TK
 * - sepa: IBAN có ≥16 ký tự chữ/số
 * - upi: khớp dạng ten@nhacungcap
 * - promptpay: định danh có từ 9 chữ số trở lên
 * - pix / handle: key / value không rỗng
 */
export function isPaymentMethodComplete(value: PaymentMethodValue): boolean {
  const rail = effectiveRail(value)
  const d = value.paymentData ?? {}
  // Record<string,string> có thể thiếu key lúc runtime → luôn đọc defensive.
  const v = (k: string): string => d[k] ?? ''
  switch (rail) {
    case 'vietqr':
      return Boolean(value.bankCode && value.bankAccountNumber.trim() && value.bankAccountName.trim())
    case 'sepa':
      return v('iban').replace(/[^a-zA-Z0-9]/g, '').length >= 16
    case 'upi':
      return /^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(v('vpa').trim())
    case 'promptpay':
      return v('proxyValue').replace(/\D/g, '').length >= 9
    case 'pix':
      return v('pixKey').trim().length > 0
    case 'handle':
      return v('value').trim().length > 0
  }
}
