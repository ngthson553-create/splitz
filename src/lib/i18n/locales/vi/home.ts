/**
 * Namespace `home`: dashboard, danh sách nhóm, tham gia nhóm, tạo nhóm,
 * gộp công nợ liên nhóm, phân tích chi tiêu và điều hướng.
 *
 * KHÔNG dùng `as const`: cần suy ra `string` để `en: typeof vi` chỉ soát
 * key + chữ ký hàm, không bắt en trùng chữ vi.
 */
export const home = {
  // ── Dashboard ──
  greeting: (p: { name: string }) => `Chào ${p.name} 👋`,
  hello: 'Xin chào 👋',
  profile: 'Hồ sơ',
  welcomeTitle: 'Chào mừng đến Splitz',
  welcomeDescription: 'Tạo nhóm đầu tiên để bắt đầu ghi chi tiêu và chia tiền sòng phẳng.',
  createFirstGroup: 'Tạo nhóm đầu tiên',
  loadFailedTitle: 'Không tải được nhóm',
  aiInsightTitle: 'Phân tích chi tiêu bằng AI',
  aiInsightSubtitle: 'Nhận xét chi tiêu, xu hướng & gợi ý quyết toán',
  insightTitle: 'Phân tích chi tiêu',
  needsSettlement: 'Cần quyết toán',
  recent: 'Gần đây',
  viewGroups: 'Xem nhóm',
  allSettled: 'Bạn đã sòng phẳng',
  youOwe: 'Bạn đang nợ',
  youAreOwed: 'Bạn được nhận',
  details: 'Chi tiết',
  toReceive: 'Được nhận',
  toPay: 'Còn nợ',
  totalSpendAllGroups: 'Tổng chi tiêu các nhóm',
  setNameHint: 'Đặt tên của bạn trong Cài đặt để xem bạn đang nợ hay được nhận.',
  oweAmount: (p: { amount: string }) => `Nợ ${p.amount}`,
  receiveAmount: (p: { amount: string }) => `Nhận ${p.amount}`,
  notSettled: 'Chưa quyết toán',
  paidBy: (p: { name: string }) => `${p.name} trả`,

  // ── Gộp công nợ liên nhóm ──
  crossGroupTitle: 'Gộp công nợ liên nhóm',
  crossGroupMergeHint: (p: { n: number }) => `Có thể gộp với ${p.n} người qua nhiều nhóm.`,
  unlock: 'Mở khoá',
  youPay: 'Bạn trả',
  youReceive: 'Bạn nhận',
  totalToPay: 'Cần trả',
  sharedGroups: (p: { n: number }) => `${p.n} nhóm chung`,
  receiveShort: 'Nhận',
  payShort: 'Trả',
  openSettleTab: 'Mở tab quyết toán',

  // ── Danh sách nhóm ──
  groups: 'Nhóm',
  groupsEmptyTitle: 'Chưa có nhóm nào',
  join: 'Tham gia',
  joinByCode: 'Tham gia bằng mã/link',
  createGroup: 'Tạo nhóm',
  needsSettleShort: 'Cần QT',
  totalSpendLabel: 'Tổng chi',
  noMembers: 'Chưa có ai',

  // ── Tham gia nhóm ──
  joinGroup: 'Tham gia nhóm',
  joinedToast: 'Đã tham gia nhóm',
  joinFailed: 'Không tham gia được.',
  loginRequiredTitle: 'Cần đăng nhập để tham gia',
  loginRequiredDescription:
    'Tham gia nhóm bằng link/mã chỉ hoạt động khi dùng tài khoản Splitz (chế độ đám mây).',
  backHome: 'Về trang chủ',
  invalidInviteTitle: 'Lời mời không hợp lệ',
  invalidInviteDescription: 'Lời mời có thể đã hết hạn hoặc bị thu hồi.',
  invitedTo: 'Bạn được mời tham gia',
  memberCount: (p: { n: number }) => `${p.n} thành viên`,
  claimIdentity: (p: { name: string }) => `Nhận danh tính “${p.name}” trong nhóm`,
  inviteExpired: 'Lời mời đã hết hạn hoặc hết lượt.',
  loginToJoin: 'Đăng nhập để tham gia',
  joinHintPaste: 'Dán',
  joinHintLinkInvite: 'link mời',
  joinHintOrEnter: 'hoặc nhập',
  joinHintGroupCode: 'mã nhóm',
  joinHintSuffix: 'bạn nhận được để tham gia.',
  inviteFieldLabel: 'Link mời hoặc mã nhóm',
  invitePlaceholder: 'VD: ABC123 hoặc https://…/join/…',
  continueLabel: 'Tiếp tục',

  // ── Quản lý nhóm ──
  editGroup: 'Sửa nhóm',
  groupName: 'Tên nhóm',
  editNameAndEmoji: 'Sửa tên & biểu tượng',
  deleteGroup: 'Xoá nhóm',
  deleteConfirmTitle: (p: { name: string }) => `Xoá nhóm “${p.name}”?`,
  deleteConfirmDescription: 'Toàn bộ khoản chi và thành viên trong nhóm sẽ bị xoá vĩnh viễn.',
  updatedToast: 'Đã cập nhật nhóm',
  deletedToast: 'Đã xoá nhóm',

  // ── Tạo nhóm ──
  newGroupTitle: 'Tạo nhóm mới',
  groupNameExample: 'VD: Đà Lạt tháng 6, Ăn trưa team…',
  creating: 'Đang tạo…',
  addOthersCloud: 'Thêm người khác (bạn đã là thành viên)',
  members: 'Thành viên',
  memberNamePlaceholder: (p: { n: number }) => `Tên thành viên ${p.n}`,
  removeMember: 'Xóa',
  addMember: 'Thêm thành viên',
  createFailed: 'Không tạo được nhóm.',

  // ── Phân tích chi tiêu ──
  insightIntroDescription:
    'Splitz đọc số liệu của bạn và rút ra nhận xét: chi nhiều cho việc gì, ai chi nhiều, xu hướng tháng này và gợi ý quyết toán.',
  observationLabel: 'Nhận xét',
  aiDisclaimer: 'Số liệu do Splitz tính chính xác; phần nhận xét do AI viết nên có thể chưa hoàn hảo.',
  quotaOutMessage:
    'Bạn đã dùng hết lượt phân tích miễn phí tháng này. Nâng cấp Premium để phân tích không giới hạn (mở trong Cài đặt → Gói).',
  analyzing: 'Đang phân tích…',
  reanalyze: 'Phân tích lại',
  generateInsight: 'Tạo phân tích',
  insightFailed: 'Không tạo được phân tích.',
  freeRemaining: (p: { n: number }) =>
    `Miễn phí — còn ${p.n} lượt phân tích AI tháng này. Premium dùng không giới hạn.`,

  // ── Điều hướng ──
  navHome: 'Trang chủ',
  navNotifications: 'Thông báo',
  navSettings: 'Cài đặt',
  addExpense: 'Thêm khoản chi',
  navTagline: 'Chia tiền nhóm',
  recordExpense: 'Ghi khoản chi',
  notHoldingFunds: 'Không giữ tiền',
  transparencyNote: 'Splitz chỉ ghi chép, tạo QR và xác nhận hai chiều để công nợ minh bạch.',
}
