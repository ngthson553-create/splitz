export const auth = {
  // Màn Đăng nhập
  tagline: 'Chia tiền nhóm thông minh — minh bạch, nhanh gọn, tạo QR chuyển khoản tức thì.',
  continueWithGoogle: 'Tiếp tục với Google',
  continueWithZalo: 'Tiếp tục với Zalo',
  comingSoon: 'Sắp có',
  agreePrefix: 'Khi đăng nhập, bạn đồng ý với',
  agreeAnd: 'và',
  agreeSuffix: 'của Splitz.',
  termsLink: 'Điều khoản sử dụng',
  privacyLink: 'Chính sách bảo mật',
  signInFailed: 'Đăng nhập thất bại.',
  zaloSignInFailed: 'Đăng nhập Zalo thất bại.',

  // Onboarding — bước đồng ý
  welcomeTitle: 'Chào mừng đến Splitz',
  welcomeDesc: 'Trước khi bắt đầu, vui lòng đọc và đồng ý với các điều khoản của chúng tôi.',
  consentPrefix: 'Khi nhấn "Tôi đồng ý", bạn xác nhận đã đọc và chấp thuận',
  consentAnd: 'và',
  consentDisclaimer:
    'Splitz là công cụ ghi chép và tính toán chia tiền. Splitz không giữ tiền và không xử lý thanh toán — mọi giao dịch chuyển khoản do bạn tự thực hiện qua ngân hàng.',
  agreeContinue: 'Tôi đồng ý & tiếp tục',

  // Onboarding — bước tên
  nameTitle: 'Bạn tên là gì?',
  nameDesc: 'Tên này hiển thị với các thành viên khác trong nhóm. Bạn có thể đổi sau.',
  displayNameLabel: 'Tên hiển thị',
  namePlaceholder: 'VD: Nguyễn Văn A',
  nameRequired: 'Nhập tên hiển thị của bạn.',
  avatarError: 'Không xử lý được ảnh.',

  // Onboarding — bước ngân hàng
  bankTitle: 'Tài khoản nhận tiền',
  bankDesc:
    'Bắt buộc — để bạn bè tạo QR chuyển khoản cho bạn ngay trong nhóm. Có thể quét QR ngân hàng để điền nhanh.',
  bankRequired: 'Cấu hình đủ thông tin ngân hàng để người khác chuyển tiền cho bạn.',

  // Onboarding — bước tham quan & nút chung
  continueLabel: 'Tiếp tục',
  readyTitle: 'Sẵn sàng rồi!',
  readyDesc: 'Vài điều Splitz có thể giúp bạn:',
  tour1Title: 'Tạo nhóm & mời bạn bè',
  tour1Desc: 'Qua link, mã nhóm hoặc thêm thành viên thủ công.',
  tour2Title: 'Ghi chi & chia tự động',
  tour2Desc: 'Chia đều, theo phần, phần trăm hoặc theo món.',
  tour3Title: 'Rút gọn công nợ & QR',
  tour3Desc: 'Tối thiểu số lượt chuyển, tạo QR thanh toán tức thì.',
  startButton: 'Bắt đầu dùng Splitz',
  profileSaveFailed: 'Không lưu được hồ sơ.',

  // Zalo callback — trạng thái chờ
  verifyingWithZalo: 'Đang xác thực với Zalo…',

  // Zalo callback — bước nhập email
  emailVerifyTitle: 'Xác thực email',
  emailVerifyDesc:
    'Để định danh tài khoản, dùng Google (nhanh nhất) hoặc nhập email để nhận mã xác thực.',
  orUseEmail: 'hoặc dùng email',
  emailLabel: 'Email',
  sendCode: 'Gửi mã xác thực',
  emailRequired: 'Nhập email của bạn.',
  otpSent: 'Đã gửi mã xác thực tới email.',
  codeSendFailed: 'Không gửi được mã.',
  otpSendHint: 'Chưa gửi được mã. Bấm “Gửi lại mã” hoặc đổi email.',
  googleLinkFailed: 'Liên kết Google thất bại.',
  googleOpenFailed: 'Không mở được đăng nhập Google.',

  // Zalo callback — bước OTP
  otpTitle: 'Nhập mã OTP',
  otpDesc: (p: { email: string }) => `Mã xác thực đã gửi tới ${p.email}. Nhập mã để hoàn tất.`,
  yourEmail: 'email của bạn',
  otpLabel: 'Mã OTP',
  otpPlaceholder: 'VD: 123456',
  otpRequired: 'Nhập mã OTP.',
  verifyAndSignIn: 'Xác nhận & đăng nhập',
  verifyFailed: 'Xác thực thất bại.',
  changeEmail: 'Đổi email khác',

  // Zalo callback — lỗi
  cancelledOrNoCode: 'Bạn đã huỷ hoặc Zalo không trả mã đăng nhập.',
  signInFailedTitle: 'Đăng nhập thất bại',
  backToLogin: 'Về trang đăng nhập',

  // Đăng nhập email + mật khẩu (chỉ bản self-host bật)
  // emailLabel tái dùng key có sẵn ở bước OTP Zalo phía trên.
  emailPlaceholder: 'ban@email.com',
  passwordLabel: 'Mật khẩu',
  passwordPlaceholder: '••••••••',
  signInButton: 'Đăng nhập',
  signUpButton: 'Tạo tài khoản',
  noAccountSwitch: 'Chưa có tài khoản? Tạo tài khoản',
  hasAccountSwitch: 'Đã có tài khoản? Đăng nhập',
  passwordTooShort: 'Mật khẩu cần ít nhất 6 ký tự.',
  emailInvalid: 'Email không hợp lệ.',
  checkEmailToConfirm: 'Kiểm tra email để xác nhận tài khoản trước khi đăng nhập.',
}
