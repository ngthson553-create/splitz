import type { SplitMode } from '../types'

/**
 * Kết quả phân tích 1 câu nhập chi tự nhiên. Dùng CHUNG cho cả parser quy tắc
 * (offline, FREE) lẫn parser LLM (Gemini) → UI áp dụng đồng nhất, luôn cho user sửa.
 */
export interface ParsedExpense {
  title: string
  /** Số tiền VND (số nguyên). 0 = không bóc được. */
  amount: number
  payerName?: string
  participantNames?: string[]
  splitMode?: SplitMode
}

/** Mức độ "đáng tin" của kết quả quy tắc → quyết định có nên gợi ý dùng AI không. */
export function isLowConfidence(p: ParsedExpense): boolean {
  return p.amount <= 0 || !p.payerName
}

const PAYER_KEYWORDS = ['trả hộ', 'thanh toán', 'chuyển', 'trả', 'chi', 'ứng']
const SPLIT_KEYWORDS = ['chia đều', 'chia cho', 'chia']
const CONNECTING_WORDS = ['do', 'bởi', 'và', 'cho', 'của', 'tiền', 'khoản']

/** Bóc số tiền từ câu. Trả [amount, đoạn text đã khớp] để loại khỏi tiêu đề. */
function extractAmount(text: string): [number, string] {
  // tr+k: "1tr750", "2m500" → triệu + nghìn
  const mMillionThousand = text.match(/(\d+)\s*(?:tr|m)\s*(\d+)\s*k?/i)
  if (mMillionThousand) {
    const million = parseInt(mMillionThousand[1], 10)
    const thousand = parseInt(mMillionThousand[2], 10)
    return [million * 1_000_000 + thousand * 1_000, mMillionThousand[0]]
  }
  // triệu: "1.5tr", "2 triệu"
  const mMillion = text.match(/(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|m)(?![a-zA-ZÀ-ỹ])/i)
  if (mMillion) {
    const val = parseFloat(mMillion[1].replace(',', '.'))
    return [Math.round(val * 1_000_000), mMillion[0]]
  }
  // nghìn: "200k", "1.5k"
  const mThousand = text.match(/(\d+(?:[.,]\d+)?)\s*k(?![a-zA-ZÀ-ỹ])/i)
  if (mThousand) {
    const val = parseFloat(mThousand[1].replace(',', '.'))
    return [Math.round(val * 1_000), mThousand[0]]
  }
  // số đầy đủ: "350.000đ", "500000"
  const mStandard = text.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,9})\s*(?:đ|vnd|đồng|d)?/i)
  if (mStandard) {
    return [parseInt(mStandard[1].replace(/[.,]/g, ''), 10), mStandard[0]]
  }
  return [0, '']
}

/** Tìm tên thành viên gần nhất với 1 vị trí từ khoá (để gán người trả). */
function nearestName(text: string, anchor: number, memberNames: string[]): string | undefined {
  const lower = text.toLowerCase()
  let best: string | undefined
  let minDist = Infinity
  for (const name of memberNames) {
    const ln = name.toLowerCase()
    let pos = lower.indexOf(ln)
    while (pos !== -1) {
      const dist = Math.abs(pos - anchor)
      if (dist < minDist) {
        minDist = dist
        best = name
      }
      pos = lower.indexOf(ln, pos + 1)
    }
  }
  return minDist < 25 ? best : undefined
}

function firstKeywordIndex(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    const idx = lower.indexOf(kw)
    if (idx !== -1) return idx
  }
  return -1
}

/**
 * Phân tích câu nhập chi bằng QUY TẮC (regex + từ khoá). Zero-cost, offline, tức thì.
 * VD: "Ăn tối 500k Hùng trả chia đều" → {title:'Ăn tối', amount:500000, payerName:'Hùng', ...}
 * Không bao giờ throw — trả kết quả tốt nhất có thể (UI cho user sửa).
 */
export function parseExpenseRuleBased(text: string, memberNames: string[]): ParsedExpense {
  const normalized = text.trim()
  if (!normalized) return { title: '', amount: 0, splitMode: 'equal' }

  let clean = normalized

  // 1) Số tiền
  const [amount, amountText] = extractAmount(normalized)
  if (amountText) clean = clean.replace(amountText, ' ')

  // 2) Người trả: gần từ khoá trả/thanh toán nhất; fallback = tên đầu tiên xuất hiện
  let payerName: string | undefined
  const payerIdx = firstKeywordIndex(clean, PAYER_KEYWORDS)
  if (payerIdx !== -1) payerName = nearestName(clean, payerIdx, memberNames)
  if (!payerName) {
    for (const name of memberNames) {
      if (clean.toLowerCase().includes(name.toLowerCase())) {
        payerName = name
        break
      }
    }
  }

  // 3) Người tham gia: tên xuất hiện SAU từ khoá "chia"; nếu không có → cả nhóm
  let participantNames: string[] = []
  const splitIdx = firstKeywordIndex(clean, SPLIT_KEYWORDS)
  if (splitIdx !== -1) {
    const after = clean.slice(splitIdx).toLowerCase()
    for (const name of memberNames) {
      if (after.includes(name.toLowerCase())) participantNames.push(name)
    }
  }
  if (participantNames.length === 0) participantNames = [...memberNames]

  // 4) Tiêu đề: phần còn lại sau khi bỏ số tiền / đoạn "chia..." / tên người trả / từ nối
  let titleText = clean
  if (splitIdx !== -1) {
    const w = titleText.toLowerCase().indexOf('chia')
    if (w !== -1) titleText = titleText.slice(0, w)
  }
  if (payerName) titleText = titleText.replace(new RegExp(payerName, 'gi'), ' ')
  for (const kw of PAYER_KEYWORDS) titleText = titleText.replace(new RegExp(kw, 'gi'), ' ')
  for (const w of CONNECTING_WORDS) {
    titleText = titleText.replace(new RegExp(`(^|\\s)${w}(\\s|$)`, 'gi'), ' ')
  }
  titleText = titleText.replace(/[.,:;?!\-_]/g, ' ').replace(/\s+/g, ' ').trim()

  let title = titleText || 'Khoản chi'
  title = title.charAt(0).toUpperCase() + title.slice(1)

  return { title, amount, payerName, participantNames, splitMode: 'equal' }
}
