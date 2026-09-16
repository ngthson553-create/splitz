import { useRef, useState, type ChangeEvent } from 'react'
import { QrCode, Loader2 } from 'lucide-react'
import jsQR from 'jsqr'
import { Field, Input } from './ui'
import { BANK_GROUPS, parseVietQR } from '../lib/settlement/vietqr'

export type BankValue = {
  bankCode: string
  accountNumber: string
  accountName: string
}

/**
 * Khối nhập thông tin ngân hàng dùng chung (onboarding + sửa hồ sơ + thành viên).
 * Có nút "Quét QR" đọc ảnh QR ngân hàng (client-side, FREE) tự điền BIN + số TK.
 */
export function BankFields({
  value,
  onChange,
  onScanError,
}: {
  value: BankValue
  onChange: (next: BankValue) => void
  onScanError?: (message: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)

  async function onPickQr(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng ảnh
    if (!file) return
    setScanning(true)
    try {
      const decoded = await decodeQrFromFile(file)
      if (!decoded) {
        onScanError?.('Không đọc được mã QR trong ảnh. Thử ảnh rõ hơn.')
        return
      }
      const parsed = parseVietQR(decoded)
      if (!parsed) {
        onScanError?.('Đây không phải mã QR ngân hàng VietQR hợp lệ.')
        return
      }
      onChange({
        ...value,
        bankCode: parsed.bankCode ?? value.bankCode,
        accountNumber: parsed.accountNumber,
      })
      if (!parsed.bankCode) {
        onScanError?.('Đã điền số tài khoản. Không nhận diện được ngân hàng — chọn thủ công.')
      }
    } catch {
      onScanError?.('Lỗi khi quét QR. Thử lại.')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="Ngân hàng">
            <select
              value={value.bankCode}
              onChange={(e) => onChange({ ...value, bankCode: e.target.value })}
              className="w-full h-11 px-3.5 rounded-xl text-app surface-sunken border border-[var(--border)] focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30 outline-none transition"
            >
              <option value="">Chọn ngân hàng</option>
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
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          className="press h-11 px-3.5 rounded-xl inline-flex items-center gap-2 font-semibold bg-[var(--surface-solid)] border border-[var(--border-strong)] text-app shadow-soft hover:border-brand-400/40 disabled:opacity-50"
        >
          {scanning ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
          <span className="text-sm">Quét QR</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPickQr}
        />
      </div>

      <Field label="Số tài khoản">
        <Input
          inputMode="numeric"
          value={value.accountNumber}
          onChange={(e) => onChange({ ...value, accountNumber: e.target.value.replace(/\s/g, '') })}
          placeholder="VD: 0123456789"
        />
      </Field>

      <Field label="Tên chủ tài khoản" hint="Viết IN HOA không dấu để khớp mã QR chuyển khoản.">
        <Input
          value={value.accountName}
          onChange={(e) => onChange({ ...value, accountName: e.target.value })}
          placeholder="VD: NGUYEN VAN A"
        />
      </Field>
    </div>
  )
}

/** Giải mã QR từ file ảnh bằng canvas + jsQR. */
async function decodeQrFromFile(file: File): Promise<string | null> {
  const img = await loadImageFile(file)
  const maxDim = 1024
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)
  const result = jsQR(data, w, h)
  return result?.data ?? null
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'))
    reader.readAsDataURL(file)
  })
}

async function loadImageFile(file: File): Promise<HTMLImageElement> {
  const tryDataUrl = async () => loadImage(await readAsDataUrl(file))

  if (typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(file)
    try {
      return await loadImage(url)
    } catch {
      return await tryDataUrl()
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return tryDataUrl()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Không tải được ảnh.'))
    img.src = src
  })
}
