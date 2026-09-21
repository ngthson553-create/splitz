# Thanh toán theo thị trường (payment rails)

> Câu hỏi gốc (issue #11): *người dùng ngoài Việt Nam không có VietQR — thanh
> toán kiểu gì?* Câu trả lời của Splitz: **mỗi thị trường dùng đúng chuẩn quốc
> gia của thị trường đó**; nơi nào không có chuẩn mở thì rơi về **link/handle
> tự do** (mô hình Splitwise). Splitz vẫn không giữ tiền, không xử lý thanh
> toán — chỉ "viết" thông tin người nhận vào đúng chuẩn để app ngân hàng của
> người trả tự mở với sẵn dữ liệu.

## Ma trận thị trường

| Thị trường | Chuẩn dùng | Tạo offline? | Ghi chú |
| --- | --- | --- | --- |
| 🇻🇳 Việt Nam | **VietQR** (NAPAS) | ✅ từ đầu | Nhúng sẵn số tiền VND |
| 🇪🇺 Châu Âu (SEPA) | **EPC QR Code** (EPC069-12 v2.1) | ✅ | IBAN + tên; app ngân hàng khối Euro quét được (GiroCode/Stuzza) |
| 🇮🇳 Ấn Độ | **UPI** (NPCI intent link) | ✅ | `upi://pay?pa=VPA&pn=tên` — GPay/PhonePe/Paytm |
| 🇹🇭 Thái Lan | **PromptPay** (BOT QR, EMVCo TLV) | ✅ | Proxy = số ĐT (0066…) hoặc CMND 13 số |
| 🇧🇷 Brazil | **Pix** (BR Code, BCB) | ✅ | Pix key = CPF/email/ĐT/key ngẫu nhiên |
| 🇺🇸 Mỹ, 🇬🇧 UK, 🇨🇦 Canada, 🇦🇺 Úc, 🇯🇵 Nhật, 🇰🇷 Hàn, 🇸🇬 SG, 🇲🇾 MY, 🇮🇩 ID, 🇵🇭 PH… | **Handle tự do** (phương án A) | URL → QR | Không có chuẩn QR ngang hàng mở cho P2P: Zelle/Venmo (US), Paym (UK), Interac (CA), PayID (AU) là text/link; Alipay/WeChat (TQ), KakaoPay (KR), DuitNow (MY), QRIS (ID) là hệ đóng hoặc cần đăng ký merchant với PSP |

Nguyên tắc chọn: **chỉ nhận chuẩn (a) sinh payload thuần client không gọi API
ngoài, (b) không cần đăng ký merchant, (c) do ngân hàng/quốc gia công bố mở**.
Đó là lý do 4 chuẩn trên được chọn và SGQR/DuitNow/QRIS thì chưa.

## Số tiền trong QR

- **VietQR**: nhúng số tiền VND (sổ cái base VND) — như trước.
- **4 chuẩn ngoài**: để trống (các chuẩn đều cho phép — "static QR"). Lý do:
  đơn vị tiền của rail (EUR/INR/THB/BRL) khác sổ cái đang base VND, nhúng số
  quyển đổi sẽ SAI tiền. Người trả nhìn số tiền hiển thị trong app rồi tự nhập
  — sheet thanh toán có dòng nhắc rõ (`payments.amountNotInQr`).
- Khi dự án có base-currency theo nhóm (roadmap), các rail sẽ nhúng số tiền
  đúng đơn vị luôn.

## Kiến trúc

```
src/lib/types.ts           PaymentRail + Member.paymentRail/paymentData
src/lib/settlement/paymentQr.ts
   ├─ crc16Ccitt()          CRC16-CCITT-FALSE (PromptPay & Pix dùng chung)
   ├─ buildPromptPay()      EMVCo TLV — khớp từng byte vector dtinth/promptpay-qr
   ├─ buildPix()            khớp nguyên ví dụ static trong BR Code Manual (Bacen)
   ├─ buildEpc()            12 dòng text BCD/002/1/SCT/…
   ├─ buildUpi()            intent link
   ├─ handleQrPayload()     URL → QR hoá được; text → null
   └─ resolveMemberPayment(member) → { rail, payload, … } | null
supabase/migrations/0035_payment_rails.sql
                           group_members + profiles: payment_rail, payment_data
src/components/PaymentMethodFields.tsx
                           UI chọn rail + field theo rail (tái dùng BankFields cho VietQR)
src/features/settle/QrSheet.tsx
                           dispatch theo rail; VietQR giữ nguyên đường cũ
```

VietQR **vẫn dùng 3 cột `bank_*` cũ** — dữ liệu người dùng VN hiện tại không
đổi gì, và `resolveMemberPayment` ưu tiên VietQR khi còn số tài khoản.

### Thêm một thị trường mới

1. Thêm builder payload trong `paymentQr.ts` (thuần chuỗi, có **vector kiểm
   thử chính thức** từ ngân hàng/quốc gia hoặc thư viện chuẩn — xem
   `paymentQr.test.ts`).
2. Thêm rail vào `PaymentRail` (types.ts) + nhánh trong `resolveMemberPayment`.
3. Thêm option + field + chuỗi vào `PaymentMethodFields` và namespace
   `payments` (vi + en — thiếu key en là lỗi biên dịch).
4. Migration thêm không cần: `payment_data` là jsonb, rail mới chỉ là giá trị
   mới của `payment_rail`.

## Nguồn spec

- EPC QR Code: EPC069-12 v2.1 (European Payments Council) — 12 dòng, BIC tuỳ
  chọn ở v002, amount `EURxx.xx` tuỳ chọn.
- UPI: NPCI intent specification — `pa` (VPA, bắt buộc), `pn`, `am`, `cu`, `tn`.
- PromptPay: Bank of Thailand "Policy Guideline Standardized Thai QR Code for
  Payment" — AID `A000000677010111`, proxy subtag 01=ĐT (0066…), 02=CMND 13 số;
  CRC16-CCITT-FALSE. Vector kiểm thử lấy từ dtinth/promptpay-qr (bộ test công
  khai, khớp từng byte).
- Pix: Banco Central do Brasil "BR Code Manual v2.0.0" — GUI `br.gov.bcb.pix`,
  key ở 26.01, currency 986, txid `***` cho static; CRC16-CCITT. Vector kiểm
  thử = nguyên ví dụ static trong manual (CRC `1D3D`).
