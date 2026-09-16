<div align="center">

<img src="./public/og-image.png" alt="Splitz — chia tiền nhóm sòng phẳng trong vài chạm" width="760" />

# Splitz

**Alternative Splitwise mã nguồn mở — chia tiền nhóm, rút gọn lượt chuyển, quyết toán bằng QR.**

Chạy offline · Không cần tài khoản · 5 kiểu chia · 62 ngân hàng Việt Nam

**[▶ Xem bản chạy thật](https://splitz.tson.io.vn)**

[![CI](https://github.com/ngthson553-create/splitz/actions/workflows/ci.yml/badge.svg)](https://github.com/ngthson553-create/splitz/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

| Ghi khoản chi | Ai nợ ai | Quyết toán qua VietQR |
|:---:|:---:|:---:|
| ![Ghi khoản chi trong Splitz](docs/screenshots/expense.png) | ![Cân đối sau chuyến đi](docs/screenshots/settle.png) | ![Quyết toán bằng mã VietQR](docs/screenshots/qr.png) |

**Ba giao diện**, trong đó **Prestige** — phong cách thẻ đen viền vàng dành riêng cho Premium:

| Sáng | Tối | Prestige |
|:---:|:---:|:---:|
| ![Splitz giao diện sáng](docs/screenshots/theme-light.png) | ![Splitz giao diện tối](docs/screenshots/theme-dark.png) | ![Splitz giao diện Prestige](docs/screenshots/theme-prestige.png) |

Chuyến đi chơi, nhóm ở ghép, bữa ăn team — một người trả tiền, những người còn
lại nợ phần của mình, và cuối cùng phải có ai đó ngồi tính xem ai chuyển cho ai
bao nhiêu. Splitz làm đúng phần đó: tính số dư từng người, rút toàn bộ công nợ
xuống **ít lượt chuyển nhất có thể**, và sinh mã **VietQR** để tất toán từng lượt.

[English](README.md) · [Đóng góp](CONTRIBUTING.md) · [Báo lỗi](https://github.com/ngthson553-create/splitz/issues)

</div>

---

## Tại sao là Splitz?

Cộng một hoá đơn là phần dễ. Phần thú vị là đóng các khoản nợ: sau một chuyến đi
4 người, bạn không muốn 6 lượt chuyển — bạn muốn 2 hoặc 3.

Splitz coi đó là một bài toán thuật toán, không phải chuyện "tính sau". Từ số dư
ròng, nó tách các thành viên thành những cụm tổng bằng 0 và giải **chính xác**
từng cụm bằng quy hoạch động bitmask cho nhóm tối đa 10 người — để không ai phải
thực hiện một lượt chuyển có thể tránh được. Engine là TypeScript thuần, không
phụ thuộc UI, và là phần có độ phủ test cao nhất dự án. Có
[một mục riêng cho nó phía dưới](#engine-chia-tiền).

Splitz làm cho thị trường Việt Nam, nên nó quyết toán theo cách người Việt chuyển
tiền: **VietQR** — chuẩn QR mà mọi app ngân hàng Việt đều quét được — với BIN,
tên và logo của 62 ngân hàng.

> Splitz không giữ tiền và không xử lý thanh toán. Mã QR được tạo từ thông tin
> tài khoản của chính người nhận; giao dịch diễn ra trong app ngân hàng của người dùng.

## Tính năng

**Chia tiền và quyết toán**

- Nhóm và thành viên, thêm nhanh, mời bằng link hoặc mã.
- Khoản chi với 5 kiểu chia: **đều**, **nhập tay**, **phần trăm**, **theo phần**,
  **theo từng món** — hỗ trợ nhiều người trả trong một khoản và 10 loại tiền tệ
  cho chuyến xuyên biên giới.
- Số dư từng người với quy tắc làm tròn lẻ xác định, nên tổng luôn khớp đúng hoá đơn.
- Hai chiến lược quyết toán: **Smart settle** (greedy), và **Tối thiểu lượt chuyển**
  (bitmask DP chính xác cho tối đa 10 người, heuristic khi đông hơn).
- Đính kèm bằng chứng thanh toán vào một lượt quyết toán, để cả nhóm thấy khoản nợ
  đã được trả thật.
- Công nợ liên nhóm: bạn nợ ai và ai nợ bạn, gộp qua mọi nhóm.

**Thanh toán**

- Sinh mã VietQR / NAPAS cho 62 ngân hàng Việt Nam, kèm mã kiểm tra CRC16.
- Tên người nhận, ngân hàng và số tài khoản hiển thị cạnh QR để đối chiếu.

**Tài khoản, đồng bộ và ngoại tuyến**

- **Local-first mặc định**: chưa cấu hình backend thì app lưu tất cả trong
  `localStorage` và không cần tài khoản.
- Chế độ cloud tuỳ chọn trên Supabase: OTP email, đăng nhập Google, đăng nhập Zalo.
- PWA cài được, precache sẵn nên mở và dùng được khi ngoại tuyến.
- Nhắc công nợ qua web push và email.

**Premium**

- Gói trả phí qua **PayOS**, kèm mã kích hoạt, hạn dùng và thời gian gia hạn.
- Giao diện **Prestige** — thẻ đen, điểm nhấn vàng kim.

**Admin console**

- Khu `/console` ẩn với 4 vai trò (`owner`, `operator`, `support`, `readonly`),
  phân quyền được ép ở tầng database chứ không phải ở client.
- Audit log, tra cứu hỗ trợ, gửi email, vận hành AI, health check, job theo lịch,
  release notes và quét chất lượng dữ liệu.

**Trợ lý AI** (tuỳ chọn; không có key thì tự tắt)

- Nhập khoản chi bằng câu tự nhiên ("mình trả 250k bữa trưa cho 4 người"), OCR
  hoá đơn, và thống kê chi tiêu. Gemini là nhà cung cấp chính, DeepSeek là dự phòng.

## Công nghệ

| Tầng | Lựa chọn |
| --- | --- |
| Giao diện | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| Build | Vite 8, `vite-plugin-pwa` (Workbox) |
| Điều hướng | React Router 7 |
| Backend | Supabase — Postgres, Auth, Row Level Security, Edge Functions (Deno) |
| Thanh toán | PayOS |
| Email / push | Resend, Web Push (VAPID) |
| Phân tích / lỗi | PostHog, Sentry |
| Kiểm thử | Vitest, Testing Library, jsdom |

## Chạy nhanh

Cần **Node.js 22** (xem `.nvmrc`) và npm. Không cần backend, không cần tài khoản,
không cần cấu hình:

```bash
git clone https://github.com/ngthson553-create/splitz.git
cd splitz
npm install
npm run dev
```

Mở http://127.0.0.1:5173/. App chạy ở **chế độ local**, dữ liệu nằm trong
`localStorage`.

## Bật chế độ cloud

Chế độ cloud thêm tài khoản và đồng bộ nhóm giữa các thiết bị. App tự chuyển sang
khi có đủ `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.

1. **Tạo Supabase project.**
2. **Chạy migration** trong `supabase/migrations/` theo đúng thứ tự tên file:
   `supabase db push` bằng CLI, hoặc dán vào SQL editor.
3. **Copy file mẫu env** rồi điền 2 giá trị Supabase:
   ```bash
   cp .env.example .env.local
   ```
4. **Khởi động lại dev server.** Màn đăng nhập hiện ra và dữ liệu chuyển lên Postgres.

Các phần mở rộng tuỳ chọn, độc lập với nhau:

- **Đăng nhập Google** — bật provider trong Supabase và thêm callback URL.
- **Đăng nhập Zalo** — đặt `VITE_ZALO_APP_ID`, deploy Edge Function `zalo-auth`
  kèm secrets (`supabase secrets set ...`).
- **Premium / PayOS** — deploy `payos-create` và `payos-webhook`, trỏ webhook PayOS
  về `https://<project-ref>.functions.supabase.co/payos-webhook`.
- **Nhắc nợ** — bật `pg_cron` + `pg_net` rồi deploy `send-reminders`.
- **Vào admin console** — xem ghi chú bootstrap ở cuối file
  `supabase/migrations/0020_admin_console_foundation.sql`. Không có email nào bị
  hardcode trong repo; bạn tự đặt owner đầu tiên cho từng môi trường.

Deploy Edge Functions bằng `supabase functions deploy <name>`. Secrets của chúng
nằm trong Supabase secrets, không bao giờ ở `.env.local` và không bao giờ ở trong repo.

`.env.example` ghi rõ từng biến và từng bước cấu hình nhà cung cấp.

## Biến môi trường

Client chỉ thấy các biến `VITE_*`. Mọi thứ còn lại là secret của Edge Function.

| Biến | Bắt buộc | Công dụng |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | khi dùng cloud | URL project Supabase. |
| `VITE_SUPABASE_ANON_KEY` | khi dùng cloud | Publishable key của Supabase. |
| `VITE_SITE_URL` | khi deploy | URL công khai, dùng để sinh thẻ OG/Twitter tuyệt đối. Mặc định `http://localhost:5173`. |
| `VITE_ZALO_APP_ID` | tuỳ chọn | Bật nút đăng nhập Zalo. |
| `VITE_ZALO_VERIFICATION` | tuỳ chọn | Sinh thẻ meta xác thực tên miền Zalo lúc build. |
| `VITE_VAPID_PUBLIC_KEY` | tuỳ chọn | Đăng ký web push. |
| `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` | tuỳ chọn | Phân tích sản phẩm; trống = tắt. |
| `VITE_SENTRY_DSN` | tuỳ chọn | Báo lỗi; trống = tắt. |

> Quên đặt `VITE_SITE_URL` khi deploy sẽ để `og:image` và `og:url` trỏ về
> `localhost`, làm hỏng preview khi chia sẻ link. Hãy đặt bằng origin công khai.

## Cấu trúc dự án

```
src/
  lib/
    settlement/        # ENGINE: money, balances, smartSettle, maxReduction, vietqr
    data/              # repository: local.ts + supabase.ts, tự chọn theo env
    ai/                # parse-expense, OCR hoá đơn, insight
    store.tsx          # state của app, dựng trên repository
    auth.tsx, theme.tsx, subscription.tsx, notifications.tsx
  components/          # primitive dùng chung (Button, Card, Sheet, ...)
  features/
    home/ group/ groups/ expense/ members/ settle/   # luồng chia tiền chính
    auth/ dashboard/ insight/ notifications/ settings/ legal/
    admin/             # khu /console
supabase/
  migrations/          # 34 migration SQL, chạy theo thứ tự
  functions/           # 18 Edge Function (Deno)
docs/                  # ghi chú thiết kế, roadmap và bàn giao kiến trúc
```

## Engine chia tiền

`src/lib/settlement/` không phụ thuộc React, DOM hay Supabase. Đây là TypeScript
thuần, có độ phủ test cao nhất dự án, và là phần đáng đọc nhất.

**Tiền luôn là số nguyên.** Số tiền lưu ở đơn vị nhỏ nhất (đồng). Không có số
thực (float) ở bất kỳ đâu trên đường đi của tiền, nên không có sai số trôi.

**Mọi kiểu chia đều khớp đúng hoá đơn.** Khi số tiền không chia hết, phần lẻ được
phân bổ theo một quy tắc rõ ràng cho từng kiểu chia — chia đều và theo món phát
từng đồng lẻ từ đầu danh sách; chia phần trăm và theo phần để người cuối hấp thụ.
Quy tắc này là quyết định sản phẩm, không phải chuyện vô tình, và test khoá chặt nó.

**Tối thiểu lượt chuyển được giải chính xác, không phải xấp xỉ.** Từ số dư ròng,
`maxReduction` tách các thành viên thành những cụm độc lập có tổng bằng 0, rồi
giải chính xác từng cụm bằng quy hoạch động bitmask (subset-sum trên tập thành
viên) khi nhóm có tối đa 10 người. Đông hơn thì không gian tìm kiếm tăng quá
nhanh nên thuật toán chuyển sang heuristic. `smartSettle` là phương án greedy đơn
giản hơn: sắp xếp con nợ và chủ nợ, ghép khoản lớn nhất với khoản lớn nhất, lặp lại.

Cả hai đều hiện trong màn quyết toán, để nhóm so sánh "chuyển ít lượt nhất" với
"ghép đơn giản nhất".

**Mã QR sinh đúng chuẩn.** `vietqr.ts` phát payload TLV theo EMVCo kèm mã kiểm
tra CRC16, cùng BIN, tên rút gọn và URL logo của 62 ngân hàng Việt Nam.

```bash
npm test -- src/lib/settlement
```

## Lệnh

| Lệnh | Công dụng |
| --- | --- |
| `npm run dev` | Dev server Vite tại http://127.0.0.1:5173/. |
| `npm run build` | Build production vào `dist/`. |
| `npm run preview` | Chạy thử bản đã build. |
| `npm test` | Vitest, chạy một lần. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc -b`. |

CI chạy lint, typecheck, test và build ở mọi lần push và pull request.

## Triển khai

Phần giao diện là SPA tĩnh — host tĩnh nào cũng chạy. Bản tham chiếu dùng
Cloudflare Pages (build `npm run build`, thư mục ra `dist/`, fallback SPA đã có
sẵn qua `public/_redirects`).

Đặt `VITE_SITE_URL` và các biến `VITE_*` tuỳ chọn trong môi trường build của host
trước lần deploy đầu tiên.

## Tình trạng và lộ trình

Splitz là sản phẩm đang chạy thật, không phải bộ khung: bản demo công khai chạy
đúng đoạn code trong repo này. Ghi chú tiếng Việt trong `docs/` là hồ sơ kỹ thuật
của dự án — kiến trúc, roadmap và đặc tả admin console.

Các ý định làm tiếp được theo dõi ở
[issues](https://github.com/ngthson553-create/splitz/issues) — gồm nhóm tiền tệ
kết hợp, import từ Splitwise, khoản chi định kỳ và bản dịch. Nếu đó đúng việc bạn
muốn làm, pull request rất được hoan nghênh: bắt đầu từ
[CONTRIBUTING.md](CONTRIBUTING.md), và với thay đổi lớn hơn một bản sửa lỗi, hãy
mở issue trước để thống nhất hướng làm.

## Giấy phép

[Apache License 2.0](LICENSE) — xem thêm [NOTICE](NOTICE) để biết ghi công bên thứ ba.

Bạn được dùng, sửa và phân phối phần mềm này, kể cả cho mục đích thương mại, miễn
là giữ nguyên thông báo bản quyền và giấy phép. Giấy phép cũng cấp quyền sáng chế
một cách rõ ràng.

Splitz không liên kết, không được bảo trợ và không được chứng thực bởi VietQR,
NAPAS, PayOS, Splitwise hay bất kỳ ngân hàng nào có thông tin được sinh thành mã QR.
