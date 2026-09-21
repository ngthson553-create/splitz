import { describe, expect, it } from 'vitest'
import {
  buildEpc,
  buildPix,
  buildPromptPay,
  buildUpi,
  crc16Ccitt,
  handleQrPayload,
  resolveMemberPayment,
} from './paymentQr'

// Vector chuẩn: PromptPay lấy từ bộ test thư viện dtinth/promptpay-qr,
// Pix lấy nguyên ví dụ static trong BR Code Manual của Bacen — builder phải
// tái tạo ĐÚNG TỪNG KÝ TỰ, sai một chữ số là app ngân hàng từ chối.
describe('crc16Ccitt (CCITT-FALSE)', () => {
  it('khớp giá trị kiểm chuẩn "123456789" → 29B1', () => {
    expect(crc16Ccitt('123456789')).toBe('29B1')
  })
})

describe('buildPromptPay — vector dtinth/promptpay-qr', () => {
  it('số điện thoại nội địa 0801234567 → 0066801234567, CRC 6197', () => {
    expect(buildPromptPay({ proxyType: 'phone', proxyValue: '0801234567' })).toBe(
      '00020101021129370016A000000677010111011300668012345675802TH530376463046197',
    )
  })

  it('số điện thoại có +66 và gạch ngang vẫn chuẩn hoá đúng, CRC 29C1', () => {
    expect(buildPromptPay({ proxyType: 'phone', proxyValue: '+66-89-123-4567' })).toBe(
      '00020101021129370016A000000677010111011300668912345675802TH5303764630429C1',
    )
  })

  it('CMND 13 số qua subtag 02, CRC 7B5A', () => {
    expect(buildPromptPay({ proxyType: 'nationalId', proxyValue: '1-1111-11111-11-1' })).toBe(
      '00020101021129370016A000000677010111021311111111111115802TH530376463047B5A',
    )
  })
})

describe('buildPix — ví dụ static trong BR Code Manual (Bacen)', () => {
  it('key UUID + Fulano de Tal + BRASILIA → nguyên văn, CRC 1D3D', () => {
    expect(
      buildPix({
        pixKey: '123e4567-e12b-12d1-a456-426655440000',
        name: 'Fulano de Tal',
        city: 'BRASILIA',
      }),
    ).toBe(
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
    )
  })

  it('bỏ dấu tên tiếng Việt, thay city trống bằng BRASIL', () => {
    const out = buildPix({ pixKey: 'email@example.com', name: 'Nguyễn Văn É', city: '' })
    expect(out).toContain('5912Nguyen Van E')
    expect(out).toContain('6006BRASIL')
  })
})

describe('buildEpc (SEPA)', () => {
  it('đủ 12 dòng: BCD/002/1/SCT/BIC/tên/IBAN + 5 dòng trống', () => {
    const out = buildEpc({ name: 'Alice Muster', iban: 'DE89 3704 0044 0532 0130 00', bic: 'COBADEFFXXX' })
    const lines = out.split('\n')
    expect(lines).toHaveLength(12)
    expect(lines[0]).toBe('BCD')
    expect(lines[1]).toBe('002')
    expect(lines[2]).toBe('1')
    expect(lines[3]).toBe('SCT')
    expect(lines[4]).toBe('COBADEFFXXX')
    expect(lines[5]).toBe('Alice Muster')
    expect(lines[6]).toBe('DE89370400440532013000')
    expect(lines[7]).toBe('') // không nhúng số tiền
  })

  it('BIC để trống vẫn hợp lệ (tuỳ chọn ở version 002)', () => {
    const out = buildEpc({ name: 'Bob', iban: 'FR1420041010050500013M02606' })
    expect(out.split('\n')[4]).toBe('')
  })
})

describe('buildUpi (Ấn Độ)', () => {
  it('intent link chuẩn pa/pn, encode khoảng trắng', () => {
    expect(buildUpi({ vpa: 'son@okbank', name: 'Nguyễn Sơn' })).toBe(
      'upi://pay?pa=son%40okbank&pn=Nguy%E1%BB%85n%20S%C6%A1n',
    )
  })
})

describe('handleQrPayload', () => {
  it('URL → QR hoá được; text thuần → null', () => {
    expect(handleQrPayload('https://paypal.me/son123')).toBe('https://paypal.me/son123')
    expect(handleQrPayload('son123')).toBeNull()
  })
})

describe('resolveMemberPayment', () => {
  it('ưu tiên VietQR cũ khi còn STK — dữ liệu VN không đổi', () => {
    const r = resolveMemberPayment({
      id: 'm1',
      name: 'Sơn',
      bankCode: 'VCB',
      bankAccountNumber: '007123',
      paymentRail: 'upi',
      paymentData: { vpa: 'x@y' },
    })
    expect(r?.rail).toBe('vietqr')
  })

  it('mỗi rail giải ra đúng payload', () => {
    const base = { id: 'm2', name: 'Linh' }
    expect(resolveMemberPayment({ ...base, paymentRail: 'upi', paymentData: { vpa: 'linh@oksbi' } })?.payload).toContain('upi://pay?pa=linh%40oksbi')
    expect(resolveMemberPayment({ ...base, paymentRail: 'sepa', paymentData: { iban: 'DE89370400440532013000' } })?.payload).toContain('SCT')
    expect(resolveMemberPayment({ ...base, paymentRail: 'promptpay', paymentData: { proxyType: 'phone', proxyValue: '0801234567' } })?.payload).toBe(
      '00020101021129370016A000000677010111011300668012345675802TH530376463046197',
    )
    expect(resolveMemberPayment({ ...base, paymentRail: 'handle', paymentData: { label: 'PayPal', value: 'https://paypal.me/linh' } })?.payload).toBe('https://paypal.me/linh')
  })

  it('chưa cấu hình → null', () => {
    expect(resolveMemberPayment({ id: 'm3', name: 'Hải' })).toBeNull()
    expect(resolveMemberPayment({ id: 'm4', name: 'Hải', paymentRail: 'pix', paymentData: {} })).toBeNull()
  })
})
