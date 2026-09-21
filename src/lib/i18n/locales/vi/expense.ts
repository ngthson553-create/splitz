/**
 * Màn khoản chi: thêm/sửa, chi tiết, nhập nhanh (AI/OCR), chứng từ,
 * lịch sử chỉnh sửa và chọn nhóm khi ghi nhanh.
 */
export const expense = {
  // ── Tiêu đề sheet ──
  addTitle: 'Thêm khoản chi',
  createTitle: 'Ghi khoản chi',
  editTitle: 'Sửa khoản chi',
  pickGroupTitle: 'Ghi vào nhóm nào?',
  detailTitle: 'Chi tiết khoản chi',
  historyTitle: 'Lịch sử chỉnh sửa',

  // ── Chế độ chia: nhãn ngắn (Segmented) và nhãn đầy đủ ──
  modeEqual: 'Đều',
  modeExact: 'Tay',
  modePercent: '%',
  modeShares: 'Phần',
  modeItemized: 'Món',
  splitEqual: 'Chia đều',
  splitShares: 'Theo phần',
  splitPercent: 'Phần trăm',
  splitExact: 'Nhập tay',
  splitItemized: 'Theo món',

  // ── Form chính ──
  amount: 'Số tiền',
  amountHint: 'Gõ 250k, 1tr2, 50000…',
  fetchingRate: 'Đang lấy tỷ giá…',
  enterAmount: 'Nhập số tiền',
  fxError: 'Không lấy được tỷ giá. Thử lại hoặc chọn VND.',
  rateLoading: 'Đang tải tỷ giá, thử lại sau giây lát.',
  billTotal: 'Tổng hoá đơn',
  billTotalHint: 'Tự cộng từ các món bên dưới',
  titleLabel: 'Nội dung',
  titlePlaceholder: 'VD: Ăn tối, Taxi, Vé tàu…',
  noteLabel: 'Ghi chú (tuỳ chọn)',
  notePlaceholder: 'Thêm chi tiết nếu cần',

  // ── Ai trả ──
  paidBy: 'Ai trả?',
  splitPayerPay: 'Chia đều tiền trả',
  paidTotal: (p: { paid: string; total: string }) => `Tổng trả ${p.paid} / ${p.total}`,

  // ── Chia cho ai ──
  splitModeLabel: 'Cách chia',
  splitAmong: 'Chia cho',
  selectAll: 'Chọn tất cả',
  deselectAll: 'Bỏ chọn tất cả',
  sharesPlaceholder: 'phần',

  // ── Chia theo món ──
  addItem: 'Thêm món',
  itemNamePlaceholder: 'Tên món',
  deleteItem: 'Xoá món',
  defaultItemTitle: 'Món',
  defaultBillTitle: 'Hoá đơn',
  defaultExpenseTitle: 'Khoản chi',
  perPerson: (p: { amount: string; count: number }) => `${p.amount}/người · ${p.count} người`,

  // ── Nhập nhanh / AI / quét hoá đơn ──
  quickParseTitle: 'Nhập nhanh bằng một câu',
  quickParsePlaceholder: 'VD: "Ăn tối 500k Hùng trả chia đều"',
  quickFill: 'Điền nhanh',
  aiUnderstand: 'Hiểu thông minh',
  aiThinking: 'Đang hiểu…',
  scanReceipt: 'Quét hoá đơn (chia theo món)',
  scanningReceipt: 'Đang quét hoá đơn…',
  quickParseNoteFree: '“Điền nhanh” miễn phí, tức thì.',
  quickParseNoteAi: '“Hiểu thông minh” dùng AI cho câu phức tạp',
  quickParseNoteFreeQuota: ' · miễn phí 15 lượt/tháng',
  quickParseNoteEditable: 'Kết quả luôn cho bạn sửa lại.',
  quickParseQuotaLeft: (p: { n: number }) => ` · còn ${p.n} lượt tháng này`,
  filledWithQuota: (p: { n: number }) => `Đã điền. Còn ${p.n} lượt AI tháng này.`,
  filledByAi: 'Đã điền bằng AI.',
  parseFailed: 'Không phân tích được.',
  ocrNoItems: 'Không nhận được món nào từ ảnh. Thử ảnh rõ hơn.',
  ocrScanned: (p: { n: number }) => `Đã nhận ${p.n} món.`,
  ocrQuotaLeft: (p: { n: number }) => ` Còn ${p.n} lượt quét tháng này.`,
  ocrFailed: 'Không quét được hoá đơn.',

  // ── Lưu / lỗi ──
  saveExpense: 'Lưu khoản chi',
  saveChanges: 'Lưu thay đổi',
  savedUpdated: 'Đã cập nhật khoản chi',
  savedCreated: 'Đã ghi khoản chi',
  receiptAttachPending: 'Ảnh hoá đơn sẽ được đính kèm khi lưu.',
  receiptAttachFailed: 'Đã lưu khoản chi nhưng chưa đính kèm được ảnh hoá đơn.',
  saveFailed: 'Không lưu được khoản chi.',
  conflictUpdated: 'Khoản chi vừa được người khác cập nhật. Đóng và mở lại để xem bản mới nhất.',
  invalidExpense: 'Khoản chi không hợp lệ.',
  needPayer: 'Chọn ít nhất một người trả.',
  needValidAmount: 'Nhập số tiền hợp lệ.',
  needParticipant: 'Chọn ít nhất một người tham gia.',
  needValidItem: 'Thêm ít nhất một món hợp lệ (có giá và người chia).',
  percentMustBe100: (p: { sum: string }) => `Tổng phần trăm phải bằng 100 (đang ${p.sum}).`,
  exactMustMatch: (p: { expected: string; actual: string }) =>
    `Tổng nhập tay phải bằng ${p.expected} (đang ${p.actual}).`,
  sharesMustBePositive: 'Tổng số phần phải lớn hơn 0.',
  payMustMatch: (p: { expected: string; actual: string }) =>
    `Tổng tiền trả phải bằng ${p.expected} (đang ${p.actual}).`,
  missingExpenseForHistory: 'Thiếu khoản chi để ghi lịch sử.',

  // ── Thông báo hoạt động ──
  someone: 'Ai đó',
  editedExpense: (p: { title: string }) => `Đã sửa “${p.title}”`,
  paidExpense: (p: { name: string; title: string }) => `${p.name} chi “${p.title}”`,

  // ── Chi tiết khoản chi ──
  originalAmount: 'Gốc',
  fxRateLabel: 'tỷ giá',
  payer: 'Người trả',
  payerCount: (p: { n: number }) => `Người trả (${p.n})`,
  items: 'Các món',
  eachShare: 'Mỗi người gánh',
  invalidExpenseData: 'Khoản chi có dữ liệu không hợp lệ.',
  note: 'Ghi chú',
  managePermissionNote: 'Chỉ chủ nhóm hoặc người tạo khoản chi mới được sửa/xoá khoản này.',
  nPeople: (p: { n: number }) => `${p.n} người`,

  // ── Chứng từ ──
  attachments: 'Chứng từ',
  attachmentsEmpty: 'Chưa có chứng từ. Bấm “Thêm” để tải ảnh hoặc PDF.',
  attachmentFallbackName: 'Chứng từ',
  tapToView: 'Bấm để xem',
  deleteAttachment: 'Xoá chứng từ',
  deleteAttachmentConfirm: 'Xoá chứng từ?',
  deleteAttachmentDescription: 'Tệp này sẽ bị xoá vĩnh viễn.',
  fileTooLarge: (p: { name: string }) => `"${p.name}" vượt 10MB.`,
  attachmentUploaded: 'Đã tải chứng từ lên',
  attachmentUploadFailed: 'Tải lên thất bại.',
  attachmentOpenFailed: 'Không mở được chứng từ.',
  attachmentDeleteFailed: 'Không xoá được.',

  // ── Lịch sử chỉnh sửa ──
  viewAll: 'Xem tất cả',
  historyEmpty: 'Chưa có lần chỉnh sửa nào được ghi nhận.',
  moreChanges: (p: { n: number }) => `+${p.n} thay đổi khác`,
  historyUpdatedFallback: 'Đã cập nhật khoản chi',
  historyAdded: (p: { title: string }) => `Đã thêm “${p.title}”`,
  historyDeleted: (p: { title: string }) => `Đã xoá “${p.title}”`,
  historyEdited: (p: { title: string }) => `Đã chỉnh sửa “${p.title}”`,

  // ── Nhãn trường trong lịch sử ──
  fieldTitle: 'Tên khoản',
  fieldAmount: 'Số tiền',
  fieldPaidAt: 'Ngày chi',
  fieldSplitMode: 'Cách chia',
  fieldPayers: 'Người trả',
  fieldParticipants: 'Người gánh',
  fieldNote: 'Ghi chú',
  fieldEmpty: 'Không có',

  // ── Ghi nhanh: chọn nhóm ──
  loadingGroups: 'Đang tải nhóm',
  loadingGroupsHint: 'Splitz đang lấy danh sách nhóm để bạn chọn nơi ghi khoản chi.',
  loadGroupsFailed: 'Không tải được nhóm',
  noGroups: 'Bạn chưa có nhóm nào',
  noGroupsHint: 'Hãy tạo một nhóm trước, sau đó bạn có thể ghi khoản chi và chia tiền cho cả nhóm.',
  createFirstGroup: 'Tạo nhóm đầu tiên',
}
