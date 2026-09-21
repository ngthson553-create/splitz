/**
 * Nhóm namespace `group`: màn nhóm (chi tiêu/quyết toán), sheet cài đặt nhóm,
 * thành viên, QR thanh toán và lỗi từ tầng settlement.
 *
 * KHÔNG dùng `as const`: kiểu literal sẽ bắt bản tiếng Anh phải trùng đúng
 * chữ tiếng Việt. Cần suy ra `string` để `en: typeof vi` chỉ soát key + chữ ký.
 */
export const group = {
  // ── Màn nhóm / tab ──
  expensesTab: 'Chi tiêu',
  settleTab: 'Quyết toán',
  totalSpent: 'Tổng chi',
  expenseNoun: 'Khoản chi',
  members: 'Thành viên',
  groupSpace: 'Không gian nhóm',
  settingsShort: 'Cài đặt',
  addExpense: 'Ghi khoản chi',
  insightAria: 'Phân tích AI',
  insightTitle: (p: { name: string }) => `Phân tích · ${p.name}`,
  backToGroups: 'Về danh sách nhóm',
  loadErrorTitle: 'Không tải được nhóm này.',
  notFoundTitle: 'Không tìm thấy nhóm này.',

  // ── Panel desktop ──
  itemsPending: (p: { n: number }) => `${p.n} mục`,
  pendingSettlements: 'Còn việc quyết toán',
  transfersRemaining: (p: { n: number; amount: string }) =>
    `${p.n} lượt chuyển còn lại, tổng gợi ý đang chờ ${p.amount}.`,
  awaitingConfirmations: 'Có khoản đang chờ xác nhận hai chiều.',
  moreMembers: (p: { n: number }) => `+${p.n} thành viên khác`,
  hasQr: 'Có QR chuyển khoản',

  // ── Sheet cài đặt nhóm ──
  settingsTitle: 'Cài đặt nhóm',
  saveChanges: 'Lưu thay đổi',
  savedToast: 'Đã lưu nhóm',
  namePlaceholder: 'Tên nhóm',
  youAreMemberHint: 'Bạn là thành viên của nhóm này.',
  leaveButKeepHint:
    'Muốn rời nhưng giữ nhóm? Mở một thành viên đã có tài khoản → “Chuyển quyền chủ nhóm”, sau đó bạn mới có thể rời.',

  // ── Thành viên ──
  membersCount: (p: { n: number }) => `Thành viên (${p.n})`,
  defaultMemberName: (p: { n: number }) => `Thành viên ${p.n}`,
  addMember: 'Thêm thành viên',
  memberNameLabel: 'Tên',
  memberNamePlaceholder: 'Tên thành viên',
  owner: 'Chủ nhóm',
  virtualNoAccount: 'Thành viên ảo — chưa có tài khoản',
  noBankAccount: 'Chưa có tài khoản',
  virtualMembersHint:
    'Thành viên “ảo” chỉ có tên; mời họ nhận danh tính để tự quản tài khoản của mình.',
  freeNameHint: 'Gõ tên tự do cho từng thành viên.',
  claimMemberAria: 'Mời nhận thành viên này',
  deleteMemberTitle: (p: { name: string }) => `Xoá ${p.name}?`,
  deleteMemberDesc: 'Thành viên này chưa tham gia khoản chi nào.',

  // ── Mời thành viên ──
  inviteMembers: 'Mời thành viên',
  inviteLink: 'Link mời',
  claimLinkLabel: 'Link nhận thành viên',
  inviteCodeLabel: 'Mã nhóm',
  inviteHint:
    'Chia sẻ link/mã để người khác tham gia. Link “nhận thành viên” gắn người dùng vào đúng tên ảo.',
  inviteError: 'Không tạo được lời mời.',
  copyError: 'Không sao chép được',

  // ── Cách quyết toán ──
  settlementMethodTitle: 'Cách quyết toán',
  methodSmart: 'Thông minh',
  methodMinTransfers: 'Tối thiểu lượt',
  settlementMethodHint:
    '“Thông minh” ghép nợ trực tiếp; “Tối thiểu lượt” gom cụm để giảm số lần chuyển.',

  // ── Báo cáo ──
  reportTitle: 'Báo cáo',
  exportReport: 'Xuất báo cáo PDF (kèm chứng từ)',
  reportHint:
    'Mở cửa sổ in để lưu PDF. Ảnh chứng từ được nhúng; file PDF chứng từ được liệt kê theo khoản chi.',
  reportExportError: 'Không xuất được báo cáo.',

  // ── Vùng nguy hiểm: xoá / rời nhóm ──
  deleteThisGroup: 'Xoá nhóm này',
  deleteGroup: 'Xoá nhóm',
  deleteGroupTitle: (p: { name: string }) => `Xoá nhóm “${p.name}”?`,
  deleteGroupDesc: 'Toàn bộ khoản chi và thành viên sẽ bị xoá vĩnh viễn.',
  deletedToast: 'Đã xoá nhóm',
  leave: 'Rời nhóm',
  leaveTitle: (p: { name: string }) => `Rời nhóm “${p.name}”?`,
  leaveDesc: 'Bạn sẽ không còn thấy nhóm này. Có thể tham gia lại nếu được mời.',
  leftToast: 'Đã rời nhóm',
  leaveError: 'Không rời được nhóm.',
  leaveDebtError: 'Bạn còn nợ trong nhóm. Hãy tất toán hết trước khi rời.',
  leaveCreditError: 'Nhóm còn nợ bạn. Hãy quyết toán xong trước khi rời.',

  // ── Tab quyết toán ──
  nothingToSettleTitle: 'Chưa có gì để quyết toán',
  nothingToSettleDesc: 'Ghi khoản chi trước, Splitz sẽ tự gợi ý cách chuyển tiền tối ưu.',
  allSettledTitle: 'Cả nhóm đã sòng phẳng!',
  allSettledDesc: 'Không còn ai nợ ai. Mọi khoản chi đã được quyết toán xong xuôi.',
  pendingCount: (p: { n: number }) => `Đang chờ xác nhận (${p.n})`,
  awaitingYourConfirm: 'Bạn nhận khoản này?',
  awaitingConfirm: (p: { name: string }) => `Chờ ${p.name} xác nhận`,
  viewProof: 'Xem chứng từ',
  received: 'Đã nhận',
  decline: 'Không nhận',
  waitingConfirm: 'Chờ xác nhận…',
  transfersLeftPrefix: 'Còn',
  transfersLeftCount: (p: { n: number }) => `${p.n} lượt chuyển`,
  transfersLeftSuffix: 'để tất toán công nợ.',
  remindAll: 'Nhắc tất cả',
  pay: 'Thanh toán',
  reminded: 'Đã nhắc',
  remindDebt: 'Nhắc trả nợ',
  settleDisclaimer:
    'Splitz không giữ tiền. Người trả mở sheet thanh toán để quét QR hoặc đính kèm chứng từ, rồi người nhận bấm “Đã nhận” để công nợ được trừ minh bạch.',
  remindedCount: (p: { n: number }) => `Đã nhắc ${p.n} người.`,
  remindSentToast: 'Đã gửi lời nhắc.',
  noDeviceToast: 'Họ chưa bật thông báo nên chưa nhận được nhắc.',
  remindCooldownToast: 'Bạn vừa nhắc gần đây rồi, thử lại sau.',
  remindError: 'Không gửi được lời nhắc.',
  confirmedToast: 'Đã xác nhận nhận tiền',
  confirmError: 'Không xác nhận được.',
  cancelSettleTitle: 'Huỷ quyết toán này?',
  cancelSettleDesc: 'Khoản nợ sẽ quay lại danh sách cần chuyển.',
  cancelSettle: 'Huỷ quyết toán',
  cancelledToast: 'Đã huỷ quyết toán',
  cancelError: 'Không huỷ được.',
  proofOpenError: 'Không mở được chứng từ.',

  // ── Tab chi tiêu ──
  splitEqual: 'Chia đều',
  splitShares: 'Theo phần',
  splitPercent: 'Phần trăm',
  splitExact: 'Nhập tay',
  splitItemized: 'Theo món',
  paidLabel: 'trả',
  deleteForbiddenToast: 'Chỉ chủ nhóm hoặc người tạo khoản chi mới được xoá khoản này.',
  deleteExpenseTitle: (p: { title: string }) => `Xoá “${p.title}”?`,
  deleteExpenseDesc: (p: { amount: string }) => `${p.amount} sẽ bị xoá khỏi nhóm.`,
  expenseConflictToast: 'Khoản chi đã thay đổi, đã tải lại danh sách.',
  deleteExpenseError: 'Không xoá được khoản chi.',
  expenseDeletedTitle: (p: { title: string }) => `Đã xoá “${p.title}”`,
  expenseDeletedToast: 'Đã xoá khoản chi',
  noExpensesTitle: 'Chưa có khoản chi',
  noExpensesDesc: 'Bắt đầu ghi các khoản đã chi để chia cho cả nhóm.',

  // ── Sheet thông tin thành viên ──
  memberSheetTitle: 'Thông tin thành viên',
  hasSplitzAccount: 'Đã có tài khoản Splitz',
  payoutAccount: 'Tài khoản nhận tiền',
  payoutAccountQr: 'Tài khoản nhận tiền (để tạo QR)',
  notConfigured: 'Chưa cấu hình',
  selfManagedBankHint: 'Thành viên tự quản tài khoản của họ trong phần Cài đặt cá nhân.',
  bankLabel: 'Ngân hàng',
  selectBank: '— Chọn ngân hàng —',
  accountNumberLabel: 'Số tài khoản',
  accountNumberPlaceholder: 'VD: 0123456789',
  accountNameLabel: 'Tên chủ tài khoản',
  accountNameHint: 'Viết không dấu, đúng như trên app ngân hàng.',
  accountHolder: 'Chủ tài khoản',
  permissionsTitle: 'Phân quyền',
  transferOwnership: 'Chuyển quyền',
  transferOwnershipFull: 'Chuyển quyền chủ nhóm',
  transferOwnershipTitle: (p: { name: string }) => `Chuyển quyền cho ${p.name}?`,
  transferOwnershipDesc:
    'Người này sẽ trở thành chủ nhóm (sửa/xoá nhóm, quản lý thành viên). Bạn sẽ trở thành thành viên thường.',
  ownershipTransferredToast: 'Đã chuyển quyền chủ nhóm',
  transferOwnershipError: 'Không chuyển được quyền.',

  // ── Sheet QR thanh toán ──
  qrSheetTitle: 'Thanh toán khoản nợ',
  iHavePaid: 'Tôi đã chuyển',
  payOtherWay: 'Thanh toán cách khác + chứng từ',
  accountCopiedToast: 'Đã sao chép số tài khoản',
  qrUnavailableToast: 'Chưa tạo được QR cho khoản này. Hãy thanh toán cách khác và đính kèm chứng từ.',
  markedPaidToast: 'Đã ghi nhận. Chờ người nhận xác nhận.',
  markPaidError: 'Không ghi nhận được.',
  proofTooLarge: 'Chứng từ vượt 10MB.',
  proofUploadedToast: 'Đã ghi nhận kèm chứng từ. Chờ người nhận xác nhận.',
  proofFailedToast: 'Đã ghi nhận chuyển tiền nhưng chưa đính kèm được chứng từ.',
  proofUploadError: 'Không tải được chứng từ thanh toán.',
  qrHintStart: 'Mở app ngân hàng, quét QR và ',
  qrHintHighlight: 'kiểm tra tên người nhận',
  qrHintEnd: ' trước khi xác nhận chuyển.',
  altPaymentHint:
    'Nếu bạn đã thanh toán bằng tiền mặt, app khác hoặc gửi ảnh biên lai, hãy dùng nút chứng từ bên dưới để người nhận xác nhận dễ hơn.',
  noBankHint: ' chưa có tài khoản nhận tiền. Thêm thông tin ngân hàng trong Cài đặt nhóm để tạo QR.',
  altPaymentStillHint: 'Bạn vẫn có thể thanh toán cách khác và đính kèm chứng từ ở nút bên dưới.',

  // ── Lỗi từ tầng settlement ──
  errors: {
    transferAmountPositive: 'Số tiền chuyển phải dương.',
    cannotSelfTransfer: 'Không thể chuyển cho chính mình.',
    totalTransferredInvalid: (p: { memberId: string }) => `Tổng chuyển của ${p.memberId} không hợp lệ.`,
    totalReceivedInvalid: (p: { memberId: string }) => `Tổng nhận của ${p.memberId} không hợp lệ.`,
    balancedMemberNoTx: (p: { memberId: string }) => `Thành viên cân bằng ${p.memberId} không nên có giao dịch.`,
    expenseNeedsParticipants: 'Khoản chi cần ít nhất một người tham gia.',
    totalSharesPositive: 'Tổng số phần chia phải lớn hơn 0.',
    sharesMismatch: 'Tổng phần chia không khớp số tiền khoản chi.',
  },
}
