/**
 * Namespace `adminPages`: console quản trị — metadata module, shell điều hướng,
 * gate truy cập, trang chủ, trang module fallback và trang audit.
 *
 * KHÔNG dùng `as const`: cần suy ra `string` để `en: typeof vi` chỉ soát
 * key + chữ ký hàm, không bắt en trùng chữ vi.
 */
export const adminPages = {
  // ── Nhóm module ──
  group: {
    operations: 'Vận hành',
    growth: 'Tăng trưởng',
    configuration: 'Cấu hình',
    control: 'Kiểm soát',
  },

  // ── Metadata module (consoleModules) ──
  modules: {
    health: {
      label: 'Dashboard vận hành',
      summary: 'Supabase, Edge Functions, Resend, AI, PayOS, tác vụ gần nhất và lỗi gần đây.',
      bullets: ['Thẻ sức khỏe', 'Kiểm tra nhà cung cấp', 'Tác vụ gần nhất', 'Lỗi gần đây'],
    },
    notifications: {
      label: 'Thông báo hệ thống',
      summary: 'Gửi in-app/web push, xem trước, lên lịch, retry và log gửi.',
      bullets: ['Gửi ngay', 'Lên lịch', 'Chọn user/nhóm/gói', 'Xem trước + xác nhận'],
    },
    jobs: {
      label: 'Lịch chạy',
      summary: 'Theo dõi tác vụ đã chạy, sắp chạy, trạng thái và lỗi gần đây.',
      bullets: ['Đang chờ/đang chạy/đã xong/lỗi', 'Chi tiết chỉ đọc', 'Retry/cancel khóa'],
    },
    redeem: {
      label: 'Mã Premium',
      summary: 'Tạo code đơn lẻ/batch, chiến dịch, tra cứu, thu hồi và lịch sử dùng.',
      bullets: ['Code đơn lẻ/batch', 'Prefix chiến dịch', 'Thu hồi code', 'Lịch sử dùng'],
    },
    billing: {
      label: 'Thanh toán / Premium',
      summary: 'Theo dõi gói Premium, đơn thanh toán, PayOS webhook và trạng thái user.',
      bullets: ['Gói Premium', 'Đơn thanh toán', 'Sức khỏe webhook', 'Cấp thủ công có audit'],
    },
    ai: {
      label: 'Điều hành AI',
      summary: 'Bật/tắt AI, quota, model/nhà cung cấp, prompt template và test parser/OCR/insight.',
      bullets: ['Cờ tính năng', 'Quota', 'Nhà cung cấp/model', 'Kết quả test đã lọc'],
    },
    email: {
      label: 'Email / Resend',
      summary: 'Kiểm tra Resend, gửi test email, template và lỗi gửi.',
      bullets: ['Sức khỏe Resend', 'Test email', 'Template', 'Lỗi gửi'],
    },
    config: {
      label: 'Cài đặt hệ thống',
      summary: 'Cờ tính năng, kill switch, banner bảo trì và giới hạn gói.',
      bullets: ['Cờ tính năng', 'Giới hạn gói', 'Bảo trì', 'Chế độ duyệt'],
    },
    support: {
      label: 'Hỗ trợ user / nhóm',
      summary: 'Màn hỗ trợ chỉ đọc cho user, nhóm, Premium, redeem và lượt dùng AI.',
      bullets: ['Tra user', 'Vai trò trong nhóm', 'Premium', 'Ưu tiên chỉ đọc'],
    },
    adminAccess: {
      label: 'Quyền admin',
      summary: 'Quản lý người có quyền vào console, vai trò, trạng thái và audit bắt buộc.',
      bullets: ['Owner-only', 'Role/status', 'Audit bắt buộc', 'Không thao tác SQL'],
    },
    releases: {
      label: 'Thông báo phiên bản',
      summary: 'Soạn thông báo trong app và gắn với chiến dịch notification.',
      bullets: ['Nháp/xuất bản', 'Xem trước', 'Liên kết chiến dịch'],
    },
    dataQuality: {
      label: 'Kiểm tra dữ liệu',
      summary: 'Bộ quét phát hiện dữ liệu bất thường, cleanup chỉ sau khi có rule.',
      bullets: ['Bộ quét chỉ đọc', 'Danh sách lỗi', 'Dry-run trước cleanup'],
    },
    audit: {
      label: 'Lịch sử thao tác',
      summary: 'Lịch sử thao tác admin, payload đã redact, trạng thái và lỗi.',
      bullets: ['Người thao tác/action/thời gian', 'Tóm tắt payload', 'Thành công/thất bại', 'Bộ lọc'],
    },
  },

  // ── Shell điều hướng ──
  shell: {
    backToApp: 'Về Splitz',
    today: 'Hôm nay',
    showAdvancedMenu: 'Mở menu nâng cao',
    hideAdvancedMenu: 'Ẩn menu nâng cao',
    toReview: 'Việc cần xem',
    homeSummary: 'Màn no-code cho việc cần xử lý, thao tác nhanh và đường vào phần nâng cao.',
  },

  // ── Gate truy cập ──
  gate: {
    openingTitle: 'Đang mở Splitz',
    openingDescription: 'Vui lòng chờ trong giây lát.',
  },

  // ── useConsoleAccess ──
  contextMissingProvider: 'useConsoleAccess phải nằm trong ConsoleAccessProvider.',

  // ── Trang chủ console ──
  home: {
    advancedModeBadge: 'Chế độ nâng cao',
    today: 'Hôm nay',
    intro:
      'Mở console là biết việc nào cần xem trước, thao tác nào làm nhanh, phần nào chỉ dùng khi cần đi sâu. Các action quan trọng vẫn đi qua guard, preview, confirm và audit.',
    securityLabel: 'Bảo mật',
    securityValue: 'Guard admin',
    auditLabel: 'Ghi nhận',
    auditValue: 'Audit bật',
    priorityLabel: 'Ưu tiên',
    priorityValue: 'Theo việc cần làm',
    quickGuideTitle: 'Cách dùng gọn nhất',
    quickGuideSubtitle: 'Xem cảnh báo trước, thao tác sau',
    guideNoLinkInApp: 'Không lộ link trong app user',
    guideNoSecretFrontend: 'Không secret trong frontend',
    guideUserRedirect: 'User thường vào /console sẽ về home',
    prioritiesTitle: 'Trung tâm ưu tiên',
    prioritiesDescription: 'Cần xử lý trước: mở đúng nơi cần xem, không phải đọc hết mọi module.',
    noHiddenScan: 'Không chạy scan ngầm',
    suggestedNextStep: 'Cách xử lý gợi ý',
    quickTasksTitle: 'Việc nhanh',
    quickTasksDescription: 'Các tác vụ vận hành hay dùng, mở đúng màn hình ngay.',
    guidedBadge: 'Guided',
    guidedFlowBadge: 'Quy trình được hướng dẫn',
    beforeYouStart: 'Trước khi làm',
    steps: 'Các bước',
    confirmReminder: 'Nhắc trước khi mở màn',
    noHiddenActions: 'Không chạy hành động ngầm',
    quickHealthTitle: 'Sức khỏe nhanh',
    healthSystemLabel: 'Hệ thống',
    healthSystemValue: 'Xem sức khỏe',
    healthJobsLabel: 'Lịch chạy',
    healthJobsValue: 'Theo dõi tác vụ',
    healthDataLabel: 'Dữ liệu',
    healthDataValue: 'Bộ quét chỉ đọc',
    advancedTitle: 'Nâng cao',
    advancedDeepOnly: 'Chỉ dùng khi cần đi sâu theo module, xem log hoặc xử lý trường hợp cụ thể.',
    advancedOffHint: 'Chế độ nâng cao đang tắt. Chỉ mở khi cần đi sâu hơn mức vận hành thường ngày.',
    hideAdvanced: 'Ẩn chế độ nâng cao',
    showAdvanced: 'Mở chế độ nâng cao',
    advancedOnBadge: 'Chế độ nâng cao đang bật',
    moduleCount: (p: { n: number }) => `${p.n} module`,
    advancedShortBadge: 'Nâng cao',
    notForDailyTasks: 'Không dành cho tác vụ thường ngày',
    advancedClosedTitle: 'Chế độ nâng cao đang đóng.',
  },

  // ── Việc nhanh được hướng dẫn ──
  guided: {
    redeem: {
      title: 'Tạo mã Premium',
      description: 'Tạo code theo ngày/tháng, batch hoặc kiểm tra code đang có.',
      badge: 'Redeem',
      beforeYouStart: ['Chọn số ngày Premium', 'Kiểm tra prefix campaign'],
      steps: ['Mở form tạo code', 'Chọn plan và hạn dùng', 'Lưu và kiểm tra lại code'],
      confirmNote: 'Kiểm tra code sau khi tạo, rồi xem lịch sử dùng để chắc code chạy đúng.',
      actionLabel: 'Mở Mã Premium',
    },
    notifications: {
      title: 'Gửi thông báo hệ thống',
      description: 'Soạn, preview và gửi in-app/web push có kiểm soát.',
      badge: 'Push',
      beforeYouStart: ['Chọn đúng nhóm người nhận', 'Kiểm tra nội dung preview'],
      steps: ['Soạn nội dung', 'Chọn target', 'Xác nhận lịch gửi'],
      confirmNote: 'Chỉ gửi khi đã kiểm tra preview và phạm vi nhận.',
      actionLabel: 'Mở Thông báo hệ thống',
    },
    support: {
      title: 'Kiểm tra user',
      description: 'Tra profile, nhóm, Premium, redeem, AI usage ở chế độ đọc.',
      badge: 'Support',
      beforeYouStart: ['Chuẩn bị email hoặc ID user', 'Xác định cần xem phần nào'],
      steps: ['Tra user', 'Xem nhóm và Premium', 'Đọc lịch sử liên quan'],
      confirmNote: 'Trạng thái hỗ trợ chỉ đọc, không sửa dữ liệu tài chính.',
      actionLabel: 'Mở Hỗ trợ user / nhóm',
    },
    config: {
      title: 'Bật banner bảo trì',
      description: 'Đi tới cài đặt hệ thống, maintenance banner và kill switch.',
      badge: 'Config',
      beforeYouStart: ['Kiểm tra thời gian bảo trì', 'Soạn nội dung ngắn, rõ ràng'],
      steps: ['Mở cài đặt hệ thống', 'Bật maintenance banner', 'Lưu và kiểm tra lại'],
      confirmNote: 'Banner chỉ nên bật khi đã thống nhất thời gian và nội dung.',
      actionLabel: 'Mở Cài đặt hệ thống',
    },
    releases: {
      title: 'Soạn thông báo phiên bản',
      description: 'Viết release note và chuẩn bị announcement trong app.',
      badge: 'Release',
      beforeYouStart: ['Tóm tắt thay đổi bằng 3-4 ý', 'Chọn giọng văn ngắn gọn'],
      steps: ['Viết nội dung', 'Xem lại preview', 'Gắn vào announcement'],
      confirmNote: 'Nên tránh chi tiết kỹ thuật dài trong thông báo này.',
      actionLabel: 'Mở Thông báo phiên bản',
    },
    email: {
      title: 'Gửi email test',
      description: 'Kiểm tra Resend, template và lỗi gửi gần đây.',
      badge: 'Email',
      beforeYouStart: ['Chọn email nhận test', 'Chọn template đúng mục đích'],
      steps: ['Mở màn hình email', 'Gửi test', 'Đọc log phản hồi'],
      confirmNote: 'Nếu email test không đến, xem log trước khi đổi cấu hình.',
      actionLabel: 'Mở Email / Resend',
    },
  },

  // ── Trung tâm ưu tiên ──
  issues: {
    health: {
      title: 'Kiểm tra sức khỏe hệ thống',
      signal: 'Dùng khi cần biết Supabase, Edge Functions, Resend, AI, PayOS hoặc push có đang ổn không.',
      nextStep: 'Mở dashboard vận hành, đọc card failed/missing trước rồi mới mở module sâu.',
      actionLabel: 'Mở Dashboard vận hành',
    },
    jobs: {
      title: 'Xem lịch chạy bị lỗi',
      signal:
        'Dùng khi thấy notification job, reminder hoặc admin job chạy chậm, failed hoặc cần kiểm tra trạng thái gần nhất.',
      nextStep: 'Mở lịch chạy, lọc failed/running rồi đọc lỗi mới nhất trước khi retry thủ công.',
      actionLabel: 'Xem Lịch chạy',
    },
    dataQuality: {
      title: 'Kiểm tra dữ liệu bất thường',
      signal:
        'Dùng khi nghi ngờ group thiếu owner, subscription lệch, payment pending lâu hoặc redeem count không khớp.',
      nextStep: 'Mở scanner read-only, xem issue critical trước; cleanup vẫn khóa nếu chưa có rule.',
      actionLabel: 'Mở Kiểm tra dữ liệu',
    },
    audit: {
      title: 'Xem lại thao tác admin',
      signal: 'Dùng khi cần biết ai đã tạo code, gửi thông báo, đổi config hoặc action nào vừa failed.',
      nextStep: 'Mở lịch sử thao tác, lọc failed hoặc action liên quan rồi đọc payload đã redact.',
      actionLabel: 'Mở Lịch sử thao tác',
    },
  },

  priority: {
    high: 'Ưu tiên cao',
    medium: 'Ưu tiên vừa',
    low: 'Theo dõi sau',
  },

  // ── Trang module chưa triển khai ──
  modulePage: {
    notImplementedBadge: 'Chưa triển khai',
    actionLocked: 'Action khóa',
    scopeTitle: 'Phạm vi module',
    phaseStatusTitle: 'Trạng thái Phase 1',
    phaseStatusDescription:
      'Route đã sẵn trong console shell. Backend action, dữ liệu thật và audit log sẽ được nối ở phase tương ứng.',
    apiLabel: 'API thật',
    apiNotCalled: 'Chưa gọi',
    auditLabel: 'Audit',
    auditPhaseValue: 'Phase 2',
    confirmLabel: 'Confirm',
    confirmLaterValue: 'Bắt buộc sau',
  },

  // ── Trang audit ──
  audit: {
    phaseBadge: 'Phase 2',
    rpcBadge: 'RPC admin',
    title: 'Lịch sử thao tác',
    description:
      'Lịch sử thao tác admin được đọc qua RPC có guard. Payload hiển thị ở dạng tóm tắt đã redact để tránh lộ secret.',
    refresh: 'Làm mới',
    filterAll: 'Tất cả',
    success: 'Thành công',
    failed: 'Thất bại',
    viewingLabel: 'Log đang xem',
    filterPlaceholder: 'Lọc theo action, ví dụ redeem.create',
    emptyTitle: 'Chưa có audit log',
    emptyDescription: 'Khi admin action thật được mở ở các phase sau, log sẽ xuất hiện tại đây.',
    unknownActor: 'Chưa rõ người thao tác',
    unknownRole: 'chưa rõ vai trò',
    systemTarget: 'hệ thống',
    detailTitle: 'Chi tiết log',
    actorLabel: 'Người thao tác',
    roleLabel: 'Vai trò',
    timeLabel: 'Thời gian',
    targetLabel: 'Đối tượng',
    unknown: 'Chưa rõ',
    unknownRoleShort: 'chưa rõ',
    errorLabel: 'Lỗi',
    payloadSummary: 'Tóm tắt payload',
    noLogTitle: 'Chưa chọn log',
    noLogDescription: 'Chọn một dòng audit để xem payload và lỗi chi tiết.',
  },
}
