export const payments = {
  // ── Chọn phương thức ──
  methodLabel: 'Phương thức nhận tiền',
  methodHint:
    'Chọn đúng cách bạn nhận tiền — Splitz tạo mã QR theo chuẩn riêng của từng quốc gia.',
  railVietqr: 'Ngân hàng VN (VietQR)',
  railVietqrHint: 'Quét bằng mọi app ngân hàng Việt Nam',
  railSepa: 'SEPA / IBAN (Châu Âu)',
  railSepaHint: 'App ngân hàng trong khu vực Euro quét được (GiroCode)',
  railUpi: 'UPI (Ấn Độ)',
  railUpiHint: 'GPay, PhonePe, Paytm…',
  railPromptpay: 'PromptPay (Thái Lan)',
  railPromptpayHint: 'Mọi app ngân hàng Thái',
  railPix: 'Pix (Brazil)',
  railPixHint: 'Chave Pix — mọi app ngân hàng Brazil',
  railHandle: 'Khác — link / tài khoản',
  railHandleHint: 'US, UK, Nhật…: PayPal, Venmo, PayID, Zelle…',

  // ── Field dùng chung ──
  nameOnAccount: 'Tên chủ tài khoản',
  nameOnAccountPlaceholder: 'NGUYEN VAN A',

  // ── SEPA ──
  ibanLabel: 'IBAN',
  bicShort: 'BIC / SWIFT',
  ibanPlaceholder: 'DE89 3704 0044 0532 0130 00',
  bicLabel: 'BIC / SWIFT (không bắt buộc)',
  bicPlaceholder: 'COBADEFFXXX',

  // ── UPI ──
  vpaLabel: 'UPI ID (VPA)',
  vpaPlaceholder: 'ten@okaxis',

  // ── PromptPay ──
  promptpayProxyType: 'Loại định danh',
  promptpayPhone: 'Số điện thoại',
  promptpayNationalId: 'CMND 13 số',
  promptpayValueLabel: 'Số định danh PromptPay',
  promptpayPlaceholder: '0812345678 hoặc 1-1101-1101-1101',

  // ── Pix ──
  pixKeyLabel: 'Pix key',
  pixKeyPlaceholder: 'CPF, email, số điện thoại hoặc key ngẫu nhiên',
  pixCityLabel: 'Thành phố (không bắt buộc)',
  pixCityPlaceholder: 'SAO PAULO',

  // ── Handle ──
  handleLabelField: 'Nhãn hiển thị',
  handleLabelPlaceholder: 'PayPal, Venmo, PayID…',
  handleValueField: 'Link hoặc tài khoản',
  handleValuePlaceholder: 'https://paypal.me/ten-cua-ban',
  handleHint:
    'Nếu là link (PayPal.Me, Venmo, Revolut…) sẽ hiện thành mã QR; tài khoản dạng chữ hiện kèm nút sao chép.',

  // ── Sheet thanh toán ──
  amountNotInQr:
    'Mã QR đã điền sẵn người nhận — nhập số tiền hiển thị phía trên trong app ngân hàng của bạn.',
  openLink: 'Mở link',
  copyValue: 'Sao chép',
  proxyPhone: 'Số điện thoại',
  proxyNationalId: 'CMND',

  // ── Kiểm tra hợp lệ ──
  methodRequired: 'Hoàn tất thông tin nhận tiền để tiếp tục.',
  ibanInvalid: 'IBAN không hợp lệ (16–34 ký tự, bắt đầu bằng mã quốc gia).',
  vpaInvalid: 'UPI ID phải có dạng ten@nhà cung cấp.',
}
