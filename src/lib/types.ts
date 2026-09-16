// ── Splitz domain model ──
// Engine giữ nguyên tinh thần đã kiểm chứng từ bản cũ, gọn lại cho MVP.

export type SplitMode = 'equal' | 'shares' | 'percent' | 'exact' | 'itemized'
export type SettlementMethod = 'smart_settle' | 'maximize_reduction'
export type MaxReductionMode = 'exact' | 'heuristic'

export type Member = {
  id: string
  name: string
  /** Màu accent hiển thị avatar (token trong palette). */
  color?: string
  bankCode?: string
  bankAccountNumber?: string
  bankAccountName?: string
  /** Cloud: tài khoản đã liên kết. null/undefined = thành viên "ảo" (chỉ tên). */
  userId?: string | null
  /** Cloud: ảnh đại diện lấy từ hồ sơ tài khoản (thành viên thật). */
  avatarUrl?: string
  /** Cloud: vai trò trong nhóm. */
  role?: 'owner' | 'member'
}

export type ExpensePayer = {
  memberId: string
  amount: number
}

export type ExpenseParticipant = {
  memberId: string
  /** Dùng cho splitMode 'shares' | 'percent' | 'exact'. */
  splitValue?: number
}

export type ExpenseItemParticipant = {
  memberId: string
}

export type ExpenseItem = {
  id: string
  title: string
  amount: number
  participants: ExpenseItemParticipant[]
}

export type Expense = {
  id: string
  groupId: string
  title: string
  amount: number
  note?: string
  /** ISO datetime. */
  paidAt: string
  splitMode: SplitMode
  payers: ExpensePayer[]
  participants: ExpenseParticipant[]
  items?: ExpenseItem[]
  /** Cloud: số phiên bản để chống ghi đè mù (optimistic concurrency). */
  version?: number
  /** Cloud: thành viên đã tạo khoản chi; dùng để khớp quyền sửa/xoá theo hợp đồng owner/creator. */
  createdByMemberId?: string | null
  /** Đa tiền tệ: đồng gốc (mặc định VND). `amount` luôn là số tiền ĐÃ QUY ĐỔI về VND (base). */
  currency?: string
  /** Số tiền ở đồng gốc (để hiển thị). */
  amountOriginal?: number
  /** Tỷ giá snapshot (gốc → VND). */
  exchangeRate?: number
}

export type Group = {
  id: string
  name: string
  emoji?: string
  createdAt: string
  updatedAt: string
  settlementMethod: SettlementMethod
  members: Member[]
  expenses: Expense[]
  /** Cloud: chủ sở hữu (auth user id). */
  ownerId?: string
  /** Cloud: đồng tiền hiển thị chính của nhóm. */
  baseCurrency?: string
  /** Quyết toán đã ghi nhận (pending/confirmed). */
  settlements?: Settlement[]
}

export type MemberBalance = {
  memberId: string
  name: string
  /** > 0: được nhận lại; < 0: còn nợ. Đơn vị đồng (số nguyên). */
  balance: number
}

export type SettlementTransfer = {
  fromMemberId: string
  toMemberId: string
  amount: number
  method: SettlementMethod
  groupId?: string
}

export type SettlementStatus = 'pending' | 'confirmed' | 'cancelled'
export type SettlementPaymentMethod = 'bank_transfer' | 'other'

/** Quyết toán ĐÃ GHI NHẬN (khác SettlementTransfer là gợi ý tức thời).
 *  Xác nhận đôi: người trả tạo 'pending' → người nhận xác nhận 'confirmed'. */
export type Settlement = {
  id: string
  groupId: string
  fromMemberId: string
  toMemberId: string
  amount: number
  status: SettlementStatus
  paymentMethod?: SettlementPaymentMethod
  /** ISO datetime tạo. */
  createdAt: string
  /** ISO datetime người nhận xác nhận (nếu confirmed). */
  confirmedAt?: string
  proofStoragePath?: string
  proofMimeType?: string
  proofFileName?: string
  proofSizeBytes?: number
  createdByMemberId?: string
  version?: number
}

export type Attachment = {
  id: string
  expenseId: string
  groupId: string
  storagePath: string
  mimeType?: string
  fileName?: string
  sizeBytes?: number
  createdAt: string
}
