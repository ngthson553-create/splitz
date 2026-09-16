# Splitz — Định hướng thương mại hoá (Roadmap)

> Cập nhật: 2026-06-08. Đọc cùng `CONTEXT.md`.
> File này là nguồn chân lý cho định hướng phát triển tới khi thương mại hoá.
> Trạng thái hiện tại: MVP local-first đã xong UI (Phase 0–9 redesign + PWA). Chưa có auth/cloud thật.

## Mô hình kinh doanh: Freemium

### Các gói
| Gói | Giá | Nội dung |
|-----|-----|----------|
| **Free** | 0đ | Tính năng cốt lõi, có giới hạn (xem dưới) |
| **Cá nhân** | 14k/tháng · 99k/năm | Mở khoá toàn bộ cho user + các nhóm user đó sở hữu |
| **Team** | 49k/tháng · 399k/năm | 5 ghế premium do chủ team cấp |

### Ranh giới Free vs Premium (đề xuất user đã DUYỆT)
- **Free**: tối đa **3 nhóm đang hoạt động**, **8 thành viên/nhóm**, KHÔNG có tính năng cao cấp (PDF, AI nhập chi, OCR hoá đơn, multi-currency).
- **Cá nhân**: không giới hạn số nhóm, tối đa **25 thành viên/nhóm**, đầy đủ tính năng cao cấp.
- **Team**: như Cá nhân + 5 ghế premium.

### Quy tắc giới hạn thành viên (QUAN TRỌNG)
- **Giới hạn số thành viên tính theo gói của CHỦ NHÓM (trưởng nhóm/owner)**, không theo từng thành viên.
- VD: nhóm do user Free sở hữu → tối đa 8 người, kể cả thành viên khác là premium.

### Cơ chế Team
- Chủ team mua gói Team → được **5 ghế premium**.
- Chủ mời tối đa 4 người khác vào team → cả 5 đều có quyền premium ở các nhóm họ sở hữu.

### Hết hạn Premium (user đã chốt)
- Khi hết hạn mà đang vượt giới hạn Free (vd 10 nhóm, 20 người/nhóm):
  → **CHỈ ĐỌC, không tạo mới**. Giữ nguyên dữ liệu cũ, chỉ chặn TẠO THÊM vượt giới hạn Free.
  → KHÔNG xoá/ẩn dữ liệu. Nhân văn, không mất data.

## Thanh toán: PayOS

### Lưu ý kỹ thuật QUAN TRỌNG
- Merchant PayOS: ĐÃ MỞ (PayOS hỗ trợ cả cá nhân — user xác nhận).
- **PayOS KHÔNG auto-charge định kỳ** (khác Stripe). Chủ yếu thanh toán 1 lần qua QR/chuyển khoản.
- → "Tự động gia hạn" thực chất là **GIA HẠN BÁN TỰ ĐỘNG** (user đã chốt):
  - Nhắc trước **3 ngày** khi sắp hết hạn (in-app notification + có thể push/email sau).
  - Tạo sẵn link/QR thanh toán gia hạn.
  - User chủ động bấm trả → webhook PayOS → cộng thêm 1 chu kỳ.
- Auto-charge thật (thẻ quốc tế qua Stripe) = để SAU, không nằm trong phạm vi đầu.

### Backend thanh toán: Supabase Edge Functions
- Edge Function nhận **webhook PayOS** (verify chữ ký/checksum) → cập nhật trạng thái premium trong DB.
- Cron (Supabase scheduled / pg_cron) cho: kiểm tra sắp hết hạn → sinh notification nhắc 3 ngày; hạ cấp khi quá hạn.

### Code kích hoạt thủ công (user yêu cầu)
- Hệ thống **mã kích hoạt premium KHÔNG cần thanh toán** do chủ dự án cấp.
- Dùng cho: chính chủ dự án, dev, beta tester, trúng thưởng/khuyến mãi.
- Cần: bảng `redemption_codes` (code, gói, thời hạn cấp, số lần dùng, hết hạn, đã dùng bởi ai), UI nhập code, Edge Function validate + kích hoạt.

## Định danh tài khoản: EMAIL là khoá định danh (chốt 2026-06-08)
- **Email là danh tính duy nhất của user.** Cùng 1 người, dù đăng nhập Google hay Zalo → vào CÙNG MỘT tài khoản (account linking theo email).
- **Google**: tự trả email → định danh ngay.
- **Zalo**: KHÔNG đảm bảo có email → lần đầu đăng nhập Zalo phải **xác thực email** HOẶC **đăng nhập thêm Google** để lấy email định danh.
- DB: `profiles` khoá theo email (unique). Một user có thể có nhiều provider (google, zalo) cùng trỏ về 1 email/1 tài khoản. Cần bảng map provider → account, hoặc dùng Supabase Auth identity linking.
- Lưu ý kỹ thuật: Supabase Auth hỗ trợ "link identities" — cùng email có thể gộp. Cần bật và xử lý case Zalo chưa có email (chặn tới khi cung cấp email).

## Đăng nhập (BẮT BUỘC khi thương mại hoá)
- **Đăng nhập là bắt buộc** — không ai dùng app mà không đăng nhập.
- **Google OAuth** + **Zalo OAuth** (Zalo: developer cá nhân, free, không cần verify doanh nghiệp — user xác nhận đơn giản).
- **Avatar lấy từ Google/Zalo**, cho phép user tự đổi (đã chuẩn bị: Avatar component hỗ trợ `src`, Profile có `avatarUrl`).
- Thành viên nhóm hướng tới là **user thật**, mời qua link/SĐT. Hiện vẫn gõ tên tự do (giai đoạn local-first).

## Quyết định kiến trúc nền tảng (chốt 2026-06-08)

### Migrate dữ liệu local
- **BỎ local, làm lại từ cloud.** Local-first chỉ là giai đoạn thử nghiệm. Khi launch thật, mọi thứ bắt đầu từ tài khoản cloud. Không cần code migrate localStorage → cloud.

### Định danh thành viên: CHO PHÉP CẢ HAI
- Thành viên có thể là **"ảo" (chỉ tên, chưa có tài khoản)** — tạo nhanh để ghi chi ngay.
- Hoặc **user thật** (đã có tài khoản Splitz).
- Có thể **mời thành viên ảo đăng ký để "nhận" (claim) danh tính** của họ sau (mô hình Splitwise).
- DB: `group_members` cần hỗ trợ cả member chưa link account (chỉ name) lẫn đã link (`user_id`). Có cơ chế claim.

### Phân quyền nhóm: Chủ nhóm + Thành viên (2 cấp)
- **Chủ nhóm (owner)**: sửa/xoá nhóm, mời/xoá người, sửa MỌI khoản chi, đổi cài đặt nhóm.
- **Thành viên**: thêm khoản chi, sửa/xoá khoản chi DO MÌNH TẠO.
- (Không làm role phức tạp hơn ở giai đoạn đầu.)

### Mời thành viên: 3 cách (đều làm)
- **Link mời** (chia sẻ Zalo/Messenger) — phổ biến nhất.
- **Mã nhóm (code)** — nhập mã để vào.
- **Mời qua SĐT/email** — mời người cụ thể.

### Giới hạn realtime (tiết kiệm tài nguyên — user chốt)
- Sync 20s/lần khi tab active. Tab ẩn/blur >60s → tắt realtime, bật lại khi focus.

## Pháp lý & quyền riêng tư
- **Chính sách bảo mật + Điều khoản người dùng là BẮT BUỘC.**
- Cơ chế đồng ý: **đăng nhập = đồng ý** với Điều khoản + Chính sách bảo mật.
  - Tại màn đăng nhập phải GHI RÕ: "Khi đăng nhập, bạn đồng ý với Điều khoản sử dụng và Chính sách bảo mật" + link tới 2 trang đó.
- App lưu số tài khoản ngân hàng người dùng → nêu rõ disclaimer "không giữ tiền, không xử lý thanh toán" (đã có trong UI). Cân nhắc mã hoá/hạn chế lộ thông tin TK.

## Quyết định bổ sung (chốt 2026-06-08, đợt 2)

### Thông tin ngân hàng (STK) — BẮT BUỘC config
- User đăng nhập mà CHƯA cấu hình STK ngân hàng → **bắt config ngay** (onboarding buộc).
- → User thật mặc định luôn có STK để tạo QR nhận tiền.
- Thành viên "ảo": người tạo nhập STK hộ (nếu biết). Khi member ảo claim tài khoản, dùng STK của chính họ.

### Nền tảng: WEB/PWA là chính
- Tập trung web + PWA (cài về màn hình chính). 1 codebase, không App Store/Play giai đoạn đầu.
- App native (Capacitor) = ĐỂ SAU, chỉ khi thực sự cần push thật / IAP.

### Thanh toán & luật store
- Bán Premium qua WEB bằng PayOS (không mất phí store).
- Vì chưa lên store → CHƯA phải lo luật IAP của Apple/Google (15-30%). Quyết định lại khi làm native.

## Quyết định bổ sung (chốt 2026-06-08, đợt 3)

### Đa tiền tệ + tỷ giá động (CẦN NGHIÊN CỨU KỸ — dùng cho du lịch nước ngoài)
- User muốn: đi du lịch nước ngoài cũng dùng được, **tỷ giá lấy động**.
- Hướng thiết kế ĐÚNG (research kỹ khi làm, schema chuẩn bị sẵn từ đầu):
  - Mỗi khoản chi lưu: **currency gốc + số tiền gốc + tỷ giá snapshot tại thời điểm chi** (KHÔNG tính lại sau → tránh sai số/biến động).
  - Mỗi nhóm có **1 đồng tiền hiển thị chính**; quy đổi để hiện tổng & công nợ.
  - Tỷ giá động: API ngoài (exchangerate-api / tỷ giá VCB...), **cache theo ngày**, có fallback khi API lỗi.
  - Engine settlement hiện tính SỐ NGUYÊN VND — refactor cẩn thận để hỗ trợ thập phân ngoại tệ mà KHÔNG vỡ độ chính xác (đây là engine cốt lõi đã test, đụng vào phải có test bao phủ).
- Schema: cột `currency`, `amount_original`, `exchange_rate`, `amount_base` (đã quy đổi) ngay từ đầu dù MVP chỉ VND.

### Rời/xoá khỏi nhóm: CHẶN khi còn nợ
- Không cho rời/bị xoá nếu số dư ròng ≠ 0. Phải quyết toán xong (số dư = 0) mới rời được.

### Bảo mật STK ngân hàng: RLS + chỉ trong nhóm (KHÔNG mã hoá thêm)
- STK không phải bí mật cao (in trên mọi hoá đơn, cần lộ để người khác chuyển tiền).
- Mã hoá STK sẽ phá vỡ tạo QR → KHÔNG mã hoá.
- Dùng **RLS chặt**: STK chỉ đọc được bởi thành viên CÙNG NHÓM. Cái cần bảo vệ thật là OAuth token + session (Supabase Auth lo).

### i18n: CHUẨN BỊ từ đầu
- Tách chuỗi UI ra file ngôn ngữ (vi mặc định) ngay từ giai đoạn xây cloud, để sau thêm English dễ.
- Đề xuất: react-i18next hoặc giải pháp gọn tương đương. Tiếng Việt là default.

## Quyết định bổ sung (chốt 2026-06-08, đợt 4)

### Chống xung đột realtime: PER-RECORD (không khoá nhóm) — CỰC QUAN TRỌNG
- Đây là thứ làm CHẾT Hysplit cũ (lưu nguyên cục JSONB → ai lưu sau ghi đè người trước).
- Cách ĐÚNG:
  - Mỗi **khoản chi / thành viên = 1 ROW riêng** trong DB (KHÔNG nhét cả nhóm vào 1 JSONB). → schema CHUẨN HOÁ bắt buộc.
  - Mỗi row có `updated_at` + `version`. Khi sửa gửi kèm version đang cầm → nếu server có version mới hơn = có người vừa sửa → BÁO "đã được cập nhật, tải lại" thay vì ghi đè mù.
  - Thêm/xoá khoản chi = insert/delete row độc lập → không bao giờ đụng nhau.
  - **Số dư/công nợ là DERIVED** (tính lại từ list khoản chi), KHÔNG lưu cứng → luôn nhất quán.
- Kết hợp giới hạn realtime 20s/lần + tắt khi tab ẩn >60s (đã chốt).

### Kênh thông báo
- **In-app** (đã có) + **Web Push** (miễn phí, hoạt động cả khi đóng tab, hợp PWA) — làm trong giai đoạn đầu.
- **Zalo ZNS** (Zalo Notification Service) — phổ biến VN, tốn phí + cần duyệt template → ĐỂ SAU.
- Email: cân nhắc cho nhắc gia hạn (đã có email định danh) — optional.

### Onboarding lần đầu (4 bước, đều bắt buộc trừ tour)
1. **Đồng ý điều khoản** (đăng nhập = đồng ý, hiển thị rõ + link Điều khoản & Bảo mật).
2. **Nhập tên hiển thị** (lấy sẵn từ Google/Zalo, cho sửa).
3. **Cấu hình STK ngân hàng** (bắt buộc — để người khác tạo QR chuyển cho mình).
4. **Tour tính năng nhanh** (2-3 slide, có thể skip).

## Quyết định bổ sung (chốt 2026-06-08, đợt 5)

### Theo dõi trạng thái thanh toán: XÁC NHẬN ĐÔI (2 chiều mềm)
- App KHÔNG kết nối ngân hàng → không tự biết tiền đã chuyển → dựa vào con người.
- Luồng: người trả bấm **"Tôi đã chuyển"** → giao dịch *pending* → người nhận bấm **"Đã nhận"** → công nợ trừ, đánh dấu *confirmed*.
- Tránh người trả tự đánh dấu khống: chưa có xác nhận của người nhận thì vẫn "chờ".
- Schema: bảng `settlements` riêng (from_member, to_member, amount, status pending/confirmed, created_at, confirmed_at, liên kết group). TÁCH biệt với expenses.

### Xoá tài khoản (bắt buộc pháp lý — GDPR-style)
- **Chặn xoá nếu còn nợ** (số dư ≠ 0 ở bất kỳ nhóm nào). Phải tất toán hết.
- Nhóm user đang làm CHỦ mà không còn nợ: **bắt chuyển quyền sở hữu** cho người khác (hoặc xoá nhóm nếu chỉ mình). Xong mới cho xoá TK.
- Xoá TK = xoá/ẩn dữ liệu cá nhân theo quy định; giữ tính toàn vẹn lịch sử nhóm của người khác (cân nhắc anonymize thay vì xoá cứng row liên quan người khác).

### Lịch sử chỉnh sửa khoản chi: CÓ LƯU
- Mỗi lần thêm/sửa/xoá khoản chi → ghi lại ai + khi nào (+ nội dung thay đổi cơ bản). Tăng minh bạch, tránh tranh cãi trong nhóm.
- Schema: bảng `activity_log` / `expense_history` (group_id, actor_user_id, action, target, snapshot/diff, timestamp). Cũng là nguồn cho tab "Hoạt động".

### Hỗ trợ user: Trang FAQ trong app
- Trang FAQ/Hướng dẫn trong app (câu hỏi thường gặp, cách dùng, chính sách gói). Giảm tải hỗ trợ.
- (Email/Zalo OA có thể thêm sau; giai đoạn đầu ưu tiên FAQ.)

## Quyết định bổ sung (chốt 2026-06-08, đợt 6)

### Nhiều người trả 1 khoản chi: CÓ hỗ trợ
- 1 khoản chi cho phép NHIỀU payer (vd Lan trả 200k + Hùng trả 300k cho bữa ăn 500k).
- Engine đã có cấu trúc `payers[]` sẵn. Schema: bảng `expense_payers` (expense_id, member_id, amount) — không nhét cứng 1 payer.

### Vùng lưu trữ: Supabase region gần VN (Singapore/SEA)
- Chọn region SEA cho độ trễ thấp.
- GHI CHÚ pháp lý: VN có Nghị định 13/2023 về bảo vệ dữ liệu cá nhân. Lưu trữ ngoài VN cần lưu ý khi quy mô lớn → xem xét lại nếu scale. Giai đoạn đầu chấp nhận SEA region.

### Chống lạm dụng: CƠ BẢN từ đầu (không over-engineer)
- Rate limit cơ bản trên Edge Functions (số nhóm tạo/phút, số lời mời/ngày).
- Mã kích hoạt: `max_uses` + `expires_at` + log ai dùng (đã có trong redemption_codes).
- Giới hạn gói Free (3 nhóm, 8 người) tự chặn spam phần lớn.
- ĐỂ SAU: captcha, chống bot tinh vi.

### Migration/Versioning schema: DÙNG Supabase migrations CHUẨN (bắt buộc)
- Mỗi thay đổi schema = 1 file SQL đánh số trong `supabase/migrations/` (đã có 0001_init.sql).
- KHÔNG sửa schema trực tiếp khi đã có data thật (rủi ro mất data, lệch môi trường).
- Migration có lịch sử, nâng cấp an toàn. Xử lý dữ liệu cũ qua updated_at/version khi đổi cấu trúc.

## ĐÍNH KÈM CHỨNG TỪ / HOÁ ĐƠN (chốt 2026-06-09 — làm sau khi phù hợp)

> Chưa làm ngay. Đưa vào Slice 7 (hoàn thiện) hoặc khi đã ổn định khoản chi cloud.
> Một ngoại lệ ĐÃ làm ngay: nút "Quét QR" tài khoản nay cho UPLOAD ảnh từ thư viện
> (bỏ `capture` ép camera) — phục vụ cấu hình STK bằng ảnh QR có sẵn.

### Phạm vi (chốt)
- **Khoản chi đính kèm chứng từ** (KHÔNG bắt buộc): mỗi khoản chi gắn **NHIỀU tệp**,
  loại **ảnh + PDF** (hoá đơn chụp hoặc hoá đơn điện tử).
- **Ai trong nhóm cũng xem được** chứng từ của từng khoản chi (bấm vào khoản chi → xem).
- **Xuất báo cáo PDF phải kèm chứng từ đã upload** (nhúng ảnh; PDF đính kèm thì liệt kê/đính trang).
- **Quét QR tài khoản**: cho upload ảnh (ĐÃ làm) + vẫn chụp được bằng camera.

### Hướng kỹ thuật (đề xuất, research kỹ khi làm)
- **Lưu trữ: Supabase Storage** (bucket riêng, vd `receipts`), KHÔNG nhét base64 vào DB.
  - RLS Storage: chỉ **thành viên cùng nhóm** đọc/upload tệp của nhóm đó (path theo
    `group_id/expense_id/...`; policy dựa `is_group_member`).
  - Giới hạn dung lượng/loại tệp; nén ảnh phía client trước khi upload (đã có `image.ts`).
- **Schema mới**: bảng `expense_attachments` (id, expense_id, group_id, storage_path,
  mime_type, file_name, size_bytes, uploaded_by_member, created_at). RLS đọc =
  `is_group_member`; ghi = người tạo khoản chi hoặc chủ nhóm. (migration mới khi làm.)
- **UI**:
  - Nhập/sửa chi: vùng thả/upload tệp (không bắt buộc), xem trước thumbnail.
  - `ExpenseDetailSheet`: hiển thị danh sách chứng từ, bấm xem ảnh/PDF (signed URL).
- **Xuất PDF**: pipeline báo cáo (Slice 7) tải tệp từ Storage (signed URL) → nhúng ảnh
  vào PDF; với PDF đính kèm thì gộp/liệt kê. Thư viện: cân nhắc pdf-lib/jsPDF.
- **Chi phí**: Storage có phí theo dung lượng → nén ảnh, đặt quota; cân nhắc gói Free
  giới hạn số chứng từ (quyết định khi gắn vào mô hình Premium).

## TÍNH NĂNG ĐỀ XUẤT BỔ SUNG (chốt 2026-06-09) — ƯU TIÊN UX, KHÔNG TRÀN LAN

> User DUYỆT làm cả 4, nhưng YÊU CẦU CỨNG: **bố trí khéo, đặt đúng chỗ, KHÔNG để tràn
> lan giao diện**. Giữ nguyên khung điều hướng hiện có (bottom nav 5 mục; trong nhóm 2
> tab Chi tiêu/Quyết toán + sheet Cài đặt nhóm). KHÔNG đẻ thêm tab/nav mới trừ khi bắt buộc.
> Phân tầng Free/Premium phải nhất quán với mục "Ranh giới Free vs Premium" ở trên.
> Làm SAU khi xong các Slice cloud cốt lõi (1–5). Đính kèm vào Slice 6/7 hoặc Giai đoạn 3.

### 1. Nhắc nợ một chạm — FREE (ưu tiên CAO, retention) ✅ ĐÃ CODE (2026-06-09)
> ĐÃ TRIỂN KHAI: migration `0018_debt_reminders.sql` (bảng `debt_reminders` thay cho cột
> `last_reminded_at` vì transfers là DERIVED, không có row để gắn) + Edge Function
> `remind-debt` (verify_jwt, rate-limit 1 lần/24h/khoản) + nút "Nhắc trả nợ" / "Nhắc tất cả"
> ở `SettleTab` + deep-link `?tab=settle`. Con nợ phải là user thật + bật Web Push. Còn lại:
> kênh Zalo ZNS (để sau). Verify cloud thật ở máy (xem CHANGELOG 2026-06-09).
- **Giá trị**: biến app từ "sổ ghi" thành công cụ thực sự đòi được nợ → lý do quay lại.
- **Luồng**: ở tab Quyết toán, mỗi lượt người KHÁC nợ mình → nút "Nhắc". Bấm → gửi
  Web Push (đã có hạ tầng) + (sau) Zalo, kèm sẵn link mở QR chuyển khoản cho con nợ.
- **Vị trí đặt (KHÉO)**: KHÔNG thêm nút thứ 3 vào card lượt chuyển (đã chật). Nhắc chỉ
  hiện cho khoản NGƯỜI KHÁC nợ MÌNH (hiện tại card đó chưa có nút "Tôi đã chuyển") →
  đặt nút "Nhắc" vào đúng khoảng trống đó. Mỗi card vẫn tối đa 1 nút hành động + 1 icon QR.
- **Chống làm phiền**: giới hạn nhắc 1 lần / 24h / khoản (tránh spam). Lưu `last_reminded_at`.
- **Schema**: tận dụng `settlements`/transfers hiện có; thêm cột `last_reminded_at` (hoặc
  bảng `reminders` nhẹ nếu cần log). Edge Function gửi push (đã có `send-reminders`).

### 2. Gộp công nợ liên nhóm — PREMIUM (khác biệt hoá lớn)
- **Giá trị**: bạn & 1 người ở nhiều nhóm → net thành 1 con số + 1 QR duy nhất. Giống
  "simplify across groups" của Splitwise; khó làm free → đòn bẩy nâng cấp tự nhiên.
- **Vị trí đặt (KHÉO)**: KHÔNG nhét vào trong từng nhóm (dễ rối). Đặt ở **Trang chủ
  (Dashboard)** — nơi đã tổng hợp "tôi nợ/được nhận". Thêm 1 khối "Gộp công nợ liên
  nhóm" CHỈ hiện khi user Premium VÀ có ≥2 nhóm chung công nợ với cùng một người. User
  Free thấy khối này ở dạng teaser khoá (1 dòng + nút "Mở khoá") — đúng mồi chuyển đổi.
- **Lưu ý engine**: settlement hiện tính theo TỪNG nhóm. Gộp liên nhóm = lớp TỔNG HỢP
  bên trên (gom balance ròng theo cặp (user_a,user_b) qua các nhóm chung) → KHÔNG đụng
  engine cốt lõi đã test. QR vẫn cần STK người nhận (đã có ở profile).
- **Ranh giới**: chỉ gộp được khi hai người THẬT (có account) cùng ở các nhóm; thành
  viên ảo không gộp (chưa định danh xuyên nhóm).

### 3. Quỹ nhóm chung (pot) — PREMIUM (hợp văn hoá VN)
- **Giá trị**: "góp quỹ đi Đà Lạt" — 1 người giữ quỹ, cả nhóm góp vào, chi tiêu trừ dần
  vào quỹ. Khác hẳn chia tiền thuần → tính năng "mới" rõ rệt, đáng trả tiền.
- **Vị trí đặt (KHÉO)**: là 1 CHẾ ĐỘ của nhóm, bật trong **Cài đặt nhóm** (sheet đã có)
  → khi bật, tab "Quyết toán" có thêm thẻ "Quỹ nhóm" ở ĐẦU (số dư quỹ + ai đã góp / còn
  thiếu). KHÔNG thêm tab mới. Nhóm thường (không bật quỹ) giao diện y nguyên — không loãng.
- **Cơ chế**: quỹ = số dư = tổng góp − tổng chi từ quỹ. Khoản chi có cờ "trả từ quỹ"
  (payer = quỹ) thay vì 1 thành viên. Cuối chuyến, chia phần quỹ dư/thiếu theo mức góp.
- **Schema**: bảng `group_funds` (group_id, balance derived) + `fund_contributions`
  (member_id, amount) + cờ trên expense `paid_from_fund`. Vẫn per-record, balance derived.
- **Chỉ chủ nhóm** bật/tắt quỹ và xác nhận góp (khớp phân quyền 2 cấp).

### 4. Khoản chi định kỳ — PREMIUM
- **Giá trị**: tiền nhà / internet / Netflix tự sinh hằng tháng — đúng nhóm ở ghép, share
  subscription. Giữ chân dài hạn.
- **Vị trí đặt (KHÉO)**: KHÔNG thêm UI nặng. Trong ExpenseSheet (đã có) thêm 1 dòng tuỳ
  chọn "Lặp lại" (Không / Hàng tháng / Hàng tuần) — gọn 1 control. Danh sách khoản định
  kỳ quản lý trong **Cài đặt nhóm** (sheet) mục "Khoản định kỳ", không chiếm tab chính.
- **Cơ chế**: bảng `recurring_expenses` (template) + cron (pg_cron/Supabase scheduled,
  đã dùng cho nhắc gia hạn) sinh expense thật theo kỳ. Sinh ra = expense bình thường →
  không đụng engine. Có thể tạm dừng / sửa template.
- **Ranh giới Free**: Free KHÔNG tạo được định kỳ (chỉ thấy teaser khi gạt "Lặp lại").

### Đặc quyền Premium bổ sung (không phải tính năng riêng, là "nới giới hạn")
- Đính kèm chứng từ KHÔNG giới hạn (Free ~3 ảnh/khoản).
- Lịch sử chỉnh sửa đầy đủ (Free xem 30 ngày gần nhất).
- Xuất Excel/CSV (PDF đã có kế hoạch ở Slice 7).
- Tuỳ biến nhóm: ảnh bìa / màu chủ đề nhóm (cosmetic, người dùng sẵn lòng trả).
- Huy hiệu "Premium" cạnh tên trong nhóm (nhẹ, tâm lý).

### Nguyên tắc chống "tràn lan" (áp dụng cho CẢ 4 + về sau)
- Mỗi tính năng mới phải có 1 CHỖ ĐẶT xác định, KHÔNG rải nút khắp nơi.
- Tính năng có điều kiện (premium / chế độ bật) → ẩn hoàn toàn khi không áp dụng; nhóm
  thường giữ giao diện tối giản như hiện tại.
- Teaser premium = 1 dòng + 1 nút mở khoá, KHÔNG phải banner to chiếm màn hình.
- Ưu tiên nhét vào sheet/Cài đặt nhóm thay vì thêm tab/nav mới.

## CÁCH TRIỂN KHAI: VERTICAL SLICES (chốt 2026-06-08) — ĐỌC ĐẦU TIÊN KHI XÂY

> KHÔNG làm full frontend mock trước rồi mới backend. Với app realtime/đa người dùng,
> bug đồng bộ (thứ giết Hysplit cũ) chỉ lộ khi frontend nối backend THẬT + nhiều người
> dùng đồng thời. Mock không bao giờ phát hiện được → rủi ro làm lại.
> → Làm TRỌN từng mảng (DB + API/RLS + UI + test thật) rồi mới sang mảng khác.

### Tận dụng được gì đã có
- Frontend MVP (Phase 0–9) phần lớn TÁI DÙNG: components, màn hình, engine settlement (đã test).
- Chỉ cần thay TẦNG DATA: từ localStorage (store.tsx + GroupRepository local) → Supabase.
- → Slice 3–5 sẽ nhanh vì UI có sẵn, chủ yếu nối data thật + xử lý realtime.

### Thứ tự slice (mỗi slice phải chạy thật + test xong mới sang slice sau)
1. **Nền tảng dữ liệu**: schema chuẩn hoá + Supabase migrations + RLS. Móng, chưa có UI.
   (Các bảng: profiles, identities/provider-link, groups, group_members, expenses,
    expense_payers, expense_participants, expense_items, settlements, activity_log,
    subscriptions, redemption_codes... — chuẩn hoá, KHÔNG JSONB cục như MVP.)
2. **Auth + onboarding**: Google/Zalo login, email định danh + account linking, route guard
   (đăng nhập bắt buộc), onboarding 4 bước (đồng ý điều khoản → tên → STK → tour).
   Đây là CỔNG VÀO — không có thì không test được gì với user thật.
3. **Nhóm + thành viên + mời**: CRUD nhóm trên cloud, mời (link + mã nhóm + SĐT/email),
   phân quyền 2 cấp, thành viên ảo + claim. Thay GroupRepository local → supabase.
   - ⚠️ NỢ KỸ THUẬT TỪ SLICE 1/2: RLS bảng `profiles` hiện chỉ cho đọc hồ sơ CỦA CHÍNH MÌNH.
     Slice 3 phải MỞ RỘNG policy để thành viên cùng nhóm đọc được tên/avatar/STK của nhau
     (cần cho tạo QR + hiển thị). Gợi ý: policy select trên profiles dùng hàm kiểm
     "có chung nhóm" (vd is_group_member qua group_members), tránh đệ quy RLS.
4. **Khoản chi + ĐỒNG BỘ REALTIME**: TIM của app + chỗ Hysplit cũ CHẾT. Làm kỹ NHẤT.
   Per-record + version (conflict → báo tải lại, không ghi đè mù), realtime 20s/lần,
   tắt khi tab ẩn >60s. Nhiều payer. TEST 2 THIẾT BỊ THẬT cùng lúc.
5. **Quyết toán + xác nhận đôi**: settlements, QR VietQR, "đã chuyển" → "đã nhận".
6. **Premium + PayOS**: gói/giới hạn theo chủ nhóm, webhook Edge Function, mã kích hoạt,
   nhắc gia hạn 3 ngày, hết hạn → chỉ đọc. Chống lạm dụng cơ bản.
7. **Hoàn thiện**: FAQ in-app, trang Điều khoản + Bảo mật, Web Push, i18n, multi-currency
   (nếu làm), **đính kèm chứng từ + xuất PDF kèm chứng từ** (xem mục “ĐÍNH KÈM CHỨNG TỪ”),
   polish + analytics + crash reporting + test đa thiết bị.

### Nguyên tắc xuyên suốt
- Mỗi slice: code xong → USER TỰ build + test thật ở máy (sandbox trợ lý không build được).
- Slice 1 (schema) phải user DUYỆT trước khi viết SQL — sửa schema sau khi có data rất đau.
- Đụng vào engine settlement (lib/settlement) phải có test bao phủ (engine cốt lõi đã test).

## TÍNH NĂNG AI + QUÉT QR TÀI KHOẢN (chốt 2026-06-08)

### Quét QR tài khoản tự điền STK — KHÔNG phải AI, FREE, làm sớm
- Upload ảnh QR ngân hàng / quét camera → đọc QR (jsQR hoặc html5-qrcode, client-side) → ra chuỗi VietQR.
- Chuỗi theo chuẩn EMVCo/Napas TLV chứa BIN + số tài khoản. PARSE ngược lại (app đã có `vietqr.ts` để TẠO QR → giờ viết hàm parse).
- Map BIN → ngân hàng qua `BANK_OPTIONS` có sẵn → tự điền form STK.
- Chi phí = 0, độ chính xác 100% (không đoán như OCR). → FREE. Dùng ngay ở onboarding bước cấu hình STK.

### Phân loại chi tiêu — KHÔNG cần AI, FREE
- Gán nhãn (Ăn uống/Đi lại/...) bằng KEYWORD matching ("grab/taxi"→Đi lại, "ăn/cà phê"→Ăn uống). Rule-based, zero cost.

### Nhập chi bằng NGÔN NGỮ TỰ NHIÊN — tính năng AI chính (mồi câu) ✅ ĐÃ CODE (2026-06-09)
> ĐÃ TRIỂN KHAI theo mô hình LAI (user chốt): parser quy tắc `src/lib/ai/parseExpense.ts`
> (FREE unlimited, offline) + LLM `_shared/ai.ts` (Gemini 2.0 Flash chính, DeepSeek dự phòng)
> qua Edge Function `parse-expense` (quota free 15/tháng → Premium unlimited, bảng
> `ai_usage` migration 0019). UI `QuickParseBox` đầu ExpenseSheet: "Điền nhanh" (quy tắc) +
> "Hiểu thông minh" (LLM). Verify cloud/Gemini ở máy (xem CHANGELOG 2026-06-09).
- "Trả 500k ăn tối cho Hùng, Lan, tôi chia đều" → AI parse ra JSON (title/amount/payer/participants/splitMode) → đẩy vào ExpenseSheet đã có.
- Chi phí thấp (text only). **FREE CÓ HẠN MỨC (~15 lần/tháng) → Premium UNLIMITED** (chốt).
- Mồi câu chuyển đổi: dùng quen → hết quota → mua Premium.

### Quét hoá đơn OCR → itemized — PREMIUM ✅ ĐÃ CODE (2026-06-09)
> ĐÃ TRIỂN KHAI: Gemini vision (`_shared/ai.ts ocrReceiptLLM`) qua Edge Function
> `ocr-receipt` (Free NẾM 3 lần/tháng → Premium unlimited, tái dùng `ai_usage`
> feature='ocr_receipt'). Nút "Quét hoá đơn" ở `QuickParseBox` → điền MÓN + chế độ itemized
> (`ExpenseSheet.applyOcr`) → user sửa → lưu → ảnh upload Storage `receipts` làm chứng từ
> đính kèm (store.saveExpense nay trả id). Verify Gemini/cloud ở máy (xem CHANGELOG 2026-06-09).
- Chụp bill → vision AI nhận tên món + giá → tạo itemized split (engine đã có).
- Đắt hơn (vision). PREMIUM. LƯU Ý: hoá đơn VN đa dạng → độ chính xác không tuyệt đối → LUÔN cho user sửa trước khi lưu.

### Insight/tóm tắt chi tiêu AI — PREMIUM ✅ ĐÃ CODE (2026-06-09)
> ĐÃ TRIỂN KHAI mô hình LAI: số liệu tính client (`src/lib/insight.ts`) → Edge `insight`
> (`generateInsightLLM`, Gemini→DeepSeek) viết nhận xét `{headline, points[]}`. CẢ HAI phạm vi:
> nút Sparkles header GroupScreen (theo nhóm) + thẻ ở DashboardScreen (tổng). Free nếm 3 lần/
> tháng → Premium unlimited (ai_usage feature='insight'). `InsightSheet` gọi theo nút.
- "Tháng này nhóm chi nhiều nhất cho ăn uống, bạn nợ trung bình X". Premium.

### Model & hạ tầng AI
- Provider chính: **Gemini 2.0 Flash** (rẻ nhất, có vision cho OCR sau, tiếng Việt tốt).
- Dự phòng: **DeepSeek** (fallback khi Gemini lỗi/quá tải). → THIẾT KẾ tầng AI dễ đổi provider (adapter interface).
- Gọi qua **Supabase Edge Function** (giấu API key, kiểm soát quota/tháng theo gói, chống lạm dụng). KHÔNG gọi trực tiếp từ client.
- Quota AI lưu theo user (bảng usage: user_id, feature, count, period) để enforce hạn mức Free.

### Tổng kết phân loại Free/Premium
- **FREE**: quét QR tài khoản, phân loại chi tiêu (rule), nhập chi tự nhiên (~15 lần/tháng).
- **PREMIUM**: nhập chi tự nhiên unlimited, OCR hoá đơn (GĐ3), insight AI (GĐ3).

## Lộ trình kỹ thuật

### Giai đoạn 1 — "Dùng thật được" (BLOCKER, ~60-70% công sức còn lại)
1. Auth Google + Zalo (Supabase Auth, route guard bắt buộc đăng nhập).
2. Supabase schema CHUẨN HOÁ (không dùng JSONB tạm như MVP): bảng users/profiles, groups, group_members, expenses, expense_participants, expense_items, settlements... + RLS chặt.
3. Mời thành viên là user thật (link mời/SĐT), liên kết member ↔ account.
4. Đồng bộ realtime + chống xung đột ghi đè (LÝ DO Hysplit cũ bị huỷ — phải làm CỰC cẩn thận, dù code cũ đã fix được).
   - **Tiết kiệm tài nguyên (user chốt)**: poll/sync realtime **20s/lần** khi tab đang mở & active.
   - Khi tab bị chuyển (blur/hidden) quá **60s** → **TẮT realtime**, bật lại khi quay lại tab.
   - Dùng visibilitychange + timer; cân nhắc Supabase Realtime channel chỉ subscribe khi active.

### Giai đoạn 2 — "Đủ chín mở public"
5. Pháp lý: Điều khoản sử dụng + Chính sách bảo mật (bắt buộc cho OAuth + dữ liệu ngân hàng).
6. Onboarding lần đầu.
7. Xử lý lỗi mạng/cloud (retry, offline queue, báo mất kết nối).
8. Test luồng UI + đa thiết bị/trình duyệt thật (hiện chỉ test engine settlement).
9. Analytics + crash reporting (PostHog/Plausible + Sentry).
10. Empty/error states đầy đủ + validate giới hạn.
11. Bảo mật: rate limit, validate phía server.

### Giai đoạn 2.5 — Monetization (sau khi auth/cloud xong)
- Tích hợp PayOS + Edge Function webhook.
- Logic gói/giới hạn/hết hạn theo quy tắc trên.
- Mã kích hoạt thủ công.
- Màn quản lý gói + nhắc gia hạn 3 ngày.

### Giai đoạn 3 — Khác biệt hoá / tăng trưởng
12. Lịch sử/undo, xuất PDF/ảnh hoá đơn (PDF PHẢI nhúng chứng từ đã upload — xem mục “ĐÍNH KÈM CHỨNG TỪ”).
13. Nhắc nợ (push notification thật).
14. AI nhập chi bằng ngôn ngữ tự nhiên (có trong TODO gốc).
15. Nhập chi từ ảnh hoá đơn (OCR).
16. Multi-currency, chia định kỳ (tiền nhà hàng tháng).

## Nhắc kỹ thuật khi triển khai
- Tông xanh dương là yêu cầu CỨNG. Giọng văn VN chuyên nghiệp, gọn.
- Sandbox trợ lý KHÔNG build/install được (registry chặn + node_modules của macOS) → user tự `npm install && npm run build` ở máy.
- Deploy Cloudflare Pages, domain splitz.tson.io.vn. Có `.npmrc` legacy-peer-deps=true (vì Vite 8 mới, peer deps xung đột).
