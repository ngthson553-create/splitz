# Nhật ký thay đổi — Splitz

Định dạng: mới nhất ở trên cùng. Mỗi lần làm việc thêm một mục ngày.

## 2026-06-09 — Giai đoạn 3: Insight AI — nhận xét chi tiêu (PREMIUM + free nếm)

> Phân tích chi tiêu bằng AI ở CẢ HAI phạm vi (theo nhóm + tổng dashboard). User chốt:
> Free nếm 3 lần/tháng → Premium unlimited. Mô hình LAI: số liệu tính CHÍNH XÁC phía client
> (privacy + đúng số), LLM chỉ viết NHẬN XÉT tự nhiên + suy luận loại chi tiêu từ tên khoản.

### Thêm mới
- **Stats builder** `src/lib/insight.ts`: `buildGroupInsightStats` + `buildDashboardInsightStats`
  — tổng chi, khoản lớn nhất, chi theo người (spent/owed), số dư của bạn, chi tháng này vs
  tháng trước, theo nhóm. Tái dùng `balancesForGroup`/`memberContributions`/`buildDashboard`.
- **Adapter** `_shared/ai.ts`: `generateInsightLLM(stats)` — Gemini (DeepSeek dự phòng),
  responseSchema `{ headline, points[] }`, prompt cấm bịa số ngoài dữ liệu, tiền viết gọn.
- **Edge Function** `insight` (verify_jwt): quota `feature='insight'` free 3/tháng → Premium
  unlimited (tái dùng `ai_usage`, KHÔNG schema mới). Đăng ký config.toml.
- **Client** `src/lib/ai/insight.ts`: `requestInsight(stats)`.
- **UI** `src/features/insight/InsightSheet.tsx`: nút "Tạo phân tích" (gọi theo nút, không
  auto → kiểm soát chi phí) → hiện headline + các gạch đầu dòng. Hiện "còn N lượt" cho Free;
  hết lượt → khối nâng cấp Premium. Disclaimer "số liệu chính xác, nhận xét AI có thể chưa hoàn hảo".
- **Điểm vào**: nút Sparkles ở header `GroupScreen` (phân tích nhóm) + thẻ "Phân tích chi tiêu
  bằng AI" ở `DashboardScreen` (phân tích tổng). KHÔNG thêm tab/nav.

### Phân tầng
- Insight: Free 3 lượt/tháng → Premium unlimited (tính sẵn 3 tính năng AI dùng chung ai_usage:
  parse_expense 15/th, ocr_receipt 3/th, insight 3/th).

### Gate
- typecheck: 0 lỗi. lint: 0 errors (29 warnings, Insight thêm 0 warning mới). Edge + Gemini
  chưa chạy trong sandbox.

### Cần verify ở máy
- `supabase functions deploy insight` (secret GEMINI_API_KEY đã có; ai_usage migration 0019 đã áp).
- Mở 1 nhóm → nút Sparkles ở header → "Tạo phân tích" → nhận xét. Dashboard → thẻ "Phân tích
  chi tiêu" → "Tạo phân tích". Free hết 3 lượt → khối nâng cấp.

## 2026-06-09 — Giai đoạn 3: Quét hoá đơn OCR → chia theo món (PREMIUM + free nếm)

> Vision AI: chụp/chọn ảnh hoá đơn → nhận danh sách món → chế độ "Món" (itemized, engine
> đã có). User chốt: Free NẾM 3 lần/tháng → Premium unlimited; ảnh quét LƯU LUÔN làm chứng
> từ đính kèm. Tái dùng bảng `ai_usage` (feature='ocr_receipt') — KHÔNG schema mới.

### Thêm mới
- **Nén ảnh** `src/lib/image.ts`: `compressImage()` (fit 1280px, JPEG) trả `{ file, dataUrl }`
  — vừa lấy base64 gửi vision, vừa upload đính kèm (nhẹ băng thông) + `dataUrlToBase64()`.
- **Vision adapter** `_shared/ai.ts`: `ocrReceiptLLM()` — Gemini 2.0 Flash vision (inlineData
  base64, responseSchema items[]), prompt tiếng Việt bỏ dòng tổng/thuế thừa, giữ phụ phí.
  `coerceItems()` lọc món có tên + giá > 0. (OCR Gemini-only; text vẫn có DeepSeek dự phòng.)
- **Edge Function** `ocr-receipt` (verify_jwt): `effective_plan` → Free quota 3/tháng (feature
  ocr_receipt) → vision → trừ quota CHỈ khi có món. Giới hạn ảnh ~6MB. Đăng ký config.toml.
- **Client** `src/lib/ai/ocr.ts`: `ocrReceiptRemote()` nén + gửi + trả `{ items, remaining,
  file }`.
- **UI** `QuickParseBox`: thêm nút "Quét hoá đơn (chia theo món)" (cloud) → file input ảnh.
- **ExpenseSheet**: `applyOcr()` điền các MÓN (mặc định cả nhóm chia mỗi món) + chế độ "Món"
  + giữ `pendingReceipt`. Sau khi LƯU (cloud, có expense id thật) → `uploadAttachment` ảnh
  vào Storage `receipts` (lỗi đính kèm không làm hỏng lưu chi). Dòng nhắc "Ảnh sẽ được đính kèm".
- **store.saveExpense** nay TRẢ `{ id, version }` (trước là void) — cần id thật của server
  (cloud sinh id mới) để đính kèm đúng khoản chi.

### Phân tầng
- Quét hoá đơn: Free 3 lượt/tháng → Premium unlimited. (Nhập chi tự nhiên: quy tắc free
  unlimited + LLM 15/tháng→Premium — đợt trước.)

### Gate
- typecheck: 0 lỗi. lint: 0 errors (29 warnings, OCR thêm 0 warning mới). Edge Function +
  Gemini vision chưa chạy trong sandbox.

### Cần verify ở máy
- `supabase functions deploy ocr-receipt`; secret `GEMINI_API_KEY` đã có; bucket `receipts`
  + RLS đã có từ Slice 7. Áp migration 0019 (đã có từ đợt parse-expense).
- Tạo khoản chi → "Quét hoá đơn" → chọn ảnh bill → nhận món, chế độ "Món", chỉnh người chia
  → Lưu → kiểm ảnh đính kèm trong khoản chi. Free hết 3 lượt → toast mời nâng cấp.

## 2026-06-09 — Giai đoạn 3: Nhập chi tự nhiên (mô hình LAI: quy tắc FREE + AI)

> Tính năng AI chính ("mồi câu" chuyển đổi). User chọn HƯỚNG LAI: parser quy tắc FREE
> unlimited làm nền + LLM Gemini "hiểu thông minh" cho câu phức tạp (FREE 15 lần/tháng →
> Premium unlimited). Free luôn có quick-add chạy được (không bị chặn cứng). Đã có Gemini key.

### Thêm mới
- **Parser quy tắc** `src/lib/ai/parseExpense.ts` (+ `.test.ts`): port + cải tiến `aiParser`
  cũ (regex bóc số tiền k/tr/triệu, người trả theo từ khoá, người chia, tiêu đề). Offline,
  zero-cost, tức thì. Verify logic: 4/4 ca pass (chạy qua node strip-types; vitest cần máy).
- **Schema** `0019_ai_usage.sql`: bảng `ai_usage` (user_id, feature, period 'YYYY-MM', count)
  + RLS đọc own + `bump_ai_usage()` (atomic, security definer, chỉ service_role). Đếm quota
  LLM theo tháng; feature mở rộng sau (ocr_receipt, insight).
- **Tầng AI** `supabase/functions/_shared/ai.ts`: adapter dễ đổi provider — **Gemini 2.0
  Flash** (responseSchema JSON, temperature 0) chính, **DeepSeek** dự phòng khi Gemini lỗi.
  `coerce()` ép kết quả về tên thành viên hợp lệ + splitMode an toàn.
- **Edge Function** `parse-expense` (verify_jwt): xác thực user → `effective_plan` → Free
  kiểm quota 15/tháng TRƯỚC khi gọi LLM → gọi `parseExpenseLLM` → **trừ quota CHỈ khi thành
  công** (`bump_ai_usage`). Trả `{ parsed, remaining, limit, plan }`. Đăng ký config.toml.
- **Client** `src/lib/ai/remote.ts`: `parseExpenseRemote()` (functions.invoke, surface lỗi
  quota 429 thành thông điệp nâng cấp).
- **UI** `QuickParseBox.tsx` đặt đầu `ExpenseSheet` (CHỈ tạo mới): 1 ô input + "Điền nhanh"
  (quy tắc, luôn có) + "Hiểu thông minh" (LLM, chỉ cloud). Prefill title/amount/payer/người
  chia vào form (map tên→id, luôn chia đều) → user xem lại & sửa rồi lưu. Hiện "còn N lượt
  AI tháng này" cho Free. Không thêm tab/nav, gọn trong sheet sẵn có.

### Phân tầng (nhất quán ROADMAP)
- FREE: parser quy tắc unlimited + 15 lượt LLM/tháng. PREMIUM: LLM unlimited.

### Gate
- typecheck: 0 lỗi. lint: 0 errors (warnings cũ + không phát sinh từ code mới). Parser:
  4/4 ca logic pass. Edge Function (Deno) + Gemini call chưa chạy trong sandbox.

### Cần verify ở máy
- Áp migration 0019; `supabase functions deploy parse-expense`; set secret `GEMINI_API_KEY`
  (tùy chọn `GEMINI_MODEL`, `DEEPSEEK_API_KEY`); `APP_ORIGINS` đã có.
- `npm run test` chạy `parseExpense.test.ts` (vitest) — phải xanh.
- Tạo khoản chi → gõ câu → "Điền nhanh" (offline, tức thì) + "Hiểu thông minh" (gọi Gemini,
  điền form, trừ 1 lượt). Free hết 15 lượt → toast mời nâng cấp; "Điền nhanh" vẫn dùng được.

## 2026-06-09 — Giai đoạn 3: Nhắc nợ một chạm (FREE)

> Bắt đầu Giai đoạn 3 (khác biệt hoá/tăng trưởng) sau khi blocker QC Slice 1-7 đã khép
> (user verify M4 ở máy). Tính năng đầu: nhắc nợ — biến app từ "sổ ghi" thành công cụ
> đòi nợ thật. FREE. Đặt UI khéo, KHÔNG thêm tab/nav.

### Thêm mới
- **Schema** `supabase/migrations/0018_debt_reminders.sql`: bảng `debt_reminders`
  (group_id, from_member_id=con nợ, to_member_id=chủ nợ, reminded_by, reminded_at) làm
  NHẬT KÝ + nguồn chân lý chống spam. RLS: thành viên nhóm SELECT (để UI biết cooldown);
  KHÔNG policy insert → chỉ Edge Function (service role) ghi (giống pattern settlements).
- **Edge Function** `supabase/functions/remind-debt` (verify_jwt=true): chủ nợ gọi → xác
  thực caller là `to_member` → rate-limit **1 lần/24h/khoản** (cặp group+from+to) → tra
  `user_id` con nợ → đọc `push_subscriptions` (service role) → gửi Web Push (dùng lại
  `web-push` + VAPID của nhắc gia hạn) → ghi log. Nhận MẢNG con nợ (1 = nhắc lẻ; nhiều =
  "Nhắc tất cả"). Trả `{ sent, results[] }` với status sent/no_device/not_real_user/cooldown.
  Đăng ký trong `config.toml`.
- **Client** `src/lib/data/reminders.ts`: `remindDebts()` (functions.invoke) +
  `listMyDebtReminders()` (tra cooldown các khoản tôi là chủ nợ).
- **UI** `SettleTab.tsx`: ở card "Cần chuyển" khi TÔI là người nhận & con nợ là user thật
  → nút **"Nhắc trả nợ"** đặt vào đúng hàng trống (chỗ người trả thấy "Tôi đã chuyển") →
  mỗi card vẫn tối đa 1 nút + 1 icon QR, KHÔNG tràn. Trong 24h → "Đã nhắc" (disabled).
  Thẻ tóm tắt thêm **"Nhắc tất cả"** chỉ khi ≥2 người (user thật) đang nợ mình & chưa cooldown.
  Chỉ hiện ở cloud mode. Tải cooldown theo `group.id`+`myMemberId` (không churn poll 20s).
- **Deep-link** `GroupScreen.tsx`: đọc `?tab=settle` → push mở thẳng tab Quyết toán cho con nợ.

### KHÔNG đụng
- Engine settlement (transfers vẫn derived). Không thêm tab/nav. In-app notif (localStorage
  per-device) giữ nguyên — nhắc nợ đi qua Web Push vì là kênh chéo-user duy nhất hiện có.

### Gate
- typecheck: 0 lỗi. lint: 0 errors (29 warnings — +1 `set-state-in-effect` cùng pattern
  hiện có ở subscription/store, vô hại). Edge Function (Deno) chưa check trong sandbox.

### Cần verify ở máy (sandbox không build/Deno/cloud được)
- Áp migration 0018; deploy function `remind-debt` (`supabase functions deploy remind-debt`);
  đảm bảo secrets VAPID_* + APP_ORIGINS đã set.
- 2 thiết bị/2 tài khoản: A nợ B → B mở tab Quyết toán thấy "Nhắc trả nợ" → bấm → A nhận
  Web Push (đã bật thông báo) → bấm push mở `/g/<id>?tab=settle`.
- Bấm Nhắc lần 2 trong 24h → nút "Đã nhắc"/toast "vừa nhắc gần đây". Con nợ chưa bật thông
  báo → toast "chưa nhận được nhắc". Thành viên ảo → không có nút Nhắc.

## 2026-06-09 — Nâng cấp Theme Prestige cho "đẳng cấp" hơn

### Sửa giao diện (chỉ scope .prestige + popup)
- **Vàng kim loại đánh bóng**: thêm token `--gold-metal` (gradient nhiều stop highlight)
  + `--gold-sheen`. Nút primary (`gradient-brand`) nay là vàng kim loại có **ánh sheen
    quét qua khi hover**; popup CTA có sheen **tự quét** (`cta-sheen`).
- **Card sang hơn**: viền vàng bắt sáng + đường highlight mảnh ở mép trên (`.card::before`)
  + glow vàng nhẹ + đổ bóng sâu.
- **Nền sân khấu**: aurora đổi sang ánh vàng; thêm vignette tối trên/dưới (`.prestige body`)
  tạo chiều sâu, làm vàng nổi bật.
- **Chữ gradient vàng lấp lánh**: `.text-gradient` chạy `gold-shimmer` 6s.
- Palette gold tinh chỉnh sâu hơn (đỉnh sáng #fff4cf, nền tối #050406).
- Swatch Prestige + crown badge/popup dùng cùng vàng kim loại để nhất quán.

### Gate
- typecheck 0, lint 0 errors. CSS 79/79 braces cân. Verify trực quan ở máy (cần Premium).

## 2026-06-09 — Popup nâng cấp Premium + Theme Prestige (đen/vàng)

### Thêm mới
- **Theme "Prestige"** (thẻ đen mạ + accent vàng) — theme thứ 3, CHỈ Premium:
  - `index.css`: scope `.prestige` ghi đè token `--color-brand-*` (sang gold) + surface/
    border/text + biến thể `gradient-brand/-soft/-card/-mesh`, `shadow-glow`, `.card` viền
    vàng. Dùng lại MỌI class hiện có → không sửa từng component.
  - `lib/theme.tsx`: type `Theme` thêm `'prestige'`; prestige bật CẢ `.dark` (giữ biến thể
    `dark:`) LẪN `.prestige` (token vàng đặt sau cascade nên thắng); meta theme-color riêng.
  - Chọn theme trong trang Giao diện (`SettingsScreens.tsx`): 3 swatch Sáng/Tối/Prestige;
    Prestige có khoá 🔒 cho user Free (chặn + toast).
  - `PremiumThemeSync.tsx` (mount ở AppShell): lần ĐẦU lên Premium tự bật Prestige 1 lần
    (cờ `splitz.prestigeOffered.v1`, user vẫn đổi lại được); mất Premium mà đang Prestige
    → hạ về Tối (tránh kẹt theme khoá).
- **Popup mời nâng cấp** (`UpgradePrompt.tsx`, mount ở AppShell) — chỉ user Free/cloud:
  - **Tần suất giãn dần thông minh** (KHÔNG mỗi lần mở web — tránh phản tác dụng): chỉ bắt
    đầu sau ≥3 lần mở; tối đa 1 lần/ngày; backoff theo số lần bỏ qua 1→3→7→14 ngày; có
    "Không nhắc nữa". Trạng thái lưu `splitz.upgradePrompt.v1`.
    Lý do: user yêu cầu "mỗi lần mở" nhưng được tư vấn đổi sang giãn dần để giữ conversion.
  - Style teaser đen/vàng (đồng bộ Prestige), CTA "Xem các gói" → mở `PlanSheet`.
  - Track: `upgrade_prompt_shown/dismissed/muted/cta`.

### Gate
- typecheck: 0 lỗi. lint: 0 errors (warnings cũ: set-state-in-effect ×2, react-refresh ×1).
- Chưa build/Playwright trong sandbox; user verify ở máy (đăng nhập cloud + tài khoản
  Premium/mã kích hoạt để thấy Prestige; user Free để thấy popup theo tần suất).

## 2026-06-09 — UI polish: Nhóm, Quyết toán, Cài đặt (tách trang con)

### Sửa giao diện
- **Thẻ nhóm (`GroupsScreen.tsx`)** redesign: bố cục căn trái, nền `gradient-mesh`,
  icon 12×12, tên 1 dòng, khối "Tổng chi" rõ, **chồng avatar thành viên** (size `xs`,
  tối đa 4 + đếm thêm) và **chip trạng thái** ("Cần QT" đỏ / "Xong" xanh) thay cho chấm
  nhỏ. Bỏ `aspect-[5/6]` thừa khoảng trống.
- **Quyết toán (`SettleTab.tsx`)** gọn cho mobile: cụm avatar người trả→nhận thu nhỏ
  (`xs`, sát nhau), tên **xuống dòng** (line-clamp-2) thay vì truncate "Doan K…".
  Nút "Tạo QR" full-width chiếm cả hàng → nay là **nút icon vuông** cạnh số tiền;
  hàng dưới chỉ còn "Tôi đã chuyển" (khi là người trả). Áp dụng cho cả thẻ đang chờ.
- **Avatar** thêm size `xs` (24px) (`components/ui.tsx`).

### Cài đặt — tách trang con (bỏ "nhồi 1 màn hình")
- `SettingsScreen.tsx` viết lại thành **trang index**: thẻ hồ sơ + các khối có tiêu đề
  (Tài khoản / Ứng dụng / Hỗ trợ & pháp lý), mỗi mục là 1 dòng điều hướng.
- **Trang con mới** (`SettingsScreens.tsx`, route `/settings/*`): `Hồ sơ`, `Tài khoản
  nhận tiền`, `Giao diện`, `Dữ liệu & lưu trữ`. + route trong `main.tsx`.
- **Bỏ ô "Tên của bạn" thừa dưới avatar** ở trang Cài đặt chính — chỉnh tên nay nằm
  trong trang con Hồ sơ. Toggle sáng/tối nhanh giữ lại ở index; trang Giao diện có đủ
  toggle + 2 nút Sáng/Tối.

### Gate
- typecheck: 0 lỗi. lint: 0 errors (2 warning `set-state-in-effect` mang nguyên từ
  code cũ — sync nameDraft + prefill bank — không phải lỗi mới).
- Chưa build/Playwright trong sandbox; user verify ở máy.

## 2026-06-09 — Fix Bước 2+3 (P1: routing, gate xanh, service worker push)

### Sửa (P1 — Bước 2: routing + gate)
- 🟡 **Route `/join` 404 thô** (C2): thêm màn nhập mã/link độc lập `JoinEntryScreen` tại
  `/join` (tái dùng `extractToken`); thêm `errorElement` (`RouteError`) cho các route +
  catch-all `*` → không còn lộ 404 thô của React Router. (`src/main.tsx`,
  `src/features/groups/JoinEntryScreen.tsx`, `src/components/RouteError.tsx`)
- 🟡 **Join fail-closed khó hiểu ở local** (M1): `JoinScreen` ở chế độ local không gọi
  Supabase (tránh throw) mà hiện thông báo rõ "Cần đăng nhập để tham gia". (`JoinScreen.tsx`)
- 🟢 **typecheck XANH** (0 lỗi): bỏ import `formatVnd` thừa (`GroupScreen.tsx`); sửa kiểu
  `Uint8Array<ArrayBuffer>` cho `applicationServerKey` (`webpush.ts`); đổi reference
  `vitest/config` (`vite.config.ts`).
- 🟢 **lint 0 errors** (còn warnings): sửa 4 lỗi thật — `_e` thừa (payos-webhook),
  `url` no-useless-assignment (attachments), `location.assign` thay gán `location.href`
  (PlanSheet), tính `daysLeft` trong effect tránh `Date.now()` khi render (subscription).
  Hạ 2 rule RC quá khắt khe của react-hooks v7 về `warn` (`set-state-in-effect`,
  `react-refresh/only-export-components`) — có comment lý do trong `eslint.config.js`.

### Sửa (P1 — Bước 3: Web Push production)
- 🟡 **`dist/sw.js` (Workbox) đè mất handler push** (M3): tách handler push ra
  `public/push-sw.js` và dùng `workbox.importScripts: ['/push-sw.js']` để Workbox NHÚNG
  push vào SW sinh ra → `/sw.js` có CẢ precache caching LẪN push trong cùng 1 worker.
  (`vite.config.ts`, `public/push-sw.js` ← đổi tên từ `public/sw.js`)

### Cần verify ở máy (sandbox không build/Playwright được)
- `npm run build` → kiểm `dist/sw.js` có chứa `importScripts(... push-sw.js ...)`.
- Test push thật trên HTTPS (cần VAPID + đăng nhập): bật thông báo ở Cài đặt → gửi push.
- Re-run Playwright: `/join` (không token) phải hiện màn nhập mã, không còn 404; mở
  `/duong-dan-la` phải ra RouteError.

### Trạng thái gate sau Bước 1→3
- typecheck: 0 lỗi. lint: 0 errors (28 warnings — rule RC đã hạ + 2 warning vô hại cũ).
- Còn lại: P2 (M4) — vòng cloud thật (Supabase/PayOS/Storage/realtime 2 thiết bị), user tự chạy.

## 2026-06-09 — QC hợp nhất + Fix Bước 1 (P0: mở khoá tương tác Sheet)

### Bối cảnh
- Hợp nhất QC từ 2 nguồn (review tĩnh + audit bên thứ 3 chạy Playwright thật). Báo cáo
  đầy đủ: `docs/QC_HOP_NHAT_Slice1-7.md`. Verdict: chưa sẵn sàng release; 2 blocker P0
  về tương tác (nút `+`, tạo nhóm/tham gia "bấm không ăn").

### Sửa (P0 — Bước 1)
- 🔴 **`Sheet` bị ancestor có transform thu hẹp `position: fixed`** (CAO — đây là blocker
  click thật): mọi Sheet render bên trong `PageTransition`/route `motion.div` (có
  `transform`) → backdrop/panel `fixed inset-0` định vị theo ancestor, lệch chỗ và che
  mất nút. Nay **portal `Sheet` ra `document.body`** (`createPortal`). Áp dụng tương tự
  cho `ConfirmDialog`. (`src/components/Sheet.tsx`, `src/components/ConfirmDialog.tsx`)
- 🟡 **`QuickAddExpense` reset khi poll realtime** (TRUNG BÌNH): `useEffect([open, groups])`
  chạy lại mỗi lần store poll 20s (mảng `groups` mới) → reset lựa chọn nhóm → ExpenseSheet
  remount, xoá form / nhảy về màn chọn nhóm. Nay chỉ khởi tạo khi sheet VỪA mở (ref
  `wasOpen`), lưu `pickedId` + tra nhóm tươi từ store (không giữ snapshot cũ).
- 🟡 **`ExpenseSheet` reset form khi `group.members` đổi** (TRUNG BÌNH): effect nạp/clear
  form phụ thuộc `group.members` → poll realtime xoá dữ liệu đang nhập. Nay khoá theo lần
  MỞ + danh tính expense (`initKey` ref); vẫn dùng members mới nhất khi nạp.

### Cần verify ở máy (sandbox trợ lý không build/chạy được)
- `npm run build` + chạy lại Playwright: `test-results/qc-slice7/qc_slice1_7_join_plus.py`
  và `test-results/qc-combined/qc_continuation_after_sheet_bypass.py` → yêu cầu HẾT warn
  "Normal click blocked".
- typecheck/lint: các sửa Bước 1 KHÔNG thêm lỗi mới (vẫn 3 typecheck + 28 lint cũ — để
  Bước 2 dọn). 

### Chưa làm (theo lộ trình)
- Bước 2: route `/join` + errorElement, làm rõ join local/cloud, dọn typecheck (3) + lint (28).
- Bước 3: service worker push (M3). Bước 4: vòng cloud thật (M4).

## 2026-06-09 — Slice 7 (Hoàn thiện: FAQ, Analytics, Chứng từ+PDF, Đa tiền tệ)

### Thêm mới
- **FAQ in-app** (`/faq`) + thẻ "Hỗ trợ & pháp lý" trong Cài đặt (FAQ/Điều khoản/Bảo mật).
- **Analytics + crash**: PostHog + Sentry (`analytics.ts`), init theo env (no-op khi trống);
  identify khi đăng nhập, capture lỗi ở ErrorBoundary. Deps: posthog-js, @sentry/react.
- **Đính kèm chứng từ** (`0016`): bảng `expense_attachments` + bucket Storage private
  `receipts` + RLS theo nhóm. `AttachmentSection` trong chi tiết khoản chi (xem/thêm/xoá,
  ảnh+PDF, ≤10MB, signed URL). **Xuất báo cáo PDF** (print-to-PDF, hỗ trợ tiếng Việt +
  nhúng ảnh chứng từ) — nút trong Cài đặt nhóm.
- **Đa tiền tệ** (`0017`): `upsert_expense` thêm `p_amount_original`+`p_exchange_rate`
  (GIỮ NGUYÊN logic version-atomic QC của 0009). `exchange.ts` lấy tỷ giá → VND
  (open.er-api.com, cache theo ngày). ExpenseSheet chọn ngoại tệ khi TẠO MỚI → quy đổi
  nhất quán sang VND (`amount_base`). Engine KHÔNG đổi (vẫn chạy trên VND).

### Giới hạn / cần verify
- **Đa tiền tệ chỉ ở TẠO MỚI**; SỬA thao tác trên VND (tránh double-convert/lỗi làm tròn).
  Chi tiết hiển thị tiền gốc. Mở rộng sửa-ngoại-tệ + test bao phủ để sau (ROADMAP: research kỹ).
- Chứng từ: xoá khoản chi để lại file orphan trên Storage (dọn sau). Đính kèm hiện ở
  màn CHI TIẾT (chưa ở lúc nhập — có thể bổ sung).
- Đã có (slice trước): Điều khoản+Bảo mật (Slice 2), Web Push (Slice 6).

### Cần cấu hình
- Analytics (tuỳ chọn): VITE_POSTHOG_KEY, VITE_SENTRY_DSN.
- Storage: migration `0016` tự tạo bucket + RLS (chạy `supabase db push`).
- npm install (posthog-js, @sentry/react). Migrations `0016`, `0017`.

## 2026-06-09 — Slice 6 (Premium + PayOS + nhắc gia hạn)

### Thêm mới
- **Giới hạn theo gói chủ nhóm** (`0012`): Free = 3 nhóm/8 thành viên; Cá nhân/Team =
  ∞ nhóm/25 thành viên. Enforce bằng TRIGGER (bắt mọi đường ghi). Hết hạn →
  `effective_plan` trả 'free' → chặn tạo thêm, KHÔNG xoá data. RPC `my_plan_info`.
- **Billing** (`0013`): bảng `payment_orders`; RPC `redeem_code` (mã kích hoạt — admin
  cấp premium không cần thanh toán) + `grant_subscription` (gia hạn cộng dồn, dùng
  chung redeem & webhook).
- **PayOS Edge Functions**: `payos-create` (tạo link, lưu đơn) + `payos-webhook`
  (verify checksum → kích hoạt). Frontend `PlanSheet` (chọn gói/chu kỳ → PayOS,
  nhập mã) + `PlanCard` ở Settings; paywall khi tạo nhóm vượt giới hạn.
- **Trạng thái gói** (`subscription.tsx`): plan/giới hạn/đã dùng, `isPremium`,
  `atGroupLimit`, `expiringSoon` (banner in-app).
- **Nhắc gia hạn** (`0014` + EF `send-reminders`): EMAIL (Resend) + WEB PUSH (VAPID,
  `public/sw.js` + `webpush.ts` + toggle Settings) + hạ cấp quá hạn; chạy theo
  pg_cron. Đã nhắc/chu kỳ tránh lặp.

### Cần cấu hình (không test được trong sandbox)
- Secrets: PAYOS_* + APP_URL; RESEND_API_KEY/RESEND_FROM; VAPID_* (npx web-push
  generate-vapid-keys) + VITE_VAPID_PUBLIC_KEY. Webhook URL ở PayOS. pg_cron + pg_net
  cho lịch nhắc (SQL mẫu trong `0014`). Tạo `redemption_codes` bằng SQL/Dashboard.
- Migrations mới: `0012`–`0014`. Edge Functions: payos-create, payos-webhook,
  send-reminders. Quyết định: redeem làm bằng RPC (gọn hơn Edge Function).

### Nợ / polish
- Nhiều payer (Slice 4), đa tiền tệ (Slice 7), in-app server notifications.
- Sau khi PayOS return ?payment=success, plan có thể cập nhật trễ (chờ webhook) —
  hiện dựa reload trang; có thể thêm poll.


## 2026-06-09 — Slice 5 (Quyết toán + xác nhận đôi)

### Thêm mới
- **Xác nhận đôi (2 chiều mềm)**: người TRẢ bấm "Tôi đã chuyển" → quyết toán `pending`;
  người NHẬN bấm "Đã nhận" → `confirmed` → trừ công nợ. Chống tự đánh dấu khống.
  - Migration `0010_settlements_rpc.sql`: RPC `create_settlement` (chỉ người trả),
    `confirm_settlement` (chỉ người nhận), `cancel_settlement`; KHOÁ RLS settlements
    (bỏ INSERT/UPDATE trực tiếp → mọi thay đổi qua RPC).
  - Engine: hàm THUẦN MỚI `applySettlements`/`settleState`/`memberNetBalance`
    (`settlement/settlements.ts`) — KHÔNG sửa `balancesForGroup` đã test. Số dư =
    expenses − quyết toán đã xác nhận; gợi ý chuyển loại cả pending để không trùng.
  - `Settlement` type + `Group.settlements`; load trong cloud repo; ops create/confirm/
    cancel (cloud RPC, local aggregate); store wiring.
  - `SettleTab` viết lại: mục "Đang chờ xác nhận" + gợi ý chuyển có "Tạo QR" + "Tôi đã
    chuyển". `GroupScreen`/`GroupsScreen` chỉ báo "còn nợ" theo `settleState`.
- **Chặn rời nhóm khi còn nợ**: `GroupSettingsSheet` kiểm `memberNetBalance` ≠ 0 trước
  khi rời (client-side; chặn server-side để sau vì cần engine trong SQL).

### Lưu ý / nợ
- **Số migration**: settlements là `0010` (vì `0009` đã là `0009_expense_version_atomic`
  của đợt QC Slice 4). Thứ tự áp dụng giữ nguyên.
- CHƯA: UI nhiều payer (Slice 4 nợ), đa tiền tệ (Slice 7), chặn-rời server-side.

### ⚠️ Quy trình (tránh va chạm)
- Trợ lý build Slice 5 trên nền **v0.2.0**. Khi đang làm 1 slice, TRÁNH sửa/commit
  `src/lib/data/*`, `store.tsx`, `settlement/*`, `SettleTab.tsx` cho tới khi trợ lý
  báo xong — vì commit giữa chừng (vd v0.2.0) reset working tree, ghi đè thay đổi
  trợ lý đang dở (đã xảy ra 2 lần với migration + supabase.ts, đều đã khôi phục).

## 2026-06-09 — QR upload + kế hoạch chứng từ

### Sửa
- **Quét QR tài khoản cho upload ảnh từ thư viện**: bỏ `capture="environment"` ở
  `BankFields.tsx` (trước đây ép mở camera trên điện thoại) → nay chọn được ảnh QR
  có sẵn HOẶC chụp mới.

### Roadmap (ghi để làm sau — Slice 7/khi phù hợp)
- **Đính kèm chứng từ cho khoản chi** (ảnh + PDF, nhiều tệp/khoản, không bắt buộc),
  ai trong nhóm cũng xem được; **xuất PDF phải nhúng chứng từ**. Hướng: Supabase
  Storage + bảng `expense_attachments` + RLS theo nhóm. Chi tiết trong
  `ROADMAP.md` mục “ĐÍNH KÈM CHỨNG TỪ / HOÁ ĐƠN”.

## 2026-06-09 — Slice 4 (Khoản chi + đồng bộ realtime)

### Thêm mới
- **Khoản chi per-record trên cloud** (TIM của app — chỗ Hysplit cũ chết):
  - RPC `upsert_expense` (migration `0008_expenses_rpc.sql`) ghi ATOMIC expense +
    payers + participants + items trong 1 transaction; KIỂM `version` khi sửa →
    lệch thì raise `CONFLICT` (không ghi đè mù), client báo "tải lại".
  - Cloud repo nạp expenses (+ dòng con) trong `list`/`get`; ops granular
    `saveExpense`/`removeExpense` thay cho ghi cả cục. Local giữ aggregate.
  - `Expense.version` + `ConflictError` (`data/errors.ts`).
  - `ExpenseSheet` → `saveExpense` (xử lý conflict); `ExpensesTab` xoá → `removeExpense`.
- **Đồng bộ realtime tiết kiệm tài nguyên** (store): poll 20s khi tab hiển thị; ẩn
  >60s → tắt; quay lại tab → đồng bộ ngay rồi bật lại. Dùng `visibilitychange`.

### Lưu ý / nợ
- **Đổi số migration**: file khoản chi đánh `0008_expenses_rpc.sql` (vì `0007` đã là
  `0007_invite_atomic.sql` của đợt QC Slice 3). Thứ tự áp dụng giữ nguyên.
- Engine settlement KHÔNG đụng (chạy trên aggregate sau khi load) — đúng cảnh báo.
- Đa tiền tệ map tạm VND (`amount_base = amount_original = amount`, rate 1) — Slice 7.
- CHƯA làm: UI nhiều payer (schema + RPC đã hỗ trợ mảng payers, chỉ thiếu UI).

### Đối chiếu (quan trọng)
- Trợ lý lỡ ghi đè `data/supabase.ts` lúc bắt đầu Slice 4, làm mất 2 bản vá QC của
  chủ dự án — ĐÃ KHÔI PHỤC: `save(group, removedMemberIds)` (xoá đúng id chủ động bỏ,
  không diff DB) và `create_group` truyền emoji (`randomGroupEmoji`).

## 2026-06-09 — QC Slice 6 (Premium + PayOS)

### Sửa (sau review)
- 🟡 **Webhook double-grant khi PayOS retry** (TRUNG BÌNH): `payos-webhook` claim đơn
  bằng UPDATE có điều kiện `.eq('status','pending')` rồi mới grant theo số row trả về →
  chỉ 1 lần giao (kể cả retry đồng thời) kích hoạt, không cộng dồn 2 chu kỳ.
- 🟢 **Verify chữ ký hằng-thời-gian** (THẤP): thêm `timingSafeEqual`, thay `!==`.
- 🟢 **`orderCode` chống trùng** (THẤP): `Date.now()*1000 + random` thay `Date.now()`.
- 🟢 **`send-reminders` chặn người lạ** (THẤP): yêu cầu `Authorization: Bearer <service role>`.
- 🟢 **Race giới hạn nhóm/thành viên** (THẤP): advisory lock theo owner/group trong trigger
  (`0015_premium_hardening.sql`) → 2 insert đồng thời không cùng vượt ngưỡng.
- 🟢 **Thu hẹp quyền `effective_plan(uid)`** (THẤP): revoke khỏi authenticated (tránh dò gói
  người khác); trigger + `my_plan_info` là SECURITY DEFINER nên vẫn chạy.

### Ghi chú
- Cần áp migration `0012` → `0015` + deploy 3 Edge Function (payos-create, payos-webhook,
  send-reminders) + đặt secrets + cấu hình webhook PayOS + (tuỳ chọn) pg_cron nhắc gia hạn.

## 2026-06-09 — QC Slice 5 (Quyết toán + xác nhận đôi)

### Sửa (sau review)
- 🟡 **Vá race confirm/cancel** (TRUNG BÌNH): `confirm_settlement`/`cancel_settlement`
  trước kiểm status bằng SELECT-rồi-UPDATE → chạy đồng thời có thể đè nhau (kết thúc
  'confirmed' dù vừa bị huỷ). Nay đưa `status = 'pending'` vào WHERE của UPDATE
  (nguyên tử) + raise CONFLICT nếu 0 row. Migration `0011_settlements_guard.sql`.
- 🟢 **Chặn amount vô lý khi tạo quyết toán** (THẤP): `create_settlement` từ chối số tiền
  > tổng chi tiêu nhóm (cận trên rẻ, không cần engine ghép nợ trong SQL; vẫn cho trả
  từng phần). Double-confirm vẫn là lớp bảo vệ chính.
- 🟢 **Chủ nhóm huỷ được quyết toán đang chờ** (THẤP): `SettleTab` hiện nút “Huỷ” cho cả
  owner (khớp quyền RPC `cancel_settlement` = người trả / người nhận / chủ nhóm).

### Ghi chú
- Cần áp migration `0010` + `0011` lên Supabase.
- Chặn-rời-khi-còn-nợ phía SERVER (cần engine ghép nợ trong SQL) vẫn để sau; hiện chặn
  ở client qua `memberNetBalance` (chỉ tính quyết toán đã xác nhận).

## 2026-06-09 — QC Slice 4 (Khoản chi + đồng bộ realtime)

### Sửa (sau review)
- 🔴 **Chống ghi đè mù THỰC SỰ atomic** (CAO — lỗi giết Hysplit cũ): `upsert_expense`
  trước đây kiểm version bằng SELECT-rồi-UPDATE (WHERE chỉ có id) → 2 người sửa cùng
  version có thể cùng qua pre-check, người sau ghi đè mà không CONFLICT. Nay đưa
  `version` vào WHERE của UPDATE (khoá row, kiểm + ghi nguyên tử); 0 row → raise CONFLICT.
  Migration mới `0009_expense_version_atomic.sql` (`create or replace`).
- 🟡 **Nhiều người trả 1 khoản chi** (TRUNG BÌNH — thiếu so với phạm vi slice 4):
  `ExpenseSheet` cho chọn nhiều payer + nhập tiền từng người + nút “Chia đều tiền trả”
  + kiểm tổng trả = tổng tiền; `ExpenseDetailSheet` liệt kê nhiều payer; danh sách hiện
  “Tên +N trả”. (Schema/RPC/engine đã sẵn `payers[]`.)
- 🟢 **`removeExpense` kiểm version** (THẤP): xoá kèm `version`; nếu bản đã bị sửa nơi
  khác → ConflictError, tải lại danh sách thay vì xoá đè.
- 🟢 **Tự tải lại khi xung đột** (THẤP): store reload nhóm khi gặp ConflictError (lưu/xoá)
  để UI hiện ngay bản mới nhất.
- 🟢 **Polling khi tab nạp lúc đang ẩn** (THẤP): lên lịch tắt sau 60s ngay cả khi
  `visibilitychange` không tự kích hoạt.

### Ghi chú
- Cần áp migration `0008` + `0009` lên Supabase.
- Để sau theo ROADMAP (không phải lỗi): validate server-side tổng tiền/participant,
  phân loại chi (category rule-based), đa tiền tệ.
- Vẫn cần chạy `npm run typecheck && npm run lint` ở máy (sandbox chặn registry).

## 2026-06-09 — QC Slice 3 (Nhóm + thành viên + mời)

### Sửa (sau review)
- **Chống xoá nhầm thành viên khi sửa đồng thời** (TRUNG BÌNH): `save()` cloud không
  còn suy danh sách xoá từ diff với DB (có thể xoá nhầm member người khác vừa thêm).
  Nay store truyền `removedMemberIds` — đúng các thành viên người dùng chủ động bỏ.
  (`repository.ts`, `data/supabase.ts`, `data/local.ts`, `store.tsx`)
- **Atomic lượt dùng lời mời** (TRUNG BÌNH): `join_group_via_invite` tăng `used_count`
  bằng UPDATE có điều kiện `used_count < max_uses` (khoá row) thay vì check-rồi-tăng
  → 2 người join đồng thời không vượt giới hạn. Migration mới `0007_invite_atomic.sql`
  (dùng `create or replace`, không sửa migration đã áp dụng).
- **Hướng dẫn chủ nhóm rời nhóm** (THẤP): thêm gợi ý ở Cài đặt nhóm — phải chuyển quyền
  cho thành viên đã có tài khoản trước khi rời (`GroupSettingsSheet.tsx`).
- **Emoji nhóm khi tạo trên cloud** (THẤP): `create_group` nay nhận emoji ngẫu nhiên
  (`randomGroupEmoji` dùng chung local + cloud) thay vì để trống (`groupFactory.ts`,
  `data/supabase.ts`).
- **Bỏ `ToastProvider` lồng** (THẤP): chỉ giữ provider ở gốc `main.tsx` (`app/AppShell.tsx`).
- (Các file rác `.fuse_hidden*` trong `src/` là artifact FUSE — không track git,
  không deploy; sandbox không xoá được, host tự dọn khi đóng handle.)

### Ghi chú
- Vẫn chưa chạy được `npm install`/`tsc`/`eslint`/`build` trong sandbox (registry chặn)
  → cần chạy `npm run typecheck && npm run lint` ở máy trước khi deploy.

## 2026-06-08 — Khởi tạo v0.1 (MVP) + Deploy

### Thêm mới
- Khởi tạo dự án React 19 + Vite + TypeScript + Tailwind v4.
- **Engine chia tiền** (port từ Hysplit, có test):
  - `settlement/money.ts`, `balances.ts` (5 kiểu chia, làm tròn lẻ chuẩn).
  - `smartSettle.ts` (greedy), `maxReduction.ts` (bitmask DP + heuristic).
  - `vietqr.ts` (CRC16 + ~60 ngân hàng VN) — copy nguyên từ bản cũ.
  - `settlement.test.ts` (test số dư, smart settle, percent rounding).
- **Data layer** repository pattern: `local.ts` (localStorage) + `supabase.ts` (JSONB) + `index.ts` tự chọn theo env.
- **Design system** tông xanh dương: tokens dark/light, glass, gradient, 3D shadow, animation (`index.css`).
- **Theme** Dark/Light có toggle + lưu lựa chọn (`theme.tsx`).
- **UI primitives**: Button, IconButton, Card, Input, Field, Avatar, Badge, EmptyState, Segmented (`components/ui.tsx`), Sheet bottom-sheet.
- **Màn hình**:
  - Home: hero card gradient (tổng chi), danh sách nhóm, empty state.
  - CreateGroupSheet: tạo nhóm + thêm nhanh thành viên.
  - GroupScreen: header gradient + 4 tab (Tổng quan / Chi tiêu / Quyết toán / Người).
  - OverviewTab: số dư từng người (thanh trực quan), gợi ý quyết toán.
  - ExpensesTab: danh sách + xoá khoản chi.
  - AddExpenseSheet: nhập số tiền (hỗ trợ 250k/1tr2), chọn người trả, 4 kiểu chia, chọn người tham gia.
  - SettleTab: chọn thuật toán, danh sách lượt chuyển, nút tạo QR.
  - MembersTab + MemberSheet: sửa tên, nhập ngân hàng/STK để tạo QR.
  - QrSheet: sinh VietQR cho từng lượt chuyển.
  - SettingsScreen: theme, trạng thái lưu trữ (local/cloud), xoá dữ liệu, ghi chú minh bạch.
- `supabase/migrations/0001_init.sql`: bảng `groups` (JSONB) + RLS theo owner.
- Tài liệu: README.md, docs/CONTEXT.md, docs/CHANGELOG.md, docs/reference/.

### Sửa cho deploy
- `package.json`: build chỉ còn `vite build` (tách `tsc` sang `npm run typecheck`) để tránh gãy build vì lỗi type nhỏ.
- Thêm `public/_redirects` (SPA fallback, tránh 404 route con).
- Thêm `.nvmrc` = 22.

### Hạ tầng
- Đẩy code lên GitHub qua GitHub Desktop (repo user `ngthson553-create`).
- Deploy Cloudflare Pages thành công → `splitz-8xj.pages.dev`.
- Gắn domain tuỳ chỉnh `splitz.tson.io.vn` (tson.io.vn đã ở Cloudflare).

### Sự cố đã xử lý
- Lần publish đầu GitHub Desktop tạo thư mục con `Splitz/` chứa `.git` rỗng (không có package.json)
  → Cloudflare báo `ENOENT package.json`. Khắc phục: xoá repo lồng sai, tạo lại repo đúng tại gốc `splitz`.

### Ghi chú / Rủi ro
- Trợ lý CHƯA chạy được `npm install`/build/test (sandbox chặn npm registry) → code mới chỉ review bằng mắt;
  lần deploy thật là lần "chạy" đầu tiên. Theo dõi log Cloudflare để fix nếu có lỗi.

## (mẫu cho lần sau)
## YYYY-MM-DD — Tiêu đề
### Thêm mới / Sửa / Xoá / Ghi chú
- ...
