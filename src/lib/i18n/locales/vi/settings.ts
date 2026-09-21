export const settings = {
  title: 'Cài đặt',
  sectionAccount: 'Tài khoản',
  sectionApp: 'Ứng dụng',
  sectionSupport: 'Hỗ trợ & pháp lý',

  unnamed: 'Chưa đặt tên',
  cloudAccount: 'Tài khoản cloud',
  localProfile: 'Hồ sơ cục bộ',

  bankAccount: 'Tài khoản nhận tiền',
  signIn: 'Đăng nhập',
  signInHint: 'Google · Zalo — đồng bộ nhiều thiết bị',
  notEnabled: 'Chưa bật',

  appearance: 'Giao diện',
  language: 'Ngôn ngữ',
  data: 'Dữ liệu & lưu trữ',

  faq: 'Hỏi đáp',
  terms: 'Điều khoản sử dụng',
  privacy: 'Chính sách bảo mật',
  tagline: 'Splitz v1.2 · Chia tiền nhóm sòng phẳng',

  // Màn Ngôn ngữ
  languageSubtitle: 'Chọn ngôn ngữ hiển thị',
  languageNote:
    'Số tiền luôn tính bằng VND. Đổi ngôn ngữ chỉ đổi cách hiển thị ngày tháng và nhóm chữ số.',
  langNameVi: 'Tiếng Việt',
  langNameEn: 'English',

  // Chung
  back: 'Quay lại',

  // Màn Hồ sơ
  profileTitle: 'Hồ sơ',
  profileSaved: 'Đã lưu hồ sơ',
  changeAvatar: 'Đổi ảnh đại diện',
  avatarUpdated: 'Đã cập nhật ảnh đại diện',
  avatarRemoved: 'Đã gỡ ảnh đại diện',
  removeAvatar: 'Gỡ ảnh',
  avatarError: 'Không xử lý được ảnh',
  imageFileRequired: 'Vui lòng chọn tệp ảnh',
  displayNameLabel: 'Tên hiển thị',
  displayNameHint: 'Tên này hiển thị cho các thành viên trong nhóm của bạn.',
  namePlaceholder: 'Nhập tên của bạn',
  save: 'Lưu',
  signOut: 'Đăng xuất',
  signOutConfirmTitle: 'Đăng xuất?',
  signOutConfirmDesc: 'Bạn sẽ cần đăng nhập lại để tiếp tục dùng Splitz.',

  // Màn Tài khoản nhận tiền
  bankTitle: 'Tài khoản nhận tiền',
  bankInfoDesc: 'Thông tin này để các thành viên cùng nhóm tạo mã QR chuyển khoản cho bạn.',
  bankSaved: 'Đã lưu tài khoản nhận tiền',
  saveBank: 'Lưu tài khoản',
  bankMissing: 'Điền đủ thông tin ngân hàng.',
  saveFailed: 'Không lưu được.',

  // Màn Giao diện
  appearanceTitle: 'Giao diện',
  chooseStyle: 'Chọn phong cách hiển thị',
  themeLight: 'Sáng',
  themeDark: 'Tối',
  toggleThemeAria: 'Chuyển chế độ sáng tối',
  prestigePremiumOnly: 'Giao diện Prestige chỉ dành cho thành viên Premium.',
  prestigeLockedNote: 'Giao diện Prestige (thẻ đen · viền vàng) dành riêng cho Premium.',

  // Màn Dữ liệu & lưu trữ
  dataTitle: 'Dữ liệu & lưu trữ',
  cloudMode: 'Đồng bộ cloud',
  localMode: 'Lưu trên thiết bị',
  cloudModeDesc: 'Dữ liệu đồng bộ qua Supabase',
  localModeDesc: (p: { n: number }) => `Đang lưu ${p.n} nhóm trên trình duyệt`,
  signInComingSoon: 'Đăng nhập (sắp có) để đồng bộ nhiều thiết bị.',
  clearDataTitle: 'Xoá toàn bộ dữ liệu?',
  clearDataDesc: 'Mọi nhóm trên máy này sẽ bị xoá. Hành động không thể hoàn tác.',
  clearDataConfirm: 'Xoá hết',
  localDataCleared: 'Đã xoá dữ liệu trên máy',
  clearLocalData: 'Xoá dữ liệu trên máy',
  transparentTitle: 'Minh bạch & an toàn',
  transparentDesc:
    'Splitz không giữ tiền, không làm trung gian thanh toán. Mã QR được tạo trực tiếp từ thông tin tài khoản người nhận. Luôn kiểm tra tên người nhận trong app ngân hàng trước khi chuyển.',

  // PlanSheet — Nâng cấp Premium
  upgradeTitle: 'Nâng cấp Premium',
  currentPlan: 'Gói hiện tại:',
  planPersonal: 'Cá nhân',
  cycleMonth: 'Tháng',
  cycleYear: 'Năm (rẻ hơn)',
  perMonth: '/tháng',
  perYear: '/năm',
  featureUnlimitedGroups: 'Không giới hạn nhóm',
  featureMaxMembers: 'Tối đa 25 thành viên/nhóm',
  featureUnlimitedAi: 'AI nhập chi không giới hạn',
  featureExportPdf: 'Xuất PDF, đa tiền tệ',
  featureTeamSeats: '5 ghế premium cho cả nhóm',
  payWithPayos: 'Thanh toán qua PayOS',
  payFailed: 'Không tạo được thanh toán.',
  hasActivationCode: 'Có mã kích hoạt?',
  codePlaceholder: 'Nhập mã',
  redeem: 'Kích hoạt',
  planActivated: (p: { plan: string }) => `Đã kích hoạt gói ${p.plan}`,
  invalidCode: 'Mã không hợp lệ.',
  payosNote:
    'Thanh toán xử lý qua PayOS. Gói gia hạn bán tự động — bạn chủ động thanh toán mỗi chu kỳ.',

  // UpgradePrompt — gợi ý nâng cấp
  closeAria: 'Đóng',
  unlockTitle: 'Mở khoá Splitz Premium',
  unlockDesc:
    'Không giới hạn nhóm, gộp công nợ liên nhóm, quỹ nhóm, chi định kỳ — cùng giao diện Prestige thẻ đen viền vàng.',
  perkUnlimited: 'Không giới hạn nhóm · 25 thành viên/nhóm',
  perkAi: 'AI nhập chi không giới hạn',
  perkPrestige: 'Giao diện Prestige độc quyền',
  viewPlans: 'Xem các gói',
  later: 'Để sau',
  neverAgain: 'Không nhắc nữa',

  // Màn Thông báo
  notificationsTitle: 'Thông báo',
  markAllRead: 'Đánh dấu đã đọc',
  tabActivity: 'Hoạt động',
  tabSystem: 'Hệ thống',
  emptyActivityTitle: 'Chưa có hoạt động',
  emptyActivityDesc: 'Khi nhóm có khoản chi mới, sửa hoặc xoá, chúng sẽ xuất hiện ở đây.',
  emptySystemTitle: 'Không có thông báo hệ thống',
  emptySystemDesc: 'Cập nhật về tài khoản và phiên bản app sẽ hiển thị tại đây.',

  // Dòng gói / thông báo / sáng-tối ở màn Cài đặt
  planLabel: (p: { plan: string }) => `Gói ${p.plan}`,
  expiringInDays: (p: { n: number }) => `Sắp hết hạn trong ${p.n} ngày`,
  expiresOn: (p: { date: string }) => `Hết hạn ${p.date}`,
  planActive: 'Đang kích hoạt',
  quotaLine: (p: { groups: string; members: string }) => `${p.groups} nhóm · ${p.members} thành viên`,
  pushTitle: 'Thông báo đẩy',
  pushDesc: 'Nhắc gia hạn gói, hoạt động nhóm',
  pushToggleAria: 'Bật/tắt thông báo',
  pushEnabledToast: 'Đã bật thông báo đẩy',
  pushDisabledToast: 'Đã tắt thông báo đẩy',
  pushToggleFailed: 'Không đổi được thông báo.',
  themeMode: (p: { mode: string }) => `Chế độ ${p.mode}`,
  themeQuickToggle: 'Chạm để chuyển nhanh',
  themeToggleAria: 'Chuyển chế độ sáng tối',
}
