/**
 * Chuỗi dùng lại ở nhiều màn: nút, nhãn trạng thái, lỗi chung.
 *
 * KHÔNG dùng `as const`: kiểu literal sẽ bắt bản tiếng Anh phải trùng đúng
 * chữ tiếng Việt. Cần suy ra `string` để `en: typeof vi` chỉ soát key + chữ ký.
 */
export const common = {
  appTitle: 'Splitz — Chia tiền nhóm sòng phẳng',
  save: 'Lưu',
  cancel: 'Huỷ',
  close: 'Đóng',
  delete: 'Xoá',
  edit: 'Sửa',
  back: 'Quay lại',
  retry: 'Thử lại',
  confirm: 'Xác nhận',
  loading: 'Đang tải…',
  done: 'Xong',
  add: 'Thêm',
  search: 'Tìm kiếm',
  copy: 'Sao chép',
  copied: 'Đã sao chép',
  share: 'Chia sẻ',
  you: 'Bạn',
  optional: 'Không bắt buộc',
  somethingWentWrong: 'Có lỗi xảy ra',
  networkError: 'Mất kết nối tới máy chủ.',
  notFound: 'Không tìm thấy trang',

  // Màn lỗi / trạng thái dùng chung
  backHome: 'Về trang chủ',
  routeNotFoundBody: 'Đường dẫn không tồn tại hoặc đã thay đổi.',
  crashMessage: 'Splitz gặp sự cố không mong muốn. Dữ liệu của bạn vẫn an toàn.',
  crashMessageDevice: 'Splitz gặp sự cố không mong muốn. Dữ liệu của bạn vẫn an toàn trên máy.',
  loadFailed: 'Không tải được dữ liệu.',
  skip: 'Bỏ qua',
  loadingApp: 'Đang mở Splitz',
  pleaseWait: 'Vui lòng chờ trong giây lát.',

  // Cài đặt app lên màn hình chính (PWA)
  installTitle: 'Cài Splitz vào màn hình chính',
  installSubtitle: 'Mở nhanh như app, dùng được khi offline.',
  installAction: 'Cài',

  // Thông tin ngân hàng
  bank: 'Ngân hàng',
  selectBank: 'Chọn ngân hàng',
  scanQr: 'Quét QR',
  accountNumber: 'Số tài khoản',
  accountNumberPlaceholder: 'VD: 0123456789',
  accountName: 'Tên chủ tài khoản',
  accountNameHint: 'Viết IN HOA không dấu để khớp mã QR chuyển khoản.',
  accountNamePlaceholder: 'VD: NGUYEN VAN A',

  // Nhóm & gói
  newGroup: 'Nhóm mới',
  planPersonal: 'Cá nhân',
  planTeam: 'Team',

  // Lịch sử & chứng từ
  expenseUpdatedSummary: 'Đã cập nhật khoản chi',
  attachmentFallback: 'Chứng từ',

  // Báo cáo PDF
  reportTitle: 'Báo cáo',
  reportSubtitle: 'Báo cáo chia tiền — xuất ngày {date} · Splitz',
  reportTotalSpent: 'Tổng chi',
  reportBalancesTitle: 'Số dư từng người (sau quyết toán)',
  reportNoData: 'Chưa có dữ liệu',
  reportTransfersTitle: 'Cần chuyển',
  reportStatusTitle: 'Trạng thái',
  reportSettled: 'Đã sòng phẳng.',
  reportExpensesTitle: 'Khoản chi',
  reportNoExpenses: 'Chưa có khoản chi',
  reportFooter: 'Splitz không giữ tiền, không xử lý thanh toán. Báo cáo này do người dùng tự xuất.',
  reportAttachments: 'Chứng từ',
  reportOpen: 'mở',
  reportReceivable: 'được nhận',
  reportOwes: 'còn nợ',
  reportSettledUp: 'đã xong',

  // Tên tiền tệ (mục chọn ngoại tệ)
  currencyVnd: 'Việt Nam Đồng',
  currencyUsd: 'Đô la Mỹ',
  currencyEur: 'Euro',
  currencyJpy: 'Yên Nhật',
  currencyKrw: 'Won Hàn',
  currencyThb: 'Baht Thái',
  currencySgd: 'Đô la Singapore',
  currencyCny: 'Nhân dân tệ',
  currencyGbp: 'Bảng Anh',
  currencyAud: 'Đô la Úc',
}
