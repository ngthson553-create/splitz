/** Thông báo lỗi ném từ tầng lõi (settlement, dữ liệu, mạng). */
export const errors = {
  invalidAmount: 'Số tiền không hợp lệ.',
  balancesMustSumToZero: 'Tổng số dư phải bằng 0.',
  expenseOutdated: 'Khoản chi vừa được cập nhật. Vui lòng tải lại.',

  // Tỷ giá & đa tiền tệ
  rateFetchFailed: 'Không lấy được tỷ giá.',
  rateInvalid: 'Tỷ giá không hợp lệ.',

  // Ảnh & tệp
  fileReadFailed: 'Không đọc được tệp ảnh.',
  imageLoadFailed: 'Không tải được ảnh.',
  imageUnsupported: 'Không đọc được ảnh này. Hãy thử ảnh JPG/PNG khác hoặc chụp lại rõ hơn.',
  imageHeicUnsupported: 'Ảnh HEIC/HEIF này chưa đọc được trên thiết bị hiện tại. Hãy đổi sang JPG/PNG hoặc chụp lại rõ hơn.',

  // Đăng nhập / tài khoản
  notSignedIn: 'Chưa đăng nhập.',
  accountMissingEmail: 'Tài khoản không có email — không thể định danh.',
  zaloNotConfigured: 'Chưa cấu hình VITE_ZALO_APP_ID.',
  zaloSessionInvalid: 'Phiên đăng nhập Zalo không hợp lệ. Thử lại.',
  zaloStateMismatch: 'State không khớp (bảo mật).',
  zaloProfileFailed: 'Không lấy được thông tin Zalo. Thử lại.',
  zaloLinkSessionMissing: 'Không tìm thấy phiên liên kết Zalo. Thử lại.',

  // Thông báo đẩy
  pushUnsupported: 'Trình duyệt không hỗ trợ hoặc chưa cấu hình thông báo đẩy.',
  pushPermissionDenied: 'Bạn chưa cho phép nhận thông báo.',

  // Dữ liệu & thanh toán
  unknownError: 'Lỗi không xác định.',
  paymentLinkFailed: 'Không tạo được link thanh toán.',
  redeemCodeInvalid: 'Mã không hợp lệ.',
  signedUrlFailed: 'Không tạo được link xem.',
  settlementNoProof: 'Quyết toán này chưa có chứng từ.',
  groupMissing: 'Nhóm không tồn tại.',
  remindSendFailed: 'Không gửi được lời nhắc.',
  createdGroupMissing: 'Không tải được nhóm vừa tạo.',
  createdSettlementIdMissing: 'Không lấy được mã quyết toán vừa tạo.',

  // AI
  parseFailed: 'Không phân tích được.',
  insightFailed: 'Không tạo được phân tích.',
  ocrFailed: 'Không quét được hoá đơn.',

  // Báo cáo & QR ngân hàng
  popupBlocked: 'Trình duyệt chặn cửa sổ. Hãy cho phép pop-up để xuất báo cáo.',
  qrNotFound: 'Không đọc được mã QR trong ảnh. Thử ảnh rõ hơn.',
  qrNotBankQr: 'Đây không phải mã QR ngân hàng VietQR hợp lệ.',
  qrBankUnknown: 'Đã điền số tài khoản. Không nhận diện được ngân hàng — chọn thủ công.',
  qrScanFailed: 'Lỗi khi quét QR. Thử lại.',

  // Hook dùng sai vị trí (lỗi lập trình)
  hookOutsideProvider: '{fn} phải nằm trong {provider}.',

  supabaseNotConfigured:
    'Supabase chưa được cấu hình (thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
}
