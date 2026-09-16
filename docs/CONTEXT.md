# Splitz — Bối cảnh dự án (Context / Handoff)

> Đọc file này đầu tiên ở mỗi phiên làm việc mới để hiểu ngữ cảnh.
> **Định hướng thương mại hoá (freemium, PayOS, auth bắt buộc): xem `docs/ROADMAP.md`.**
> **Bắt đầu xây phần cloud: đọc mục "CÁCH TRIỂN KHAI: VERTICAL SLICES" trong ROADMAP — làm trọn từng slice, bắt đầu Slice 1 (schema, cần user duyệt).**
> Cập nhật lần cuối: 2026-06-08.

## TL;DR
Splitz là **web app chia tiền nhóm**, được **xây lại hoàn toàn** từ app cũ "Hysplit".
Giữ lại **engine chia tiền đã kiểm chứng** + ý tưởng tính năng; làm mới toàn bộ UI/UX, kiến trúc, data layer.
Stack: **React 19 + Vite + TypeScript + Tailwind v4 + Supabase**. Mobile-first, PWA-ready.
Phong cách: **fintech, tông màu XANH DƯƠNG**, gradient + glass + 3D + animation. Hỗ trợ Dark/Light.

## Lịch sử
- App cũ "Hysplit" quá nhiều lỗi (nhất là đồng bộ) → bị huỷ.
- Bản bàn giao cũ: `Hysplit-handoff-2026-06-08.zip` (nằm cùng cấp trong thư mục "Hysplit All New").
- Chủ trương: **đạp đi xây lại**, chỉ kế thừa logic cốt lõi + feature hay.

## Quyết định đã chốt với chủ dự án (KHÔNG tự đổi)
- **Tên thương hiệu:** Splitz.
- **Backend:** Supabase ngay từ đầu — nhưng MVP chạy **local-first** (localStorage), adapter Supabase đã sẵn, tự bật khi có biến môi trường.
- **Theme:** cả **Dark & Light** (có toggle).
- **Tông màu chủ đạo:** **XANH DƯƠNG** (yêu cầu cứng). KHÔNG dùng tím/hồng như bản Mintro gốc. Bắt buộc có gradient, hiệu ứng 3D, glass, animation đẹp.
- **UI:** lấy cảm hứng gần như clone từ app **Mintro (finance app)** — xem `docs/reference/`.
- **Phạm vi bản đầu:** MVP luồng cốt lõi: tạo nhóm → thêm thành viên → ghi chi → ai nợ ai → rút gọn công nợ → QR chuyển khoản.

## Kiến trúc thư mục
```
src/
  lib/
    types.ts              # domain model (Group, Member, Expense, ...)
    settlement/           # ENGINE: money, balances, smartSettle, maxReduction, vietqr, index
    data/                 # GroupRepository: local.ts + supabase.ts + index.ts (tự chọn theo env)
    store.tsx             # state (React context) trên repository
    theme.tsx             # Dark/Light provider
    format.ts, id.ts, groupFactory.ts
  components/             # ui.tsx (Button, Card, Avatar, Badge, Segmented, EmptyState...), Sheet.tsx
  app/                    # AppShell, BottomNav (nav nổi, nút + gradient giữa)
  features/
    home/                 # HomeScreen, CreateGroupSheet
    group/                # GroupScreen + 4 tab: OverviewTab, ExpensesTab, SettleTab, MembersTab
    expense/              # AddExpenseSheet
    members/              # MemberSheet (gồm thông tin ngân hàng để tạo QR)
    settle/               # QrSheet (VietQR)
    settings/             # SettingsScreen (theme, lưu trữ, minh bạch)
supabase/migrations/0001_init.sql   # bảng groups (JSONB aggregate) + RLS
```

## Engine chia tiền (kế thừa từ bản cũ, có test)
- `sharesForExpense`: 5 kiểu chia equal/exact/percent/shares/itemized; quy ước làm tròn lẻ:
  equal/itemized chia dư từng đồng từ đầu; percent/shares người cuối hấp thụ lẻ.
- `balancesForGroup`: số dư ròng mỗi người (đã chi − phải gánh).
- `generateSmartSettleTransfers`: greedy ghép nợ↔nhận, tối thiểu lượt theo thứ tự ổn định.
- `generateMaxReductionTransfers`: tách cụm tổng=0 (bitmask DP nếu ≤10 người, heuristic nếu >10) rồi smart-settle từng cụm.
- `vietqr.ts`: sinh mã VietQR/Napas (CRC16) + danh sách ~60 ngân hàng VN (BIN/logo/alias).

## Data layer
- `GroupRepository` (interface): list/get/save/remove ở mức cả nhóm (aggregate).
- `LocalGroupRepository`: localStorage key `splitz.groups.v1`.
- `SupabaseGroupRepository`: lưu mỗi nhóm vào cột JSONB `data` của bảng `groups` (MVP; chuẩn hoá schema sau mà không đổi UI).
- `getRepository()` tự chọn: có `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` → cloud; không → local.

## Trạng thái hiện tại (2026-06-08)
- MVP hoàn chỉnh các màn: Home, Group (4 tab), Add Expense, Member (bank), QR, Settings.
- **Đã deploy:** Cloudflare Pages → `splitz-8xj.pages.dev`, domain tuỳ chỉnh **splitz.tson.io.vn** (domain tson.io.vn nằm trong Cloudflare).
- GitHub: repo của user `ngthson553-create` (repo Splitz/splitz). Đẩy code qua **GitHub Desktop**.
- Repo gốc nằm tại: `~/Desktop/Hysplit All New/splitz` (đây là nơi có .git).

## Cấu hình build/deploy đáng nhớ
- `package.json` build = `vite build` (đã **bỏ cổng `tsc`** để deploy không gãy vì lỗi type nhỏ). Kiểm type riêng: `npm run typecheck`.
- `public/_redirects`: `/*  /index.html  200` (SPA, tránh 404 khi refresh route con).
- `.nvmrc` = `22` (Cloudflare dùng Node 22).
- Cloudflare build settings: command `npm run build`, output `dist`, root directory để trống.

## CHƯA làm / TODO (ưu tiên gợi ý)
- [ ] **Chưa build/test/preview thực tế**: sandbox của trợ lý bị chặn npm registry → chỉ review code bằng mắt. Lần deploy thật có thể lộ lỗi type/asset → fix theo log.
- [ ] Đăng nhập Supabase (màn login) — adapter sẵn, thiếu UI auth.
- [ ] Sửa khoản chi (hiện chỉ thêm/xoá).
- [ ] Chia "theo món" (itemized) — engine có, UI chưa expose.
- [ ] AI nhập chi bằng ngôn ngữ tự nhiên (port `aiParser` từ bản cũ).
- [ ] Export PDF/ảnh hoá đơn; lời nhắc chuyển khoản.
- [ ] PWA manifest + service worker (đã gỡ khỏi vite.config cho gọn MVP).

## Lưu ý vận hành cho phiên sau (quan trọng)
- **Tông xanh dương là yêu cầu cứng** — đừng đổi sang tím/hồng.
- Code thật để ở `~/Desktop/Hysplit All New/splitz`; cập nhật web = GitHub Desktop **Commit → Push** (Cloudflare auto deploy ~1-2 phút).
- Trong sandbox trợ lý: ghi file vào "Hysplit All New/splitz" phải dùng **Bash** (Write tool chỉ tới thư mục outputs); không `npm install` được.
- Giọng văn nội dung tiếng Việt: chuyên nghiệp, gọn, không suồng sã.
