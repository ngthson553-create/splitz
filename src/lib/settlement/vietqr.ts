/**
 * Danh sách ngân hàng Việt Nam hỗ trợ chuyển khoản qua VietQR/Napas.
 * Mã BIN do Ngân hàng Nhà nước cấp; code/shortName/logo theo VietQR banks API.
 * Đây là nguồn dữ liệu DUY NHẤT — BANK_MAPPING được sinh tự động từ danh sách này.
 * Các ngân hàng phổ biến được xếp lên đầu, phần còn lại theo bảng chữ cái.
 */
export type BankOption = {
  code: string
  name: string
  bin: string
  shortName: string
  fullName: string
  logo: string
  keywords?: string[]
}

export const BANK_OPTIONS: BankOption[] = [
  // ── Phổ biến nhất ──
  { code: 'VCB', shortName: 'Vietcombank', name: 'Vietcombank', fullName: 'Ngân hàng TMCP Ngoại Thương Việt Nam', bin: '970436', logo: 'https://cdn.vietqr.io/img/VCB.png', keywords: ['ngoai thuong', 'vietcom'] },
  { code: 'TCB', shortName: 'Techcombank', name: 'Techcombank', fullName: 'Ngân hàng TMCP Kỹ thương Việt Nam', bin: '970407', logo: 'https://cdn.vietqr.io/img/TCB.png', keywords: ['ky thuong'] },
  { code: 'MB', shortName: 'MBBank', name: 'MB Bank', fullName: 'Ngân hàng TMCP Quân đội', bin: '970422', logo: 'https://cdn.vietqr.io/img/MB.png', keywords: ['mbbank', 'quan doi', 'mb bank'] },
  { code: 'BIDV', shortName: 'BIDV', name: 'BIDV', fullName: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', bin: '970418', logo: 'https://cdn.vietqr.io/img/BIDV.png', keywords: ['dau tu phat trien'] },
  { code: 'ICB', shortName: 'VietinBank', name: 'VietinBank', fullName: 'Ngân hàng TMCP Công thương Việt Nam', bin: '970415', logo: 'https://cdn.vietqr.io/img/ICB.png', keywords: ['vietin', 'cong thuong', 'ctg'] },
  { code: 'ACB', shortName: 'ACB', name: 'ACB', fullName: 'Ngân hàng TMCP Á Châu', bin: '970416', logo: 'https://cdn.vietqr.io/img/ACB.png', keywords: ['a chau'] },
  { code: 'TPB', shortName: 'TPBank', name: 'TPBank', fullName: 'Ngân hàng TMCP Tiên Phong', bin: '970423', logo: 'https://cdn.vietqr.io/img/TPB.png', keywords: ['tien phong'] },
  { code: 'VPB', shortName: 'VPBank', name: 'VPBank', fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', bin: '970432', logo: 'https://cdn.vietqr.io/img/VPB.png', keywords: ['thinh vuong'] },
  { code: 'STB', shortName: 'Sacombank', name: 'Sacombank', fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín', bin: '970403', logo: 'https://cdn.vietqr.io/img/STB.png', keywords: ['sai gon thuong tin'] },
  { code: 'VIB', shortName: 'VIB', name: 'VIB', fullName: 'Ngân hàng TMCP Quốc tế Việt Nam', bin: '970441', logo: 'https://cdn.vietqr.io/img/VIB.png', keywords: ['quoc te'] },
  { code: 'HDB', shortName: 'HDBank', name: 'HDBank', fullName: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh', bin: '970437', logo: 'https://cdn.vietqr.io/img/HDB.png', keywords: ['hd bank'] },
  { code: 'MSB', shortName: 'MSB', name: 'MSB', fullName: 'Ngân hàng TMCP Hàng Hải Việt Nam', bin: '970426', logo: 'https://cdn.vietqr.io/img/MSB.png', keywords: ['hang hai', 'maritime'] },
  { code: 'SHB', shortName: 'SHB', name: 'SHB', fullName: 'Ngân hàng TMCP Sài Gòn - Hà Nội', bin: '970443', logo: 'https://cdn.vietqr.io/img/SHB.png', keywords: ['sai gon ha noi'] },
  { code: 'OCB', shortName: 'OCB', name: 'OCB', fullName: 'Ngân hàng TMCP Phương Đông', bin: '970448', logo: 'https://cdn.vietqr.io/img/OCB.png', keywords: ['phuong dong'] },
  { code: 'EIB', shortName: 'Eximbank', name: 'Eximbank', fullName: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam', bin: '970431', logo: 'https://cdn.vietqr.io/img/EIB.png', keywords: ['xuat nhap khau'] },
  { code: 'LPB', shortName: 'LPBank', name: 'LPBank', fullName: 'Ngân hàng TMCP Lộc Phát Việt Nam', bin: '970449', logo: 'https://cdn.vietqr.io/img/LPB.png', keywords: ['lien viet', 'loc phat'] },
  { code: 'SEAB', shortName: 'SeABank', name: 'SeABank', fullName: 'Ngân hàng TMCP Đông Nam Á', bin: '970440', logo: 'https://cdn.vietqr.io/img/SEAB.png', keywords: ['dong nam a'] },
  { code: 'VBA', shortName: 'Agribank', name: 'Agribank', fullName: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam', bin: '970405', logo: 'https://cdn.vietqr.io/img/VBA.png', keywords: ['nong nghiep', 'nong thon'] },
  // ── Các ngân hàng/định chế còn lại theo VietQR API ──
  { code: 'ABB', shortName: 'ABBANK', name: 'ABBANK', fullName: 'Ngân hàng TMCP An Bình', bin: '970425', logo: 'https://cdn.vietqr.io/img/ABB.png', keywords: ['an binh'] },
  { code: 'BAB', shortName: 'BacABank', name: 'Bac A Bank', fullName: 'Ngân hàng TMCP Bắc Á', bin: '970409', logo: 'https://cdn.vietqr.io/img/BAB.png', keywords: ['bac a'] },
  { code: 'BVB', shortName: 'BaoVietBank', name: 'BaoViet Bank', fullName: 'Ngân hàng TMCP Bảo Việt', bin: '970438', logo: 'https://cdn.vietqr.io/img/BVB.png', keywords: ['bao viet'] },
  { code: 'CAKE', shortName: 'CAKE', name: 'CAKE by VPBank', fullName: 'TMCP Việt Nam Thịnh Vượng - Ngân hàng số CAKE by VPBank', bin: '546034', logo: 'https://cdn.vietqr.io/img/CAKE.png' },
  { code: 'CBB', shortName: 'CBBank', name: 'CBBank', fullName: 'Ngân hàng Thương mại TNHH MTV Xây dựng Việt Nam', bin: '970444', logo: 'https://cdn.vietqr.io/img/CBB.png', keywords: ['xay dung'] },
  { code: 'CIMB', shortName: 'CIMB', name: 'CIMB Bank', fullName: 'Ngân hàng TNHH MTV CIMB Việt Nam', bin: '422589', logo: 'https://cdn.vietqr.io/img/CIMB.png' },
  { code: 'CITIBANK', shortName: 'Citibank', name: 'Citibank', fullName: 'Ngân hàng Citibank, N.A. - Chi nhánh Hà Nội', bin: '533948', logo: 'https://cdn.vietqr.io/img/CITIBANK.png' },
  { code: 'COOPBANK', shortName: 'COOPBANK', name: 'Co-op Bank', fullName: 'Ngân hàng Hợp tác xã Việt Nam', bin: '970446', logo: 'https://cdn.vietqr.io/img/COOPBANK.png', keywords: ['hop tac xa'] },
  { code: 'DBS', shortName: 'DBSBank', name: 'DBS Bank - CN HCM', fullName: 'DBS Bank Ltd - Chi nhánh Thành phố Hồ Chí Minh', bin: '796500', logo: 'https://cdn.vietqr.io/img/DBS.png' },
  { code: 'GPB', shortName: 'GPBank', name: 'GPBank', fullName: 'Ngân hàng Thương mại TNHH MTV Dầu Khí Toàn Cầu', bin: '970408', logo: 'https://cdn.vietqr.io/img/GPB.png', keywords: ['dau khi toan cau'] },
  { code: 'HLBVN', shortName: 'HongLeong', name: 'Hong Leong Bank', fullName: 'Ngân hàng TNHH MTV Hong Leong Việt Nam', bin: '970442', logo: 'https://cdn.vietqr.io/img/HLBVN.png' },
  { code: 'HSBC', shortName: 'HSBC', name: 'HSBC Việt Nam', fullName: 'Ngân hàng TNHH MTV HSBC (Việt Nam)', bin: '458761', logo: 'https://cdn.vietqr.io/img/HSBC.png' },
  { code: 'IBK - HCM', shortName: 'IBKHCM', name: 'IBK - CN HCM', fullName: 'Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh TP. Hồ Chí Minh', bin: '970456', logo: 'https://cdn.vietqr.io/img/IBK.png', keywords: ['ibk hcm', 'cong nghiep han quoc'] },
  { code: 'IBK - HN', shortName: 'IBKHN', name: 'IBK - CN Hà Nội', fullName: 'Ngân hàng Công nghiệp Hàn Quốc - Chi nhánh Hà Nội', bin: '970455', logo: 'https://cdn.vietqr.io/img/IBK.png', keywords: ['ibk hn', 'ibk ha noi', 'cong nghiep han quoc'] },
  { code: 'IVB', shortName: 'IndovinaBank', name: 'Indovina Bank', fullName: 'Ngân hàng TNHH Indovina', bin: '970434', logo: 'https://cdn.vietqr.io/img/IVB.png' },
  { code: 'KBank', shortName: 'KBank', name: 'KBank', fullName: 'Ngân hàng Đại chúng TNHH Kasikornbank', bin: '668888', logo: 'https://cdn.vietqr.io/img/KBANK.png', keywords: ['kasikorn'] },
  { code: 'KBHCM', shortName: 'KookminHCM', name: 'Kookmin - CN HCM', fullName: 'Ngân hàng Kookmin - Chi nhánh Thành phố Hồ Chí Minh', bin: '970463', logo: 'https://cdn.vietqr.io/img/KBHCM.png' },
  { code: 'KBHN', shortName: 'KookminHN', name: 'Kookmin - CN Hà Nội', fullName: 'Ngân hàng Kookmin - Chi nhánh Hà Nội', bin: '970462', logo: 'https://cdn.vietqr.io/img/KBHN.png' },
  { code: 'KEBHANAHCM', shortName: 'KEBHanaHCM', name: 'KEB Hana - CN HCM', fullName: 'Ngân hàng KEB Hana - Chi nhánh Thành phố Hồ Chí Minh', bin: '970466', logo: 'https://cdn.vietqr.io/img/KEBHANAHCM.png' },
  { code: 'KEBHANAHN', shortName: 'KEBHANAHN', name: 'KEB Hana - CN Hà Nội', fullName: 'Ngân hàng KEB Hana - Chi nhánh Hà Nội', bin: '970467', logo: 'https://cdn.vietqr.io/img/KEBHANAHN.png' },
  { code: 'KLB', shortName: 'KienLongBank', name: 'KienLongBank', fullName: 'Ngân hàng TMCP Kiên Long', bin: '970452', logo: 'https://cdn.vietqr.io/img/KLB.png', keywords: ['kien long'] },
  { code: 'MAFC', shortName: 'MAFC', name: 'Mirae Asset Finance', fullName: 'Công ty Tài chính TNHH MTV Mirae Asset (Việt Nam)', bin: '977777', logo: 'https://cdn.vietqr.io/img/MAFC.png', keywords: ['mirae asset'] },
  { code: 'MBV', shortName: 'MBV', name: 'MBV', fullName: 'Ngân hàng TNHH MTV Việt Nam Hiện Đại', bin: '970414', logo: 'https://cdn.vietqr.io/img/MBV.png', keywords: ['viet nam hien dai'] },
  { code: 'NAB', shortName: 'NamABank', name: 'Nam A Bank', fullName: 'Ngân hàng TMCP Nam Á', bin: '970428', logo: 'https://cdn.vietqr.io/img/NAB.png', keywords: ['nam a'] },
  { code: 'NCB', shortName: 'NCB', name: 'NCB', fullName: 'Ngân hàng TMCP Quốc Dân', bin: '970419', logo: 'https://cdn.vietqr.io/img/NCB.png', keywords: ['quoc dan'] },
  { code: 'NHB HN', shortName: 'Nonghyup', name: 'Nonghyup - CN Hà Nội', fullName: 'Ngân hàng Nonghyup - Chi nhánh Hà Nội', bin: '801011', logo: 'https://cdn.vietqr.io/img/NHB.png', keywords: ['nonghyup', 'nhb'] },
  { code: 'PBVN', shortName: 'PublicBank', name: 'Public Bank Việt Nam', fullName: 'Ngân hàng TNHH MTV Public Việt Nam', bin: '970439', logo: 'https://cdn.vietqr.io/img/PBVN.png' },
  { code: 'PGB', shortName: 'PGBank', name: 'PGBank', fullName: 'Ngân hàng TMCP Thịnh vượng và Phát triển', bin: '970430', logo: 'https://cdn.vietqr.io/img/PGB.png', keywords: ['thinh vuong phat trien'] },
  { code: 'PVCB', shortName: 'PVcomBank', name: 'PVcomBank', fullName: 'Ngân hàng TMCP Đại Chúng Việt Nam', bin: '970412', logo: 'https://cdn.vietqr.io/img/PVCB.png', keywords: ['dai chung'] },
  { code: 'PVDB', shortName: 'PVcomBank Pay', name: 'PVcomBank Pay', fullName: 'Ngân hàng TMCP Đại Chúng Việt Nam Ngân hàng số', bin: '971133', logo: 'https://cdn.vietqr.io/img/PVCB.png' },
  { code: 'SCB', shortName: 'SCB', name: 'SCB', fullName: 'Ngân hàng TMCP Sài Gòn', bin: '970429', logo: 'https://cdn.vietqr.io/img/SCB.png' },
  { code: 'SCVN', shortName: 'StandardChartered', name: 'Standard Chartered Việt Nam', fullName: 'Ngân hàng TNHH MTV Standard Chartered Bank Việt Nam', bin: '970410', logo: 'https://cdn.vietqr.io/img/SCVN.png' },
  { code: 'SGICB', shortName: 'SaigonBank', name: 'SaigonBank', fullName: 'Ngân hàng TMCP Sài Gòn Công Thương', bin: '970400', logo: 'https://cdn.vietqr.io/img/SGICB.png', keywords: ['sai gon cong thuong'] },
  { code: 'SHBVN', shortName: 'ShinhanBank', name: 'Shinhan Bank', fullName: 'Ngân hàng TNHH MTV Shinhan Việt Nam', bin: '970424', logo: 'https://cdn.vietqr.io/img/SHBVN.png' },
  { code: 'TIMO', shortName: 'Timo', name: 'Timo by BVBank', fullName: 'Ngân hàng số Timo by Ban Viet Bank', bin: '963388', logo: 'https://vietqr.net/portal-service/resources/icons/TIMO.png' },
  { code: 'Ubank', shortName: 'Ubank', name: 'Ubank by VPBank', fullName: 'TMCP Việt Nam Thịnh Vượng - Ngân hàng số Ubank by VPBank', bin: '546035', logo: 'https://cdn.vietqr.io/img/UBANK.png' },
  { code: 'UOB', shortName: 'UnitedOverseas', name: 'UOB Việt Nam', fullName: 'Ngân hàng United Overseas - Chi nhánh TP. Hồ Chí Minh', bin: '970458', logo: 'https://cdn.vietqr.io/img/UOB.png' },
  { code: 'VAB', shortName: 'VietABank', name: 'VietABank', fullName: 'Ngân hàng TMCP Việt Á', bin: '970427', logo: 'https://cdn.vietqr.io/img/VAB.png', keywords: ['viet a'] },
  { code: 'VBSP', shortName: 'VBSP', name: 'Ngân hàng Chính sách Xã hội', fullName: 'Ngân hàng Chính sách Xã hội', bin: '999888', logo: 'https://cdn.vietqr.io/img/VBSP.png', keywords: ['chinh sach xa hoi'] },
  { code: 'VCCB', shortName: 'VietCapitalBank', name: 'Bản Việt (BVBank)', fullName: 'Ngân hàng TMCP Bản Việt', bin: '970454', logo: 'https://cdn.vietqr.io/img/VCCB.png', keywords: ['ban viet', 'bvbank'] },
  { code: 'VIETBANK', shortName: 'VietBank', name: 'VietBank', fullName: 'Ngân hàng TMCP Việt Nam Thương Tín', bin: '970433', logo: 'https://cdn.vietqr.io/img/VIETBANK.png', keywords: ['viet nam thuong tin'] },
  { code: 'Vikki', shortName: 'Vikki', name: 'Vikki Bank', fullName: 'Ngân hàng TNHH MTV Số Vikki', bin: '970406', logo: 'https://cdn.vietqr.io/img/Vikki.png', keywords: ['vikki', 'so vikki', 'donga'] },
  { code: 'VRB', shortName: 'VRB', name: 'VRB (Việt - Nga)', fullName: 'Ngân hàng Liên doanh Việt - Nga', bin: '970421', logo: 'https://cdn.vietqr.io/img/VRB.png' },
  { code: 'WVN', shortName: 'Woori', name: 'Woori Bank Việt Nam', fullName: 'Ngân hàng TNHH MTV Woori Việt Nam', bin: '970457', logo: 'https://cdn.vietqr.io/img/WVN.png' },
]

/** Alias tên viết tắt/tên gọi phổ biến → code chính trong BANK_OPTIONS. */
const BANK_ALIASES: Record<string, string> = {
  VIETCOMBANK: 'VCB',
  TECHCOMBANK: 'TCB',
  MBBANK: 'MB',
  VIETINBANK: 'ICB',
  CTG: 'ICB',
  TPBANK: 'TPB',
  VPBANK: 'VPB',
  SACOMBANK: 'STB',
  HDBANK: 'HDB',
  EXIMBANK: 'EIB',
  SEABANK: 'SEAB',
  AGRIBANK: 'VBA',
  VAR: 'VBA',
  ABBANK: 'ABB',
  BACABANK: 'BAB',
  DONGABANK: 'Vikki',
  DOB: 'Vikki',
  PVCOMBANK: 'PVCB',
  SHINHAN: 'SHBVN',
  SVB: 'SHBVN',
  NAMABANK: 'NAB',
  KIENLONGBANK: 'KLB',
  VIETABANK: 'VAB',
  VIETBANK: 'VIETBANK',
  VBB: 'VIETBANK',
  BVBANK: 'VCCB',
  BANVIET: 'VCCB',
  SGICB: 'SGICB',
  SGB: 'SGICB',
  KBANK: 'KBank',
  NHB: 'NHB HN',
  IBKHN: 'IBK - HN',
  IBKHCM: 'IBK - HCM',
  UBANK: 'Ubank',
  VIKKI: 'Vikki',
}

/**
 * Bảng tra cứu BIN + tên theo code. Sinh tự động từ BANK_OPTIONS + alias,
 * nên chỉ cần cập nhật BANK_OPTIONS khi thêm ngân hàng mới.
 */
export const BANK_MAPPING: Record<string, { bin: string; name: string }> = (() => {
  const map: Record<string, { bin: string; name: string }> = {}
  for (const bank of BANK_OPTIONS) {
    map[bank.code] = { bin: bank.bin, name: bank.name }
    map[bank.code.toUpperCase()] = { bin: bank.bin, name: bank.name }
    map[bank.shortName.toUpperCase()] = { bin: bank.bin, name: bank.name }
  }
  for (const [alias, code] of Object.entries(BANK_ALIASES)) {
    const target = BANK_OPTIONS.find((b) => b.code === code || b.code.toUpperCase() === code.toUpperCase())
    if (target) map[alias] = { bin: target.bin, name: target.name }
  }
  return map
})()

export function resolveBankBin(identifier: string): string {
  const clean = identifier.trim().toUpperCase()
  if (clean.length === 6 && /^\d+$/.test(clean)) {
    return clean
  }
  const match = BANK_MAPPING[clean]
  if (match) return match.bin
  return identifier
}

/** Số ngân hàng đầu danh sách được coi là "phổ biến" (hiển thị nhóm riêng trong dropdown). */
export const POPULAR_BANK_COUNT = 18

/** Hai nhóm ngân hàng cho dropdown: phổ biến (đầu danh sách) và phần còn lại. */
export const BANK_GROUPS: { label: string; banks: { code: string; name: string; bin: string }[] }[] = [
  { label: 'Phổ biến', banks: BANK_OPTIONS.slice(0, POPULAR_BANK_COUNT) },
  { label: 'Tất cả ngân hàng', banks: BANK_OPTIONS.slice(POPULAR_BANK_COUNT) },
]

/** Tên hiển thị của ngân hàng từ code (hoặc BIN). Trả về code gốc nếu không khớp. */
export function bankDisplayName(identifier?: string | null): string {
  if (!identifier) return ''
  const clean = identifier.trim().toUpperCase()
  const byCode = BANK_MAPPING[clean]
  if (byCode) return byCode.name
  const byBin = BANK_OPTIONS.find((b) => b.bin === clean)
  if (byBin) return byBin.name
  return identifier
}

export function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '') // remove special characters
    .toUpperCase()
}

function f(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return tag + len + value
}

export function crc16(data: string): string {
  let crc = 0xFFFF
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export function generateVietQR(args: {
  bankBin: string
  accountNumber: string
  amount: number
  content: string
}): string {
  // Tag 00: Payload Format Indicator
  const tag00 = f('00', '01')
  // Tag 01: Point of Initiation Method (11: static, 12: dynamic)
  const tag01 = f('01', args.amount > 0 ? '12' : '11')

  // Tag 38: Merchant Account Information
  const sub00 = f('00', 'A000000727') // GUID for NAPAS
  const bin = resolveBankBin(args.bankBin)
  const acc = args.accountNumber.trim()
  const subSub00 = f('00', bin)
  const subSub01 = f('01', acc)
  const sub01 = f('01', subSub00 + subSub01)
  const sub02 = f('02', 'QRIBFTTA')
  const tag38 = f('38', sub00 + sub01 + sub02)

  // Tag 53: Currency (704 for VND)
  const tag53 = f('53', '704')

  // Tag 54: Amount
  const tag54 = args.amount > 0 ? f('54', String(Math.round(args.amount))) : ''

  // Tag 58: Country Code (VN)
  const tag58 = f('58', 'VN')

  // Tag 62: Additional Data Field Template
  const normalizedContent = removeDiacritics(args.content)
  const sub62_08 = f('08', normalizedContent)
  const tag62 = f('62', sub62_08)

  // Combined string without CRC
  const rawQR = tag00 + tag01 + tag38 + tag53 + tag54 + tag58 + tag62
  const preCrc = rawQR + '6304'
  const checkSum = crc16(preCrc)

  return preCrc + checkSum
}

// ── Parse VietQR (đảo ngược generateVietQR) ─────────────────────────────
// Dùng cho tính năng "quét QR tài khoản tự điền STK" (client-side, FREE).
// QR theo chuẩn EMVCo/Napas: chuỗi TLV (tag 2 ký tự + length 2 chữ số + value).

function parseTLV(input: string): Record<string, string> {
  const out: Record<string, string> = {}
  let i = 0
  while (i + 4 <= input.length) {
    const tag = input.slice(i, i + 2)
    const len = Number(input.slice(i + 2, i + 4))
    if (!Number.isFinite(len) || len < 0) break
    const value = input.slice(i + 4, i + 4 + len)
    if (value.length < len) break
    out[tag] = value
    i += 4 + len
  }
  return out
}

export type ParsedVietQR = {
  /** code trong BANK_OPTIONS nếu nhận diện được BIN, ngược lại undefined. */
  bankCode?: string
  bin: string
  accountNumber: string
  /** CRC khớp hay không (cảnh báo mềm, không chặn). */
  crcValid: boolean
}

/**
 * Bóc BIN + số tài khoản từ chuỗi VietQR. Trả null nếu không phải QR hợp lệ
 * (thiếu tag 38 / không có BIN + số TK).
 */
export function parseVietQR(raw: string): ParsedVietQR | null {
  const qr = raw.trim()
  if (qr.length < 8) return null

  const top = parseTLV(qr)
  const merchantRaw = top['38']
  if (!merchantRaw) return null

  const merchant = parseTLV(merchantRaw)
  const acctInfo = merchant['01']
  if (!acctInfo) return null

  const nested = parseTLV(acctInfo)
  const bin = (nested['00'] ?? '').trim()
  const accountNumber = (nested['01'] ?? '').trim()
  if (!bin || !accountNumber) return null

  const bank = BANK_OPTIONS.find((b) => b.bin === bin)

  // Kiểm CRC (tag 63): tính lại trên phần trước '6304' và so khớp.
  let crcValid = false
  const crcIdx = qr.lastIndexOf('6304')
  if (crcIdx >= 0) {
    const expected = qr.slice(crcIdx + 4).toUpperCase()
    crcValid = expected.length === 4 && crc16(qr.slice(0, crcIdx + 4)) === expected
  }

  return { bankCode: bank?.code, bin, accountNumber, crcValid }
}
