/**
 * Sinh payload QR thanh toán theo chuẩn TỪNG THỊ TRƯỜNG — thuần client, offline.
 *
 * Triết lý giống VietQR: không gọi API ngoài, không trung gian — Splitz chỉ
 * "viết" thông tin người nhận vào đúng chuẩn quốc gia để app ngân hàng của
 * người trả tự mở với sẵn thông tin. Người dùng tự xác nhận đã chuyển.
 *
 * Số tiền: MỌI rail ngoài VietQR KHÔNG nhúng số tiền vào QR (để trống theo
 * chuẩn) — sổ cái đang base VND nên nhúng tiền ngoại tệ sẽ sai; người trả nhìn
 * số tiền trong app rồi tự nhập (các static QR chuẩn quốc gia đều hỗ trợ).
 *
 * Spec nguồn (xem docs/PAYMENTS.md):
 *  - EPC QR  — EPC069-12 v2.1 (SEPA Credit Transfer, EU)
 *  - UPI     — NPCI intent link upi://pay (Ấn Độ)
 *  - PromptPay — BOT QR standard, EMVCo TLV + CRC16-CCITT-FALSE (Thái)
 *  - Pix     — BCB BR Code Manual v2.0.0, EMVCo TLV + CRC16 (Brazil)
 */
import type { Member } from '../types'

// ── CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF) — dùng chung PromptPay & Pix ──
export function crc16Ccitt(input: string): string {
  let crc = 0xffff
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Một cặp TLV EMVCo: tag 2 chữ số + length 2 chữ số + value. */
function tlv(tag: string, value: string): string {
  return tag + String(value.length).padStart(2, '0') + value
}

/** Nối các TLV rồi tính CRC cho toàn payload (kèm 6304). */
function emvWithCRC(tlvs: string[]): string {
  const body = tlvs.join('') + '6304'
  return body + crc16Ccitt(body)
}

// ── PromptPay (Thái Lan) ─────────────────────────────────────────────────────
// Cấu trúc khớp từng byte thư viện chuẩn dtinth/promptpay-qr (đã verify bằng
// vector test chính thức): 00=01, 01=11 (static), 29={00:AID, 01/02:proxy},
// 58=TH, 53=764, 63=CRC. Lưu ý thứ tự 58 TRƯỚC 53 theo thư viện chuẩn.
export type PromptPayInput = { proxyType: 'phone' | 'nationalId'; proxyValue: string }

/** Chuẩn hoá số điện thoại Thái về dạng 0066xxxxxxxxx (13 số). */
function normalizeThaiPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0066')) return digits
  if (digits.startsWith('66')) return '00' + digits
  if (digits.startsWith('0')) return '0066' + digits.slice(1)
  return '0066' + digits // đã là dạng nội địa không số 0 — hiếm, giữ an toàn
}

export function buildPromptPay({ proxyType, proxyValue }: PromptPayInput): string {
  const proxy =
    proxyType === 'phone' ? normalizeThaiPhone(proxyValue) : proxyValue.replace(/\D/g, '')
  const subtag = proxyType === 'phone' ? '01' : '02'
  const merchant = tlv('00', 'A000000677010111') + tlv(subtag, proxy)
  return emvWithCRC([
    tlv('00', '01'),
    tlv('01', '11'), // static — người trả tự nhập số tiền
    tlv('29', merchant),
    tlv('58', 'TH'),
    tlv('53', '764'),
  ])
}

// ── Pix BR Code (Brazil) ─────────────────────────────────────────────────────
// Khớp ví dụ static trong BR Code Manual của Bacen (vector test: …63041D3D).
export type PixInput = { pixKey: string; name: string; city?: string }

/** Pix chỉ cho ASCII + số + khoảng trắng; bỏ dấu, giữ nguyên HOA/thường của tên
 *  (ví dụ manual dùng "Fulano de Tal"), city luôn in hoa. */
function pixSanitize(s: string, max: number, upper: boolean): string {
  const base = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, max)
  return upper ? base.toUpperCase() : base
}

export function buildPix({ pixKey, name, city }: PixInput): string {
  const merchant = tlv('00', 'br.gov.bcb.pix') + tlv('01', pixKey.trim())
  const cityName = pixSanitize(city || 'BRASIL', 15, true) || 'BRASIL'
  return emvWithCRC([
    tlv('00', '01'),
    tlv('26', merchant),
    tlv('52', '0000'),
    tlv('53', '986'),
    tlv('58', 'BR'),
    tlv('59', pixSanitize(name, 25, false) || 'RECEBEDOR'),
    tlv('60', cityName),
    tlv('62', tlv('05', '***')), // txid *** = static
  ])
}

// ── EPC QR (EU / SEPA) — 12 dòng text ────────────────────────────────────────
export type EpcInput = { name: string; iban: string; bic?: string }

export function buildEpc({ name, iban, bic }: EpcInput): string {
  const lines = [
    'BCD',
    '002',
    '1', // UTF-8
    'SCT',
    (bic || '').toUpperCase().replace(/\s/g, ''), // version 002: BIC tuỳ chọn
    name.trim().slice(0, 70),
    iban.replace(/\s/g, '').toUpperCase(),
    '', // Amount EURxx.xx — bỏ trống: người trả tự nhập
    '', // Purpose
    '', // Remittance reference
    '', // Text
    '', // Hint
  ]
  return lines.join('\n')
}

// ── UPI (Ấn Độ) — intent link ────────────────────────────────────────────────
export type UpiInput = { vpa: string; name: string }

export function buildUpi({ vpa, name }: UpiInput): string {
  const q = new URLSearchParams({
    pa: vpa.trim(),
    pn: name.trim().slice(0, 99),
  })
  return `upi://pay?${q.toString().replace(/\+/g, '%20')}`
}

// ── Handle (thị trường không có chuẩn mở: US/UK/CA/AU/JP…) ──────────────────
/** QR hoá được khi handle là URL (PayPal.Me, Venmo, Revolut…); text thì không. */
export function handleQrPayload(value: string): string | null {
  const v = value.trim()
  return /^https?:\/\//i.test(v) ? v : null
}

// ── Phân giải phương thức nhận tiền của 1 thành viên ────────────────────────
export type ResolvedPayment =
  | { rail: 'vietqr'; payload: null; bankCode: string; accountNumber: string; accountName?: string }
  | { rail: 'sepa'; payload: string; iban: string; name: string; bic?: string }
  | { rail: 'upi'; payload: string; vpa: string; name: string }
  | { rail: 'promptpay'; payload: string; proxyType: 'phone' | 'nationalId'; proxyValue: string }
  | { rail: 'pix'; payload: string; pixKey: string; name: string; city?: string }
  | { rail: 'handle'; payload: string | null; label: string; value: string }

/**
 * Trả về phương thức nhận tiền + payload QR tương ứng, hoặc null khi chưa
 * cấu hình gì. VietQR ưu tiên 3 field bank* cũ (payload do generateVietQR
 * phía call-site dựng kèm số tiền VND — giữ nguyên đường cũ).
 */
export function resolveMemberPayment(m: Member): ResolvedPayment | null {
  const d = m.paymentData ?? {}
  // VietQR: tương thích ngược — ai đã có STK thì cứ dùng STK.
  if (m.bankCode && m.bankAccountNumber) {
    return {
      rail: 'vietqr',
      payload: null,
      bankCode: m.bankCode,
      accountNumber: m.bankAccountNumber,
      accountName: m.bankAccountName,
    }
  }
  switch (m.paymentRail) {
    case 'sepa':
      if (!d.iban) return null
      return { rail: 'sepa', payload: buildEpc({ name: d.name || m.name, iban: d.iban, bic: d.bic }), iban: d.iban, name: d.name || m.name, bic: d.bic }
    case 'upi':
      if (!d.vpa) return null
      return { rail: 'upi', payload: buildUpi({ vpa: d.vpa, name: d.name || m.name }), vpa: d.vpa, name: d.name || m.name }
    case 'promptpay': {
      const proxyType = d.proxyType === 'nationalId' ? 'nationalId' : 'phone'
      if (!d.proxyValue) return null
      return { rail: 'promptpay', payload: buildPromptPay({ proxyType, proxyValue: d.proxyValue }), proxyType, proxyValue: d.proxyValue }
    }
    case 'pix':
      if (!d.pixKey) return null
      return { rail: 'pix', payload: buildPix({ pixKey: d.pixKey, name: d.name || m.name, city: d.city }), pixKey: d.pixKey, name: d.name || m.name, city: d.city }
    case 'handle':
      if (!d.value) return null
      return { rail: 'handle', payload: handleQrPayload(d.value), label: d.label || '', value: d.value }
    default:
      return null
  }
}
