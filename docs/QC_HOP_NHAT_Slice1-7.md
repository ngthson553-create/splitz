# Splitz — Báo cáo QC HỢP NHẤT (Slice 1→7)

> Ngày: 2026-06-09. Hợp nhất 2 nguồn:
> - **Audit A (Claude/phiên này)**: review tĩnh toàn bộ source + docs + migrations, chạy `typecheck`/`lint` (sandbox Linux không build/chạy app được vì node_modules là macOS-native).
> - **Audit B (bên thứ 3)**: chạy thật trên máy user — `build` + Playwright (mobile/desktop) + probe route + `supabase db lint`. Evidence ảnh + JSON trong `test-results/`.
> - Đã **đối chiếu chéo**: mỗi mục ghi rõ đồng thuận / mâu thuẫn / bổ sung, kèm mức tin cậy (evidence-level vs code-review-level).

---

## 0. Kết luận nhanh

- **Verdict: CHƯA sẵn sàng release.** 2 blocker tương tác (P0) chặn đúng các flow user đang than: nút **+** và **tạo nhóm/tham gia**.
- **Nguyên nhân user thấy "bấm + không có gì xảy ra" (bản deploy)**: khớp **C1** (overlay/animation của `Sheet` chặn pointer) + **B1** (sheet re-render churn do poll 20s) — có evidence Playwright. KHÔNG phải do deploy sai bản.
- Nợ chất lượng kèm theo: `lint` (28 errors) + `typecheck` (3 errors) đỏ; Web Push production nhiều khả năng chết do `dist/sw.js` bị Workbox đè.

### Bảng đối chiếu 2 audit

| # | Finding | Audit A (tĩnh) | Audit B (chạy thật) | Phán quyết hợp nhất | Mức tin cậy |
|---|---|---|---|---|---|
| C1 | `Sheet` overlay/animation chặn click | Bỏ sót | **Phát hiện, evidence** | **ĐÚNG — P0** | Evidence (Playwright) |
| C2 | `/join` (không token) 404 thô | Không kiểm | **Phát hiện, probe** | **ĐÚNG — P1** | Evidence (probe JSON) |
| B1 | `QuickAddExpense` reset do `useEffect([open, groups])` + poll 20s | **Phát hiện** | Gộp vào C1 | **ĐÚNG — P0**, bổ sung C1 | Code-review |
| M1 | Join chỉ hiện ở cloud + fail-closed local | Phát hiện | Phát hiện | **ĐÚNG — P1 (UX)** | Cả hai |
| M2 | lint/typecheck fail | 27 (sót 1) | **28** | **ĐÚNG — P1**; số đúng = 28 | Evidence |
| M3 | Web Push: `dist/sw.js` Workbox đè `public/sw.js` | Không kiểm | **Phát hiện** | **ĐÚNG — P1** (verify lại: dist/sw.js không có handler push) | Evidence |
| M4 | Cloud (Supabase/PayOS/Storage) chưa verify runtime | Nêu | Nêu | **ĐÚNG — rủi ro tồn đọng** | Cả hai |

---

## 1. P0 — Blocker tương tác (sửa trước tiên)

### C1 + B1 — `Sheet` chặn/"nuốt" click

**Hiện tượng:** bấm `+`, `Tạo nhóm đầu tiên`, `Thêm thành viên`, `Tạo nhóm`, hoặc nút trong modal → "không ăn".

**Evidence (Audit B):** `test-results/qc-slice7/qc_slice1_7_join_plus_result.json`
- Lặp lại: `<div aria-hidden="true" class="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"> ... subtree intercepts pointer events` và `element is not stable`.
- Có frame nút "Lưu khoản chi" của một ExpenseSheet chặn click nút `+` → **2 lớp `fixed inset-0 z-50` chồng nhau**.

**Root cause (hợp nhất):**
1. Backdrop của `Sheet` (`src/components/Sheet.tsx:38-61`) `fixed inset-0 z-50` + `motion.div` backdrop. Lúc enter/exit (spring + drag layer) hit-test rơi vào backdrop/transition frame → click bị nuốt.
2. **Re-render churn (B1):** `QuickAddExpense.tsx:24` `useEffect(..., [open, groups])`; store poll 20s tạo mảng `groups` mới → effect chạy lại → `setPicked(...)` → `ExpenseSheet` remount → animation không "stable". Khớp `element is not stable` của Playwright; là lý do hợp lý nhất cho "bấm + không có gì xảy ra" trên deploy.
3. Nhiều `Sheet` cùng mounted trong `AppShell` (`CreateGroupSheet` + `QuickAddExpense`→`ExpenseSheet`); khi một cái exit (~0.22s) chồng cái khác → backdrop trên cùng chặn click bên dưới.

**File:** `src/components/Sheet.tsx`, `src/features/expense/QuickAddExpense.tsx`, `src/app/AppShell.tsx`, `src/features/home/CreateGroupSheet.tsx`, `src/features/expense/ExpenseSheet.tsx`.

**Hướng sửa:**
- B1 (nhanh, rủi ro thấp nhất): `QuickAddExpense` bỏ `groups` khỏi deps / chỉ chạy khi `open` chuyển false→true (ref `prevOpen`) hoặc tính `picked` bằng `useMemo`. Cắt churn.
- C1: đảm bảo chỉ một Sheet mở tại một thời điểm (đóng cũ trước khi mở mới); củng cố `pointer-events`/z-index cho panel; xem lại `drag="y"` (drag layer dễ lệch hit-test).
- Re-run Playwright (script sẵn) → 0 warn "Normal click blocked".

---

## 2. P1 — Cần sửa trước public

### C2 — Route `/join` (không token) 404 thô
- Evidence: `test-results/qc-slice7/direct_join_probe.json` → `/join` = "Unexpected Application Error! 404 Not Found"; `/join/INVALID` fallback đẹp.
- Nguyên nhân: `src/main.tsx` chỉ có `/join/:token`.
- Sửa: thêm route `/join` (tái dùng `JoinByCodeSheet`) hoặc redirect `/groups` mở sẵn sheet tham gia; bọc `errorElement` cho router để không lộ 404 thô.

### M1 — Join fail-closed ở local + nút ẩn
- Nút "Tham gia" chỉ ở **/groups** và **chỉ cloud** (`GroupsScreen.tsx`); local `getSupabase()` throw; Home không có lối tham gia.
- Bối cảnh: repo **không có `.env.local`** → máy chạy local mode. Nhưng user báo lỗi ở **deploy (cloud)** → trên cloud nút CÓ hiện ⇒ bug "+" của user thuộc C1/B1, không phải M1. Vẫn nên xử lý M1 cho demo/local.
- Sửa: thông điệp rõ khi local; cân nhắc đưa "Tham gia" lên Home.

### M2 — lint (28) + typecheck (3) đỏ
- typecheck: `GroupScreen.tsx:7` (import `formatVnd` thừa), `webpush.ts:31` (kiểu Uint8Array vs applicationServerKey), `vite.config.ts:44` (`test` không hợp lệ — cần reference vitest/config hoặc tách `vitest.config.ts`).
- lint: 28 errors, 2 warnings. Gồm `PlanSheet.tsx:30`, `attachments.ts:104` (no-useless-assignment), `payos-webhook/index.ts:50` (`_e` thừa), cụm react-hooks strict: `subscription.tsx:88` (set-state-in-effect), `:94` (Date.now purity), react-refresh exports `theme.tsx`/`subscription.tsx`.
- Đối chiếu: A đếm 27 (sót `PlanSheet.tsx:30`); B đếm 28 → **B đúng**.

### M3 — Web Push production có thể chết
- Verify lại: `public/sw.js` có `push`+`notificationclick`; nhưng `vite-plugin-pwa` generateSW → `dist/sw.js` là Workbox precache, KHÔNG có handler push (grep xác nhận). `webpush.ts:27` register `/sw.js` → deploy nạp file Workbox, mất push.
- Sửa: chuyển `strategies: 'injectManifest'` trỏ `public/sw.js` (+ `precacheAndRoute(self.__WB_MANIFEST)`), hoặc `importScripts` gộp handler push. Test push thật sau sửa.

---

## 3. P2 — Theo dõi / chưa chặn release
- M4 — Cloud chưa verify runtime: RPC/RLS/Storage, PayOS webhook, push thật mới ở mức code-review. Cần vòng test Supabase + PayOS sandbox thật, realtime 2 thiết bị (chỗ Hysplit cũ chết).
- Build warning chunk >500KB: chưa blocker.
- Đa tiền tệ chỉ áp ở TẠO MỚI (sửa trên VND) — giới hạn có chủ đích, không phải lỗi.

---

## 4. LỘ TRÌNH SỬA

> P0 (mở khoá tương tác) → verify Playwright → dọn gate (P1) → vòng cloud thật (P2).

### Bước 1 — P0 tương tác (1 PR nhỏ, giá trị cao nhất)
1. B1: `QuickAddExpense` bỏ churn (`useMemo`/`prevOpen`).
2. C1: chỉ một Sheet mở cùng lúc; củng cố pointer/z-index panel; xem lại `drag="y"`.
3. Re-run Playwright → 0 warn "click blocked". (Trả lời trực tiếp than phiền user.)

### Bước 2 — P1 routing + gate
4. Thêm `/join` + `errorElement` (C2).
5. Làm rõ lối "Tham gia" local vs cloud (M1).
6. Dọn typecheck (3) + lint (28) về xanh (M2).

### Bước 3 — P1 hạ tầng push
7. Sửa service worker strategy (M3) + test push thật.

### Bước 4 — P2 vòng cloud thật
8. Áp migrations lên Supabase thật; test auth/onboarding/mời/khoản chi realtime 2 thiết bị; PayOS sandbox; Storage upload (M4).
9. Build + deploy + smoke lại trên splitz.tson.io.vn.

---

## 5. Ghi chú minh bạch
- Sandbox trợ lý (Audit A) không build/chạy app được (node_modules macOS trên Linux) → khẳng định runtime dựa evidence Audit B + đọc code. Trước khi đóng mỗi mục nên chạy lại Playwright + build ở máy.
- Claim bảo mật (RLS/atomic/timing-safe) ở mức code-review tới khi có vòng cloud thật (M4).
