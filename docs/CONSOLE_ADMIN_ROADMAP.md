# Splitz Console Admin Roadmap

> File roadmap RIENG cho trang van hanh an cua Splitz. Khong thay the, khong tron voi `docs/ROADMAP.md`.
> Route du kien: `/console`. Khong dua vao navigation, sitemap, settings, public copy, hay bat ky UI nao danh cho user thong thuong.

Cap nhat lan cuoi: 2026-06-11
Trang thai: Phase 21 da xong Multi-admin Role Management UI va da deploy Supabase Edge Function `admin-access`. Hotfix 2026-06-11 da sua health check/redeem generator loi `gen_random_bytes(integer) does not exist`, Supabase remote up to date.

## Quy Tac Bat Buoc Truoc Moi Phase

Truoc khi lam BAT KY phase nao cua Console Admin, bat buoc doc lai cac file sau:

1. `docs/CONTEXT.md`
2. `docs/CONSOLE_ADMIN_ROADMAP.md`
3. Neu phase cham Supabase: doc them `supabase/migrations/` lien quan va `supabase/config.toml`
4. Neu phase cham UI: doc them component/pattern dang co trong `src/components`, `src/app`, va module feature lien quan

Khong duoc bat dau phase neu chua xac nhan lai:

- Repo dung: `~/Desktop/Hysplit All New/splitz`
- GitHub dung: `ngthson553-create/splitz`
- Route admin dung: `/console`
- Console phai an voi user thong thuong, nhung bao mat that phai nam o DB/RPC/Edge Function
- Khong commit artifact test/screenshot vao repo neu khong duoc yeu cau

Sau moi phase phai cap nhat file nay hoac ghi ro trong handoff:

- Phase nao da xong
- File nao da thay doi
- Lenh verify da chay
- Supabase migration nao da tao/day
- Rui ro con lai

## Muc Tieu San Pham

Xay mot khu dieu hanh noi bo cho nguoi van hanh Splitz, dua cac cau hinh va tac vu phuc tap ra giao dien truc quan, sang, chuyen nghiep, de thao tac.

MVP Console phai uu tien:

- Quan ly redeem code Premium theo ngay/thang
- Gui thong bao he thong bang in-app va web push
- Co dashboard suc khoe he thong
- Co audit log cho moi thao tac admin
- Co nen kien truc cho nhieu admin sau nay, nhung ban dau chi mo cho chu du an

## Nguyen Tac Thiet Ke

- Giao dien mau sang, gan phong cach Splitz hien tai, nhung nghiem tuc hon nhu dashboard van hanh.
- Khong show tat ca tren mot man hinh.
- Phan nhom theo nghiep vu, co tab/layer/drawer ro rang.
- Cac tac vu nguy hiem phai co preview va confirm.
- Khong luu hoac render secret/API key/service role key o frontend.
- Frontend admin chi goi RPC/Edge Function co kiem quyen.
- Moi action quan trong phai co audit log.
- User thong thuong khong de tinh co phat hien console: khong link, khong menu, khong sitemap, khong wording public.
- Neu user thuong vao `/console`, redirect ve home; khong noi ro "ban khong phai admin".

## Quyet Dinh Da Chot

- Admin ban dau: chi chu du an.
- Email Supabase Auth de seed admin dau tien: `<owner-email>`.
- Admin seed dung email nay de tim `profiles.id`; quyen thuc te luu bang `user_id` trong `admin_users`, khong hardcode email trong frontend.
- Kien truc: de san multi-admin ve sau.
- Route: `/console`.
- User thuong vao `/console`: redirect ve home.
- Kenh notification MVP: in-app va web push.
- In-app system notification phai hien trong tab `He thong` cua man `/notifications` hien co.
- Web push production: user xac nhan da co VAPID/Edge Function day du; van can health check truoc khi gui dien rong.
- Resend production: user xac nhan da co `RESEND_API_KEY`/sender domain van hanh, mail ma xac thuc dang gui binh thuong.
- PayOS production: user xac nhan webhook/config on dinh, thanh toan dang hoat dong.
- Redeem benefit MVP: Premium theo ngay/thang.
- PayOS/subscription admin: khong phai blocker Phase 1; dua vao Billing/Premium console sau, dashboard health co the doc trang thai som.
- Plan/limit config: dua vao admin som trong Phase 10, khong giu hardcode lau khi premium da on dinh.
- User/Group Support: bat dau read-only 360 truoc; action nho nhu refresh profile chi them sau khi co rule, confirm va audit.
- Theme console: light, gan Splitz, chuyen nghiep.

## Danh Muc Module Chinh

Console khong show tat ca tren mot man hinh. Moi module co overview rieng, sau do moi drill-down vao list/detail/drawer/action.

### 1. Dashboard Van Hanh / System Health

Muc tieu: mo console la biet he thong dang on hay dang loi.

Noi dung can co:

- Supabase/Auth status.
- Edge Functions status.
- Resend status.
- AI provider status.
- PayOS/webhook status.
- Cron/job gan nhat.
- Loi gan day.
- So user, so nhom, so redeem, AI usage theo thang.
- Push subscription health.

Nguyen tac: chi hien `configured`, `missing`, `ok`, `failed`, `last_success`, `last_error`; khong show secret.

### 2. Thong Bao He Thong

Muc tieu: gui in-app/web push/email sau nay mot cach co kiem soat.

Noi dung can co:

- Gui ngay.
- Len lich.
- Dat lap lai.
- Target: all users, premium, free, user cu the, nhom cu the, nguoi no, chu no.
- Preview push/in-app/email neu co.
- Notification templates: bao tri, update tinh nang, nhac gia han, khuyen mai, loi he thong, moi dung AI.
- Segmentation: da het han, chua tao nhom, co no chua thanh toan, dung AI nhieu, chua cau hinh ngan hang.
- Delivery status, retry, cancel, pause/resume recurring, delivery log.
- Approval mode 2 buoc khi target rong nhu all users.

### 3. Redeem Code

Muc tieu: quan ly code Premium ma khong thao tac raw SQL trong UI.

Noi dung can co:

- Tao code don le.
- Tao batch/campaign.
- Prefix campaign.
- Set plan/quyen loi, so ngay/thang, expire, max uses.
- Gioi han theo user neu can.
- Lookup/check code.
- Revoke code/campaign.
- Redemption history.
- Thong ke dung code.
- Phat hien bat thuong: used_count lech, dung qua nhanh, code sap het han.

### 4. AI Operations / AI Config

Muc tieu: dieu hanh AI mot cach co guardrail, khong dua key len frontend.

Noi dung can co:

- Bat/tat tung AI feature: nhap chi tu nhien, OCR, insight.
- Chon provider/model bang danh sach goi y, co custom model neu can.
- Quota free/premium theo feature.
- Prompt/template co versioning.
- Test parser/OCR/insight.
- Xem `ai_usage` theo feature/user/thang.
- Reset quota co audit va confirm.
- Xem loi AI gan day, fallback provider.

### 5. Email / Resend

Muc tieu: quan ly va kiem tra kenh email van hanh.

Noi dung can co:

- Kiem tra Resend config.
- Gui test email.
- Xem template.
- Quan ly sender/domain status neu co API ho tro.
- Trang thai reminder email.
- Delivery/log loi gan day, bounce co ban neu co du lieu.

### 6. Billing / Premium

Muc tieu: theo doi subscription va thanh toan, ho tro debug PayOS/redeem.

Noi dung can co:

- Subscription list/detail.
- Payment orders.
- PayOS status/webhook health.
- Goi dang kich hoat, period_end, source.
- Loi webhook/retry can thiet.
- Kiem tra premium cua user.
- Gia han/manual grant chi qua admin RPC co audit, khong update DB truc tiep tu UI.

### 7. User / Group Support 360

Muc tieu: ho tro user an toan, uu tien read-only truoc.

Noi dung can co:

- Tra user theo email/id.
- Xem profile, groups, members, subscription, redemption history, AI usage, payment orders, push subscriptions.
- Xem quyen/role trong group.
- Refresh profile/kiem tra sync neu can.
- Khoa/mo tinh nang theo rule ro rang ve sau.
- Khong sua du lieu tai chinh truc tiep neu chua co rule va audit rieng.

### 8. System Config / Feature Flags / Limits

Muc tieu: dua config van hanh ra DB/RPC, khong hardcode trong frontend.

Noi dung can co:

- Feature flags/kill switch: AI parse, OCR, insight, debt reminder, redeem, payment, Zalo login.
- Maintenance mode/banner toan app co start/end.
- Plan & limit config: so nhom, so thanh vien, quota AI, OCR, debt reminder cooldown, thoi han redeem.
- App config va legal/payment disclaimer.
- Approval mode cho doi quota toan app, maintenance, revoke hang loat, all-user push.

### 9. Audit Log

Muc tieu: lich su bat buoc cho moi thao tac admin.

Noi dung can co:

- Actor, role, action, target, thoi gian.
- Payload tom tat da redact.
- Success/failed/error.
- Filter theo actor/action/status/time.
- Detail drawer.
- Bat buoc co truoc khi mo cac action manh.

### 10. Job Monitor

Muc tieu: theo doi cac job da/sap chay.

Noi dung can co:

- Push hen gio/recurring notification.
- Reminder email.
- Debt reminder.
- Subscription reminder.
- Admin job runs.
- Retry, cancel, pause/resume.

### 11. Release Notes / In-App Announcement

Muc tieu: viet thong bao cap nhat phien ban va day vao app.

Noi dung can co:

- Draft/publish release notes.
- Gan voi notification campaign.
- Luu lich su da publish.

### 12. Data Quality / Cleanup Tools

Muc tieu: phat hien bat thuong truoc khi user bao loi.

Noi dung can co:

- Group khong owner.
- Expense thieu payer/participant.
- Subscription het han nhung premium van active.
- Payment order pending qua lau.
- Redeem `used_count` lech voi `redemption_uses`.
- Push subscription invalid rate cao.
- Cleanup action chi lam sau khi co rule, preview, confirm va audit.

## Kien Truc Route De Xuat

```text
/console
/console/health
/console/notifications
/console/redeem
/console/ai
/console/email
/console/billing
/console/support
/console/config
/console/jobs
/console/releases
/console/data-quality
/console/audit
```

Khong them cac route tren vao:

```text
BottomNav
Home dashboard cua user
Settings cua user
Public docs/copy
Sitemap/SEO metadata
```

## Kien Truc Bao Mat

### Admin role

Bang de xuat:

```sql
admin_users
- user_id uuid primary key references public.profiles(id)
- role text not null check (role in ('owner', 'operator', 'support', 'readonly'))
- status text not null check (status in ('active', 'disabled'))
- created_at timestamptz not null default now()
- created_by uuid references public.profiles(id)
```

Ban dau chi seed user chu du an voi:

```text
role = owner
status = active
```

### Guard

Console guard phai gom 2 lop:

1. UI guard: khong render console neu user khong phai admin; redirect ve home.
2. Backend guard: moi RPC/Edge Function admin phai tu kiem admin role tu Supabase Auth.

Khong chap nhan bao mat chi bang frontend flag/localStorage/hardcoded email.

Co che phan biet admin/user thuong:

1. User dang nhap qua Supabase Auth.
2. Client goi RPC/Edge Function `admin-me` hoac `my_admin_role` bang JWT cua session hien tai.
3. Server lay `auth.uid()`/JWT user id va tim trong `admin_users`.
4. Neu co row `status = active` va role hop le thi tra role de UI render console.
5. Neu khong co row active thi frontend redirect ve home; moi admin action server-side cung se tu reject.

Email `<owner-email>` chi dung de seed row dau tien sau khi profile da ton tai. Sau seed, khoa phan quyen la `user_id`, nen user thuong khong the thanh admin chi bang cach biet route `/console`.

## Audit Log

Lam truoc cac action manh.

Bang de xuat:

```sql
admin_audit_logs
- id uuid primary key default gen_random_uuid()
- actor_user_id uuid references public.profiles(id)
- actor_role text
- action text not null
- target_type text
- target_id text
- payload_summary jsonb
- status text not null check (status in ('success', 'failed'))
- error_message text
- created_at timestamptz not null default now()
```

Bat buoc ghi audit cho:

- Tao/revoke redeem code
- Tao/revoke campaign redeem
- Gui notification ngay
- Len lich/huy lich notification
- Chay health check admin
- Test AI endpoint/config
- Doi feature flag/kill switch ve sau

Payload audit khong duoc chua secret, token, API key, raw credential.

## Backend Can Co / Chuan Hoa

Truoc khi build UI day du, phai audit schema/RPC hien co va uu tien dung lai bang san co. Khong tao trung neu da co.

Bang/RPC hien co uu tien dung lai:

- `profiles`
- `subscriptions`
- `payment_orders`
- `redemption_codes`
- `redemption_uses`
- `push_subscriptions`
- `ai_usage`
- `debt_reminders`
- PayOS Edge Functions hien co
- AI Edge Functions hien co

Bang/RPC du kien can them hoac chuan hoa:

- `admin_users`
- `admin_roles` hoac role enum trong `admin_users` neu MVP chua can bang rieng
- `admin_audit_logs`
- `system_notifications`
- `notification_jobs`
- `notification_deliveries`
- `notification_templates`
- `app_config`
- `feature_flags`
- `maintenance_banners`
- `redeem_code_batches`
- `admin_job_runs`
- `email_delivery_logs` neu can log Resend rieng
- `ai_prompt_versions` neu prompt/template duoc sua tu console
- `admin_user_notes` neu can ghi chu noi bo cho user/code/campaign

Backend guard bat buoc:

- Tat ca admin RPC/Edge Function phai lay actor tu Supabase Auth JWT.
- Tat ca admin RPC/Edge Function phai check `admin_users` server-side.
- Tat ca admin write action phai ghi `admin_audit_logs`.
- Config nhay cam chi luu secret trong Supabase secrets/env/provider secret store, khong luu raw key trong frontend hay public table.
- Config van hanh khong secret co the luu DB qua `app_config`/`feature_flags`, doc/ghi qua RPC co guard.

## Phase 0: Audit Nen Hien Co

Muc tieu: map dung schema va service hien co, tranh tao trung bang/RPC.

Can doc/kiem:

- `profiles`
- `subscriptions`
- `payment_orders`
- `redemption_codes`
- `redemption_uses`
- `push_subscriptions`
- `ai_usage`
- Supabase Edge Functions hien co
- RLS/policies lien quan redeem, subscription, push, AI

Deliverable:

- Danh sach bang dung lai
- Danh sach migration can them
- Danh sach RPC/Edge Function can tao
- Rui ro bao mat truoc khi implement UI

### Ket Qua Audit Phase 0 - 2026-06-10

Pham vi da doc:

- `docs/CONTEXT.md`
- `docs/CONSOLE_ADMIN_ROADMAP.md`
- `src/main.tsx`, `src/app/AppShell.tsx`, `src/features/auth/AuthGate.tsx`, `src/lib/auth.tsx`
- `src/lib/notifications.tsx`, `src/features/notifications/NotificationsScreen.tsx`
- `src/lib/webpush.ts`, `public/push-sw.js`, `vite.config.ts`
- `src/lib/subscription.tsx`, `src/lib/data/billing.ts`, `src/features/settings/PlanSheet.tsx`
- `supabase/config.toml`
- `supabase/migrations/0002_normalized_schema.sql`, `0004_rls.sql`, `0012_premium_limits.sql`, `0013_billing.sql`, `0014_reminders.sql`, `0015_premium_hardening.sql`, `0018_debt_reminders.sql`, `0019_ai_usage.sql`
- Edge Functions: `payos-create`, `payos-webhook`, `send-reminders`, `remind-debt`, `parse-expense`, `ocr-receipt`, `insight`, `_shared/ai.ts`, `_shared/cors.ts`

Ket luan tong quan:

- Chua co route `/console`, chua co concept admin trong app/schema/RLS.
- Console phai la top-level route rieng, nam ngoai `AppShell` de khong hien `DesktopNav`, `BottomNav`, `InstallPrompt`, `UpgradePrompt`, `QuickAddExpense`.
- `AuthGate` hien co bo qua auth khi chay local/demo, nen console can guard rieng: local/demo khong duoc mo tac vu admin that.
- User thuong vao truc tiep `/console` se redirect ve home, khong hien thong diep kieu "khong phai admin".

Bang co the dung lai:

- `profiles`: nguon identity de seed admin dau tien va hien actor trong audit.
- `subscriptions`: nguon su that cho Premium (`plan`, `status`, `period_end`, `source`, `team_id`).
- `payment_orders`: dung sau cho PayOS/payment monitor va health dashboard.
- `redemption_codes`: co san `code`, `plan`, `duration_days`, `max_uses`, `used_count`, `expires_at`, `created_by`, `created_at`; dung lai cho redeem MVP.
- `redemption_uses`: lich su user da dung code, co unique `(code, used_by)`; dung lai cho lookup/history.
- `push_subscriptions`: co san endpoint/key theo user, RLS self-select/insert/delete; dung cho web push admin.
- `ai_usage`: dung cho AI usage summary, nhung can xu ly rui ro migration duplicate ben duoi.
- `activity_log`: chi la log trong group, khong dung thay `admin_audit_logs` vi scope/actor/action khac.
- `debt_reminders`: chi phu hop nhac no, khong dung thay notification delivery log.

RPC/function co the dung lai:

- `my_plan_info()`: user-facing plan summary, dung tham khao UI nhung khong du cho admin analytics.
- `grant_subscription(p_uid, p_plan, p_days, p_source)`: service-role-only, co the dung trong admin Edge Function de cap Premium thu cong/redeem sau khi da guard admin.
- `redeem_code(p_code)`: user-facing redeem da co race guard co ban va cap subscription; can extend them check revoked/status/campaign neu them campaign.
- `effective_plan(uid)`: dung noi bo/service role de tinh free/premium; execute cua authenticated da bi thu hep o `0015_premium_hardening.sql`.
- `bump_ai_usage(...)`: service-role-only, dung cho AI function; admin AI test nen co function rieng neu khong muon tru quota user.

Edge Function co the dung lai/tham khao:

- `send-reminders`: cron/service-role endpoint gui email Resend + web push cho subscription sap het han. Khong nen goi truc tiep tu console vi `verify_jwt=false` va chi chap nhan service role bearer.
- `remind-debt`: co pattern gui web push, cleanup endpoint 404/410, CORS, JWT user auth. Co the tach helper/pattern cho notification admin.
- `parse-expense`, `ocr-receipt`, `insight`: co pattern check AI configured, quota, provider fallback. Admin panel co the tao endpoint test rieng de khong tieu quota va de sanitize output.
- `payos-create`, `payos-webhook`: co nen tang PayOS, de Phase 8+ monitor.

Migration can them truoc/kem Phase 1-4:

- SQL hygiene truoc khi them migration admin: `0019_ai_usage.sql` dang `create table public.ai_usage` lai trong khi `0002_normalized_schema.sql` da tao `ai_usage`. Can kiem tra remote state va sua duong migration/reset truoc khi `db push --dry-run` hoac reset moi.
- `0020_admin_console_foundation.sql`:
  - `admin_users`
  - RPC/helper `my_admin_role()` va `is_console_admin(uid)`
  - RLS: khong cho user thuong list admin; UI chi biet current user co phai admin hay khong.
  - Seed admin dau tien tu email `<owner-email>` khi profile da ton tai.
  - Luu y: `admin_audit_logs` va helper audit de Phase 2, khong tron vao Phase 1 de giu pham vi ro.
- `0021_admin_audit_log_foundation.sql`:
  - `admin_audit_logs`
  - `assert_console_admin()` helper dung chung cho RPC/Edge Function sau nay.
  - `admin_write_audit_log(...)` ghi success/failed va redact payload co ban.
  - `admin_list_audit_logs(...)` cho UI `/console/audit` doc log qua admin guard.
- `0022_admin_redeem.sql`:
  - Them `status`/`revoked_at`/`revoked_by` vao `redemption_codes` hoac tao bang `redemption_campaigns` + metadata code.
  - Them `campaign_id`, `internal_note`, `created_by_admin`, `batch_id` neu can batch/campaign.
  - Update `redeem_code()` de chan revoked/disabled campaign.
  - Admin RPC/Edge: create single/batch, lookup, revoke code/campaign, list uses.
- `0023_system_notifications.sql`:
  - `system_notifications` hoac `in_app_notifications`
  - `notification_jobs`
  - `notification_deliveries`
  - `notification_templates`
  - bang/read-state neu can mark-read cross-device, vi `src/lib/notifications.tsx` hien chi localStorage.
  - In-app system notification phai sync vao tab `He thong` cua man `/notifications` hien co.
- `0024_admin_health_jobs.sql`:
  - `admin_job_runs`
  - Edge Function `admin-health` doc snapshot suc khoe he thong, counts, jobs, errors va ghi audit `health_check`
  - Khong show secret, khong mutate du lieu user business
- `0025_admin_config_flags_limits.sql`:
  - `app_config`
  - `feature_flags`/`maintenance_banners`/`kill_switches`
  - plan/limit/quota config neu muon dua Free/Premium limits ra admin thay vi hardcode trong SQL/function
- `0026_admin_email_ai_ops.sql` (co the chia nho khi implement):
  - `email_delivery_logs` neu can tracking Resend rieng
  - `ai_prompt_versions` neu prompt/template duoc sua tu console
  - AI feature config/quota config neu khong dat trong `app_config`
- `0027_admin_support_quality.sql` (de sau MVP):
  - `admin_user_notes`
  - data quality snapshot hoac issue table neu scanner can luu ket qua
  - khong luu secret/API key plaintext trong DB/frontend.

RPC/Edge Function can tao:

- `admin-me` hoac RPC `my_admin_role`: UI guard doc role current user.
- `admin-audit-log`: helper ghi audit success/failed, redact payload.
- `admin-redeem`: create single/batch/lookup/revoke, goi `grant_subscription` khi can manual grant.
- `admin-notifications`: send now, schedule, cancel, retry; target all/free/premium/email; ghi delivery log.
- `admin-health`: check Supabase/Auth/redeem/push/AI/Resend/PayOS status ma khong lo secret.
- `admin-ai-test`: test parse/OCR/insight voi output sanitized, khong tru quota user thuong.
- `admin-email`: test Resend, list template/log, khong lo API key.
- `admin-billing`: lookup subscription/payment orders/webhook health/manual grant co audit.
- `admin-support`: read-only user/group support 360; write action phai tach rieng va co rule.
- `admin-config`: doc/ghi `app_config`, `feature_flags`, limits, maintenance banner qua approval mode.
- `admin-jobs`: list/retry/cancel/pause scheduled jobs.
- `admin-data-quality`: run scanner/read issues, cleanup sau khi co preview + confirm.

Rui ro bao mat/phai chan truoc UI:

- Khong duoc dua admin flag/email hardcoded vao client lam bao mat chinh; route an chi la UX.
- Tat ca write/read nhay cam cua console phai qua RPC/Edge Function co verify JWT + check `admin_users` server-side.
- Khong expose `redemption_codes` full list truc tiep qua client RLS; code la credential.
- Khong de service role key, Resend key, VAPID private key, PayOS key, AI key trong bundle frontend.
- `send-reminders` la endpoint service-role bearer, khong duoc dung nhu endpoint console truc tiep.
- Payload audit/log khong chua secret, raw push key, API key, token, raw credential.
- App notification hien tai la localStorage per-device; neu admin can in-app that su, phai co bang cloud va sync/read-state.
- CORS `_shared/cors.ts` default `*` neu thieu `APP_ORIGINS`; khi ra production admin functions can set origin ro rang.

Quyet dinh ky thuat cho Phase 1:

- Tao `/console` ngoai `AppShell`, dung layout rieng light/pro operator dashboard.
- Console guard rieng: loading auth -> skeleton trung tinh; no session/not admin -> redirect ve home.
- Admin shell khong import/khong render nav user, upgrade prompt, install prompt, quick add.
- Phase 1 chi nen tao shell + guard + empty dashboard, chua tao tac vu side-effect neu `admin_audit_logs` chua co.

Thong tin da chot cho Phase 1/2:

- Email Supabase Auth cua chu du an de seed admin dau tien: `<owner-email>`.
- User thuong vao `/console`: redirect ve home.
- In-app system notification: luu cloud va hien trong tab `He thong` cua `/notifications`.
- Web push: coi nhu production da co VAPID/Edge Function, nhung van can health check trong console truoc khi gui that.
- Resend: production da co key/sender/domain can thiet, email ma xac thuc gui binh thuong.
- PayOS: production webhook/config da on dinh, thanh toan dang hoat dong.
- Plan/limit config: dua ra admin som, nam trong Phase 10 sau khi co audit/config RPC.
- User/Group Support: giai thich cho chu du an la MVP nen read-only truoc; "refresh profile" la action co side effect nho, se de sau khi co audit/rule.

## Phase 1: Console Shell + Admin Guard

Muc tieu: co route `/console` an, co layout console va guard admin.

Deliverable:

- Console layout light theme
- Sidebar/module grouping
- Admin IA + route map theo module catalog
- Route placeholder cho cac module chinh voi trang thai "chua cau hinh"/"chua trien khai" an toan
- Route guard admin
- Empty/dashboard state an toan
- Test user thuong khong thay/khong vao duoc console

Acceptance criteria:

- User thuong khong co link den console.
- User thuong vao truc tiep `/console` bi redirect ve home va khong thay thong tin admin.
- Admin vao duoc console.
- Khong co secret trong bundle.
- Cac module chua lam khong goi API that va khong tao side effect.

### Ket Qua Phase 1 - 2026-06-10

Da lam:

- Tao admin role helper `src/lib/admin.ts` goi RPC `my_admin_role()` va tra role hop le hoac `null`.
- Tao route guard rieng `ConsoleAccessGate`: local/demo/no session/not admin redirect ve home; admin moi render shell.
- Tao `/console` ngoai `AppShell`, khong render nav user, quick add, upgrade prompt hay public link.
- Tao console shell light/pro dashboard, sidebar group, topbar, overview va route placeholder cho 12 module.
- Tao migration `supabase/migrations/0020_admin_console_foundation.sql` voi `admin_users`, `is_console_admin(uid)`, `my_admin_role()`, seed owner tu `<owner-email>`.
- Them test cho helper admin va gate user/admin.

File chinh da thay doi:

- `src/main.tsx`
- `src/lib/admin.ts`
- `src/lib/admin.test.ts`
- `src/features/admin/ConsoleAccessContext.tsx`
- `src/features/admin/ConsoleGate.tsx`
- `src/features/admin/ConsoleGate.test.tsx`
- `src/features/admin/ConsolePages.tsx`
- `src/features/admin/ConsoleShell.tsx`
- `src/features/admin/consoleModules.ts`
- `supabase/migrations/0020_admin_console_foundation.sql`

Verify da chay trong Phase 1:

- `npm test -- src/lib/admin.test.ts src/features/admin/ConsoleGate.test.tsx`
- `npm run typecheck`
- `npm test`
- `npm run lint` (0 error, con warning cu cua repo)
- `npm run build` (pass; Vite canh bao chunk lon >500 kB)
- `git diff --check`
- Smoke local `http://127.0.0.1:5173/console`: khi khong co admin session, route redirect ve `/`, khong render noi dung console, browser khong co error/warn.

Can lam tiep truoc khi push Supabase:

- Xu ly/kiem tra migration hygiene: `0019_ai_usage.sql` co nguy co tao trung `ai_usage` voi `0002_normalized_schema.sql` truoc khi `supabase db push --dry-run`.
- Chua push migration production trong Phase 1 neu chua dry-run sach.

## Phase 2: Admin Audit Log Foundation

Muc tieu: co audit log truoc khi bat dau cac tac vu co side effect.

Deliverable:

- Migration `admin_audit_logs`
- Helper/RPC/Edge Function ghi audit
- UI `/console/audit` co list/filter/detail drawer
- Redaction payload co ban

Acceptance criteria:

- Moi admin action MVP ghi duoc log.
- Log co actor/action/status/time.
- Error action cung duoc ghi.

### Ket Qua Phase 2 - 2026-06-10

Da lam:

- Tao migration `supabase/migrations/0021_admin_audit_log_foundation.sql`.
- Tao `admin_audit_logs` voi actor, role, action, target, payload summary, status, error, created_at.
- Khoa direct table access voi RLS; UI doc qua RPC `admin_list_audit_logs(...)` co `assert_console_admin()`.
- Tao RPC `admin_write_audit_log(...)` de cac admin action sau nay ghi success/failed, co truncate error va redact payload co ban.
- Tao helper client `src/lib/adminAudit.ts` de list/write audit qua RPC.
- Doi `/console/audit` tu placeholder sang UI that: filter action/status, refresh, list log, detail panel payload/error.
- Cap nhat dashboard console sang trang thai Phase 2 audit.
- Them test cho helper audit va UI audit page.

File chinh da thay doi:

- `src/lib/adminAudit.ts`
- `src/lib/adminAudit.test.ts`
- `src/features/admin/ConsoleAuditPage.test.tsx`
- `src/features/admin/ConsolePages.tsx`
- `supabase/migrations/0021_admin_audit_log_foundation.sql`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 2:

- `npm test -- src/lib/adminAudit.test.ts src/features/admin/ConsoleAuditPage.test.tsx src/lib/admin.test.ts src/features/admin/ConsoleGate.test.tsx`
- `npm run typecheck`
- `supabase db push --dry-run --yes` (se push `0021_admin_audit_log_foundation.sql`)
- `npm test` (11 files, 29 tests)
- `npm run build` (pass; Vite canh bao chunk lon >500 kB)
- `npm run lint` (0 error, con 29 warning cu cua repo)
- `git diff --check`
- Smoke local `http://127.0.0.1:5173/console/audit`: khi khong co admin session, redirect ve `/`, khong render audit UI, browser khong co error/warn.
- `supabase db push --yes` da apply `0021_admin_audit_log_foundation.sql` len remote.
- `supabase db push --dry-run --yes` sau push bao remote database up to date.

Can lam tiep:

- Phase 3 moi bat dau Redeem Code Manager, va moi redeem action bat buoc goi `admin_write_audit_log(...)`.

## Phase 3: Redeem Code Manager MVP

Muc tieu: phat hanh va kiem tra code Premium theo ngay/thang.

UI de xuat:

```text
/console/redeem
  Overview
  Create
  Lookup
  Campaigns
```

Tinh nang MVP:

- Tao code don le
- Tao batch code
- Prefix campaign
- Batch/campaign metadata qua `redeem_code_batches` neu co
- Duration: 7, 14, 30, 90, 365 ngay
- Expiry date
- Max uses
- Gioi han theo user neu duoc chot rule
- Ghi chu noi bo
- Lookup code
- Revoke code/campaign
- Xem redemption history
- Thong ke campaign/code
- Kiem tra bat thuong `used_count` vs `redemption_uses`

Backend yeu cau:

- Khong update subscription truc tiep tu client.
- Tao/redeem/revoke qua RPC/Edge Function co admin guard.
- Race condition an toan khi redeem.
- Ghi audit log moi action.

Acceptance criteria:

- Admin tao duoc Premium 30 ngay.
- User redeem xong subscription cap nhat dung.
- Code het han/het luot/revoked khong dung duoc.
- Action co audit log.

### Ket Qua Phase 3 - 2026-06-10

Da lam:

- Tao migration `supabase/migrations/0022_admin_redeem_manager.sql`.
- Them `redeem_code_batches` de luu batch/campaign metadata.
- Mo rong `redemption_codes` voi `status`, `revoked_at`, `revoked_by`, `internal_note`, `batch_id`.
- Tao helper status `redeem_code_effective_status(...)` de phan biet `active`, `expired`, `exhausted`, `revoked`.
- Tao RPC admin co guard va audit: `admin_create_redeem_code(...)`, `admin_create_redeem_batch(...)`, `admin_list_redeem_codes(...)`, `admin_lookup_redeem_code(...)`, `admin_revoke_redeem_code(...)`.
- Cap nhat `redeem_code(...)` user-facing de chan code revoked, het han, het luot bang dieu kien atomic.
- Tao helper client `src/lib/adminRedeem.ts` de UI khong thao tac raw SQL/table truc tiep.
- Doi `/console/redeem` tu placeholder sang UI that: tao code don, tao batch, prefix, plan, duration, expiry, max uses, ghi chu noi bo, lookup, list/filter, detail, usage history, copy/revoke.
- Cap nhat dashboard console sang trang thai Phase 3 redeem.
- Them test cho helper redeem va UI redeem page.

File chinh da thay doi:

- `src/lib/adminRedeem.ts`
- `src/lib/adminRedeem.test.ts`
- `src/features/admin/ConsoleRedeemPage.tsx`
- `src/features/admin/ConsoleRedeemPage.test.tsx`
- `src/features/admin/ConsolePages.tsx`
- `supabase/migrations/0022_admin_redeem_manager.sql`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 3:

- `npm test -- src/lib/adminRedeem.test.ts src/features/admin/ConsoleRedeemPage.test.tsx`
- `npm run typecheck`
- `supabase db push --dry-run --yes` (truoc push: se push `0022_admin_redeem_manager.sql`)
- `npm test` (13 files, 34 tests)
- `npm run build` (pass; Vite canh bao chunk lon >500 kB)
- `npm run lint` (0 error, con 29 warning cu cua repo)
- `git diff --check`
- `supabase db push --yes` da apply `0022_admin_redeem_manager.sql` len remote.
- `supabase db push --dry-run --yes` sau push bao remote database is up to date.

Rui ro/con lai:

- Can smoke bang admin session that tren `/console/redeem` de xac nhan tao/revoke code end-to-end tren production data.
- Chua co revoke theo batch/campaign hang loat; de sau khi co approval mode rieng.
- Chua co redeem intelligence nang cao nhu used_count mismatch scanner; dua sang Data Quality/cleanup phase.

## Phase 4: Notification Center MVP

Muc tieu: gui thong bao he thong qua in-app va web push.

UI de xuat:

```text
/console/notifications
  Composer
  Scheduled
  Delivery Logs
```

MVP 4.1: Send now

- Target all users
- Target free users
- Target premium users
- Target user cu the theo email
- Target nhom cu the
- Target nguoi no/chu no khi co du logic support
- Channel in-app
- Channel web push
- Channel email de sau khi Email/Resend on dinh
- Preview mobile push va in-app card
- Confirm 2 buoc neu target la all users
- Dry-run dem so user bi anh huong truoc khi gui
- In-app message phai xuat hien trong tab `He thong` cua `/notifications`.

MVP 4.2: Schedule

- Send at
- Status: draft/scheduled/sent/failed/cancelled
- Cancel schedule
- Retry failed

Recurring de sau khi schedule on dinh:

- Daily/weekly/monthly
- Pause/resume
- End date
- Template bao tri/update/khuyen mai/loi he thong/AI invite
- Segmentation: da het han, chua tao nhom, co no chua thanh toan, dung AI nhieu, chua cau hinh ngan hang

Bang de xuat:

```sql
system_notifications
notification_jobs
notification_deliveries
notification_templates
```

Acceptance criteria:

- Gui in-app thanh cong va user nhin thay trong tab `He thong`.
- Gui web push den subscription hop le.
- Loi mot subscription khong lam hong toan bo job.
- Co delivery log va audit log.

### Ket Qua Phase 4.1 - 2026-06-10

Da lam:

- Tao migration `supabase/migrations/0023_system_notifications.sql`.
- Them bang `system_notifications`, `notification_jobs`, `notification_deliveries`, `notification_templates`.
- Them RPC user-facing: `list_my_system_notifications(...)`, `mark_my_system_notification_read(...)`, `mark_all_my_system_notifications_read()`.
- Them RPC admin: `admin_list_system_notifications(...)`, `admin_list_notification_deliveries(...)`.
- Khoa direct table access voi RLS/revoke; user va admin doc qua RPC guarded.
- Tao Edge Function `supabase/functions/admin-notifications/index.ts` voi `verify_jwt=true`, check `admin_users`, chi cho role `owner`/`operator` gui.
- Edge Function ho tro `preview` va `send_now` cho target `all`, `free`, `premium`, `user`, `group`.
- `send_now` tao campaign, job, in-app delivery, web push delivery, cleanup endpoint push 404/410, tiep tuc job neu 1 subscription loi.
- `send_now` ghi audit log action `notification.send_now` vao `admin_audit_logs`.
- Doi `NotificationsProvider` de merge remote in-app system deliveries vao tab `He thong` cua `/notifications`, mark-read cung ghi ve DB.
- Tao helper client `src/lib/adminNotifications.ts` va `src/lib/systemNotifications.ts`.
- Doi `/console/notifications` tu placeholder sang UI that: composer, target, channel toggle, preview, all-user confirm, campaign list, delivery detail.
- Them test cho helper admin notification, helper system notification va UI console notification.

File chinh da thay doi:

- `src/lib/adminNotifications.ts`
- `src/lib/adminNotifications.test.ts`
- `src/lib/systemNotifications.ts`
- `src/lib/systemNotifications.test.ts`
- `src/lib/notifications.tsx`
- `src/features/admin/ConsoleNotificationsPage.tsx`
- `src/features/admin/ConsoleNotificationsPage.test.tsx`
- `src/features/admin/ConsolePages.tsx`
- `supabase/migrations/0023_system_notifications.sql`
- `supabase/functions/admin-notifications/index.ts`
- `supabase/config.toml`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 4.1:

- `npm test -- src/lib/adminNotifications.test.ts src/lib/systemNotifications.test.ts src/features/admin/ConsoleNotificationsPage.test.tsx`
- `npm run typecheck`
- `git diff --check`
- `supabase db push --dry-run --yes` (truoc push: se push `0023_system_notifications.sql`)
- `supabase db push --yes` da apply `0023_system_notifications.sql` len remote.
- `supabase functions deploy admin-notifications` da deploy function ACTIVE version 1.
- `supabase db push --dry-run --yes` sau push bao remote database is up to date.
- `supabase functions list` xac nhan `admin-notifications` ACTIVE.
- `npm test` (16 files, 39 tests)
- `npm run build` (pass; Vite canh bao chunk lon >500 kB)
- `npm run lint` (0 error, con 29 warning cu cua repo)
- Smoke local `http://127.0.0.1:5173/console/notifications`: user thuong redirect ve `/`, khong render console, browser khong co error/warn.

Rui ro/con lai:

- Chua smoke send-now bang admin session that tren production UI; can login owner va gui test toi chinh admin truoc khi blast all-user.
- `deno check` khong chay duoc tren may nay vi `deno` khong duoc cai; function da duoc Supabase deploy thanh cong.
- Phase 4.2 schedule/recurring/retry/cancel chua bat; bang `notification_jobs` da san nen lam tiep sau.
- Target `nguoi no`/`chu no` chua lam vi can rule segmentation theo settlement/support 360 ro hon.

NHAC CHU DU AN KHI CAN LAM PRODUCTION SMOKE:

- Truoc khi gui all-user hoac premium/free target rong, dang nhap owner production va gui test target user email `<owner-email>`.
- Kiem tra user thay thong bao trong `/notifications` tab `He thong`.
- Kiem tra `/console/notifications` delivery log, audit action `notification.send_now`, va web push `sent/failed`.
- Neu test nay chua pass thi khong blast toan he thong.

## Phase 5: Dashboard Van Hanh + System Health + Job Monitor MVP

Muc tieu: mo console la thay tinh trang he thong va job gan day.

Cards MVP:

- Supabase/Auth.
- Edge Functions.
- Resend.
- AI provider.
- PayOS/webhook.
- Redeem system.
- Push subscriptions.
- Cron/job gan nhat.
- Loi gan day.
- Counts: users, groups, active premium, redeem uses, AI usage.

Job Monitor MVP:

- Xem `admin_job_runs`/notification jobs gan day.
- Trang thai: queued/running/succeeded/failed/cancelled.
- Retry/cancel cho job duoc phep.
- Khong chay cleanup hay job nguy hiem trong phase nay.

Nguyen tac:

- Khong show secret.
- Chi show configured/missing/last success/last error.
- Test action phai ghi audit log loai `health_check`.
- Error state ro rang, khong toast bien mat qua nhanh.

Acceptance criteria:

- Admin thay trang thai tong quan.
- Health check khong lam thay doi du lieu user.
- Job/log doc duoc va filter duoc.
- Loi function/provider hien ro ma khong lo secret.

### Ket Qua Phase 5 - 2026-06-10

Da lam:

- Tao migration `supabase/migrations/0024_admin_health_jobs.sql` voi bang `admin_job_runs` an khoi client role, chi service role thao tac.
- Tao Edge Function `supabase/functions/admin-health/index.ts` voi `verify_jwt=true`, check `admin_users` server-side.
- Edge Function tra snapshot da sanitize: Supabase/Auth, Edge Functions, Resend, AI provider, PayOS, Redeem, Push, recent jobs, recent errors.
- Snapshot co counts: users, groups, active premium, redeem codes, redeem uses thang hien tai, AI usage thang hien tai, push subscriptions, pending PayOS orders.
- Moi lan chay health check tao `admin_job_runs` va ghi audit action `health_check`.
- Tao helper client `src/lib/adminHealth.ts` va test `src/lib/adminHealth.test.ts`.
- Tao UI `/console/health` trong `src/features/admin/ConsoleHealthPage.tsx`: health cards, metrics, job monitor filter, job detail, recent errors.
- Cap nhat console home va route `health` de dung dashboard that thay placeholder.

File chinh da thay doi:

- `src/lib/adminHealth.ts`
- `src/lib/adminHealth.test.ts`
- `src/features/admin/ConsoleHealthPage.tsx`
- `src/features/admin/ConsoleHealthPage.test.tsx`
- `src/features/admin/ConsolePages.tsx`
- `supabase/migrations/0024_admin_health_jobs.sql`
- `supabase/functions/admin-health/index.ts`
- `supabase/config.toml`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 5:

- `npm test -- src/lib/adminHealth.test.ts src/features/admin/ConsoleHealthPage.test.tsx src/lib/adminNotifications.test.ts src/features/admin/ConsoleNotificationsPage.test.tsx`
- `npm test -- src/lib/adminHealth.test.ts src/features/admin/ConsoleHealthPage.test.tsx`
- `npm run typecheck`
- `git diff --check`
- `supabase db push --dry-run --yes` truoc push: se push `0024_admin_health_jobs.sql`
- `supabase db push --yes` da apply `0024_admin_health_jobs.sql` len remote.
- `supabase functions deploy admin-health` da deploy function ACTIVE version 1.
- `supabase db push --dry-run --yes` sau push bao remote database is up to date.
- `supabase functions list` xac nhan `admin-health` ACTIVE.

Rui ro/con lai:

- Chua smoke `/console/health` bang admin session production that; can login owner, bam `Chay health check`, kiem tra snapshot, `admin_job_runs` va audit `health_check`.
- Job Monitor Phase 5 dang read/filter/detail; retry/cancel job that de sang Phase 5.1 hoac Phase 4.2 schedule/retry de tranh action nguy hiem khi chua co rule.
- `deno check` khong chay duoc tren may nay neu Deno chua cai; function da deploy thanh cong len Supabase.

NHAC CHU DU AN KHI CAN LAM PRODUCTION SMOKE:

- Mo `/console/health` bang tai khoan owner production.
- Bam `Chay health check`, xac nhan khong lo secret, provider missing/failed neu co hien ro.
- Mo `/console/audit`, xac nhan co audit `health_check`.
- Neu health card PayOS/Resend/AI/Push hien `missing` trong khi production dang co secret, can kiem tra Supabase secrets truoc khi lam phase lien quan.

## Phase 6: AI Operations / AI Config

Muc tieu: dieu hanh AI parse/OCR/insight voi guardrail va audit.

MVP:

- Bat/tat parse expense, OCR, insight qua feature flag.
- Xem trang thai AI provider/model.
- Chon provider/model tu danh sach goi y; custom model de sau neu can.
- Quota free/premium theo feature.
- Xem `ai_usage` summary theo thang/user/feature.
- Test parse expense voi cau mau.
- Test OCR voi anh mau sau khi co flow upload an toan.
- Test insight voi stats mau.
- Hien output JSON da sanitize.
- Xem loi AI gan day neu co log.
- Reset quota co confirm + audit, khong lam hang loat trong MVP neu chua co rule.

Khong lam trong MVP:

- Luu raw API key trong frontend/DB public.
- Sua prompt production truc tiep khong versioning.
- Reset quota hang loat khong preview.

### Ket Qua Phase 6 - 2026-06-10

Da lam:

- Tao migration `supabase/migrations/0025_admin_ai_ops.sql` voi `app_config`, `feature_flags`, `ai_prompt_versions` va seed config AI mac dinh.
- Tao Edge Function `supabase/functions/admin-ai/index.ts` voi `verify_jwt=true`, check `admin_users` server-side, owner-only cho save config/reset quota.
- Edge Function ho tro: `snapshot`, `save_config`, `test_parse`, `test_ocr`, `test_insight`, `reset_quota`.
- Tat ca action AI quan trong ghi audit: `ai.config.save`, `ai.test.parse`, `ai.test.ocr`, `ai.test.insight`, `ai.quota.reset`, va log failed `ai.<action>.failed`.
- Tao helper client `src/lib/adminAi.ts` va UI `/console/ai` trong `src/features/admin/ConsoleAiPage.tsx`.
- UI co runtime config provider/model, feature switch parse/OCR/insight, quota Free, prompt/template version, test lab, usage summary, usage row va reset quota tung user/feature/ky.
- Cap nhat `supabase/functions/_shared/ai.ts` de doc runtime config tu DB, fallback ve default neu DB chua san sang.
- Cap nhat `parse-expense`, `ocr-receipt`, `insight` de ton trong feature flag, quota Free tu config, prompt/model/provider tu DB.
- Cap nhat console home sang trang thai Phase 6 AI operations.

File chinh da thay doi:

- `src/lib/adminAi.ts`
- `src/lib/adminAi.test.ts`
- `src/features/admin/ConsoleAiPage.tsx`
- `src/features/admin/ConsoleAiPage.test.tsx`
- `src/features/admin/ConsolePages.tsx`
- `supabase/migrations/0025_admin_ai_ops.sql`
- `supabase/functions/admin-ai/index.ts`
- `supabase/functions/_shared/ai.ts`
- `supabase/functions/parse-expense/index.ts`
- `supabase/functions/ocr-receipt/index.ts`
- `supabase/functions/insight/index.ts`
- `supabase/config.toml`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 6:

- `npm test -- src/lib/adminAi.test.ts src/features/admin/ConsoleAiPage.test.tsx`
- `npm run typecheck`
- `npm test` (20 files, 46 tests)
- `npm run build` (pass; Vite canh bao chunk lon >500 kB)
- `npm run lint` (0 error, con 29 warning cu cua repo)
- `git diff --check`
- Smoke local `http://127.0.0.1:5173/console/ai`: user khong co admin session redirect ve `/`, khong render noi dung console, browser khong co error/warn.
- `supabase db push --dry-run --yes` truoc push: chi push `0025_admin_ai_ops.sql`.
- `supabase db push --yes` da apply `0025_admin_ai_ops.sql` len remote.
- `supabase db push --dry-run --yes` sau push bao remote database is up to date.
- `supabase functions deploy admin-ai` da deploy function ACTIVE version 1.
- `supabase functions deploy parse-expense`, `supabase functions deploy ocr-receipt`, `supabase functions deploy insight` da chay thanh cong de cap nhat shared AI runtime config.
- `supabase functions list` xac nhan `admin-ai`, `parse-expense`, `ocr-receipt`, `insight` ACTIVE.

Rui ro/con lai:

- Chua smoke `/console/ai` bang admin session production that; can login owner production de kiem snapshot va test lab.
- `deno check` khong chay duoc tren may nay neu Deno chua cai; Supabase function deploy thanh cong duoc dung lam validation Edge Function.
- Prompt/config co tac dong truc tiep toi user-facing AI; khong tat feature rong hoac sua prompt manh neu chua test bang target nho.
- Custom provider/key management khong nam trong MVP Phase 6; secret van phai nam o Supabase secrets/env, khong dua vao UI.

NHAC CHU DU AN KHI CAN LAM PRODUCTION SMOKE:

- Dang nhap owner production, mo `/console/ai`, xac nhan snapshot provider/model/flag/quota hien dung va khong lo secret.
- Chay `Test parser` bang cau mau, xac nhan output hop ly, quota user khong bi tru, va `/console/audit` co `ai.test.parse`.
- Neu can test OCR, dung anh hoa don nho, khong upload anh nhay cam; kiem tra audit `ai.test.ocr`.
- Chua nen tat parse/OCR/insight cho toan he thong hoac sua prompt production manh neu chua test parse/OCR/insight tren production.
- Neu provider hien `missing` trong khi AI dang dung duoc, kiem tra Supabase secrets `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` va redeploy function lien quan truoc khi doi config.

## Phase 7: Email / Resend Console

Muc tieu: kiem tra va van hanh kenh email.

MVP:

- Health check Resend configured/missing.
- Gui test email toi admin.
- Xem template reminder/release/system neu co.
- Xem log reminder email gan day neu co bang log.
- Hien loi gui gan day.
- Bounce/domain/sender status de sau neu Resend API va du lieu cho phep.

Acceptance criteria:

- Test email thanh cong hoac hien loi ro.
- Khong show Resend API key.
- Moi test/send action co audit log.

### Ket Qua Phase 7 - 2026-06-10

Da lam:

- Tao migration `supabase/migrations/0026_admin_email_resend.sql` voi `email_templates` va `email_delivery_logs`.
- Seed email templates MVP: `system_test`, `premium_reminder`, `release_note`.
- Tao Edge Function `supabase/functions/admin-email/index.ts` voi action `snapshot` va `send_test`.
- `admin-email` dung JWT + server-side `admin_users`; `send_test` gioi han role `owner`/`operator` va ghi `admin_audit_logs`.
- Cap nhat `send-reminders` de log reminder email vao `email_delivery_logs` voi status `sent`, `failed`, `skipped`.
- Tao helper frontend `src/lib/adminEmail.ts` va test `src/lib/adminEmail.test.ts`.
- Tao UI `/console/email` trong `src/features/admin/ConsoleEmailPage.tsx` va test `src/features/admin/ConsoleEmailPage.test.tsx`.
- Wire module email vao `src/features/admin/ConsolePages.tsx` va cap nhat copy console overview.
- Cap nhat `supabase/config.toml` cho function `admin-email` verify JWT.

Supabase da day/deploy:

- Remote DB da co `0026_admin_email_resend.sql`; `supabase db push --dry-run --yes` bao `Remote database is up to date` sau deploy.
- `admin-email` ACTIVE version 2 tren project `trzkvnxqnveqkhejfher`.
- `send-reminders` ACTIVE version 9 tren project `trzkvnxqnveqkhejfher`.

Verify da chay trong Phase 7:

- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm run typecheck` pass.
- `npm test` pass: 22 files, 49 tests.
- `npm run build` pass; Vite van canh bao chunk lon >500 kB.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass truoc va sau deploy, remote DB up to date.
- Smoke local `http://127.0.0.1:5173/console/email`: user khong co admin session bi redirect ve `/`, khong render console; browser console chi co React DevTools info cua dev mode.

Rui ro / gioi han con lai:

- Chua smoke gui email test bang owner production that; can login owner de gui toi `<owner-email>` truoc khi dung rong.
- Bounce/domain/sender status nang cao de sau vi can Resend API/webhook du lieu ro hon.
- `summary_status` co the hien `failed` neu co loi email gan day trong log, du `RESEND_API_KEY` da configured; day la tin hieu van hanh chu khong phai secret check.
- `deno check` khong chay duoc neu may chua cai Deno; Supabase function deploy thanh cong duoc dung lam validation Edge Function.
- Khong show `RESEND_API_KEY`, service role key, hoac secret nao trong frontend/snapshot.

NHAC CHU DU AN KHI CAN LAM PRODUCTION SMOKE:

- Dang nhap owner production, mo `/console/email`, xac nhan Resend hien `configured` va khong lo secret.
- Gui test email toi `<owner-email>`, xac nhan email toi hop thu, `email_delivery_logs` co row `system_test`, va `/console/audit` co action `email.test.send`.
- Kiem tra reminder email gan day neu co subscription sap het han; neu status `failed` thi xem message da redact va khong chua token/key.
- Chua can bat bounce/domain analytics cho den khi co Resend webhook/API design rieng.

## Phase 8: Billing / Premium Console

Muc tieu: theo doi premium, payment orders, PayOS va debug subscription.

MVP:

- List/search subscription.
- Lookup premium cua user.
- Payment orders theo user/status/time.
- PayOS webhook health.
- Xem source: payos/redemption/manual.
- Manual grant/gia han chi qua RPC/Edge Function co admin guard + audit + confirm.
- Khong sua truc tiep raw subscription tu UI.

Acceptance criteria:

- Admin tra duoc user dang premium/free/expired.
- Admin tra duoc payment order pending/paid/cancelled.
- Manual grant neu bat trong MVP phai co audit va preview.

### Ket Qua Phase 8 - 2026-06-10

Da lam:

- Tao helper frontend `src/lib/adminBilling.ts` va test `src/lib/adminBilling.test.ts`.
- Tao UI `/console/billing` trong `src/features/admin/ConsoleBillingPage.tsx` va test `src/features/admin/ConsoleBillingPage.test.tsx`.
- Wire module billing vao `src/features/admin/ConsolePages.tsx`; console home copy da cap nhat sang Phase 8.
- Tao Edge Function `supabase/functions/admin-billing/index.ts` voi action `snapshot`, `lookup_user`, `manual_grant`.
- `admin-billing` dung JWT + server-side `admin_users`; `manual_grant` gioi han role `owner`/`operator`.
- `manual_grant` goi RPC `grant_subscription(...)` bang service role, khong update raw subscription tu frontend.
- Moi manual grant thanh cong/thuc thi loi tu RPC duoc ghi `admin_audit_logs` voi action `billing.manual_grant`.
- Them `supabase/migrations/0027_admin_billing_indexes.sql` de toi uu filter/list billing: `subscriptions` theo status/source va `payment_orders` theo status/user/created_at.
- Cap nhat `supabase/config.toml` cho function `admin-billing` verify JWT.

Supabase da day/deploy:

- `0027_admin_billing_indexes.sql` da apply tren remote DB.
- `admin-billing` ACTIVE version 1 tren project `trzkvnxqnveqkhejfher`.
- `supabase db push --dry-run --yes` sau deploy bao `Remote database is up to date`.

Verify da chay trong Phase 8:

- `npm test -- src/lib/adminBilling.test.ts src/features/admin/ConsoleBillingPage.test.tsx` pass: 2 files, 3 tests.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm run typecheck` pass.
- `npm test` pass: 24 files, 52 tests.
- `npm run build` pass; Vite van canh bao chunk lon >500 kB.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass truoc/sau push.
- Smoke local `http://127.0.0.1:5173/console/billing`: user khong co admin session bi redirect ve `/`, khong render console; browser console chi co React DevTools info cua dev mode.

Rui ro / gioi han con lai:

- Chua smoke billing bang owner production that vi can session owner trong browser.
- Manual grant la thao tac manh; chi nen dung sau khi lookup dung user va co ly do audit ro.
- Chua co PayOS reconciliation nang cao/webhook retry UI; Phase 8 MVP chi doc order, health, lookup va manual grant.
- `admin-billing` chi tra status configured/missing cua PayOS secret, khong tra secret value.
- `deno check` khong chay duoc neu may chua cai Deno; Supabase function deploy thanh cong duoc dung lam validation Edge Function.

NHAC CHU DU AN KHI CAN LAM PRODUCTION SMOKE:

- Dang nhap owner production, mo `/console/billing`, xac nhan PayOS hien `configured` va khong lo secret.
- Lookup `<owner-email>` hoac mot user test, xac nhan subscription/payment order hien dung.
- Thu manual grant voi user test truoc, so ngay nho, co note audit; kiem tra subscription cap nhat va `/console/audit` co `billing.manual_grant`.
- Kiem tra payment order pending/paid/cancelled neu co du lieu PayOS that.

## Phase 9: User / Group Support 360

Muc tieu: ho tro user an toan, read-only truoc.

MVP read-only:

- Tra user theo email/id.
- Xem profile, onboarded, bank configured/not configured.
- Xem groups va role/thanh vien.
- Xem subscription, redemption history, payment orders.
- Xem AI usage.
- Xem push subscriptions count/device health.
- Xem quyen/role trong group.

Write action de sau khi co rule:

- Refresh profile.
- Khoa/mo tinh nang theo user.
- Gan note noi bo.
- Tuyet doi khong sua expense/settlement/payment raw trong MVP.

Acceptance criteria:

- Read-only view khong co side effect.
- User support action nao co side effect phai co confirm va audit.

### Ket Qua Phase 9 - 2026-06-10

Da lam:

- Tao helper frontend `src/lib/adminSupport.ts` va test `src/lib/adminSupport.test.ts`.
- Tao UI `/console/support` trong `src/features/admin/ConsoleSupportPage.tsx` va test `src/features/admin/ConsoleSupportPage.test.tsx`.
- Wire module support vao `src/features/admin/ConsolePages.tsx`; khong them link public/user-facing nao.
- Tao Edge Function `supabase/functions/admin-support/index.ts` voi action `search_users` va `user_snapshot`.
- `admin-support` dung JWT + server-side `admin_users`, cho admin active doc read-only; khong co write action va khong mutate du lieu business.
- Snapshot hien profile/onboarded/bank configured, groups + members/role, subscription, payment orders, redemption history, AI usage va push health.
- Push endpoint chi tra `host/count`, khong tra raw endpoint/p256dh/auth; bank account chi tra `last4`, khong tra full account number.
- Them `supabase/migrations/0028_admin_support_indexes.sql` de toi uu lookup support: `group_members` theo user, `redemption_uses` theo user, `push_subscriptions` theo user/created_at, `settlements` theo group/created_at.
- Cap nhat `supabase/config.toml` cho function `admin-support` verify JWT.

Supabase da day/deploy:

- `0028_admin_support_indexes.sql` da apply tren remote DB.
- `admin-support` ACTIVE version 1 tren project `trzkvnxqnveqkhejfher`.
- `supabase db push --dry-run --yes` sau deploy bao `Remote database is up to date`.

Verify da chay trong Phase 9:

- `npm test -- src/lib/adminSupport.test.ts src/features/admin/ConsoleSupportPage.test.tsx` pass: 2 files, 2 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 26 files, 54 tests.
- `npm run build` pass; Vite van canh bao chunk lon >500 kB.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass truoc/sau push.
- `supabase db push --yes` da apply `0028_admin_support_indexes.sql` len remote.
- `supabase functions deploy admin-support` da deploy function ACTIVE version 1.
- `supabase functions list` xac nhan `admin-support` ACTIVE.

Rui ro / gioi han con lai:

- Chua smoke `/console/support` bang owner production that vi can session owner trong browser.
- Phase 9 MVP co chu dich khong ghi audit cho lookup read-only de giu acceptance "khong co side effect"; neu sau nay can audit support lookup thi can chot rule rieng.
- Chua co action `refresh profile`, lock/unlock feature hay internal note; nhung action do phai co confirm + audit va se lam sau khi co rule ro.
- `deno check` khong chay duoc tren may nay vi Deno chua cai; function da deploy thanh cong len Supabase duoc dung lam validation Edge Function.

NHAC CHU DU AN KHI CAN LAM PRODUCTION SMOKE:

- Dang nhap owner production, mo `/console/support`, lookup `<owner-email>` hoac user test.
- Kiem tra profile/onboarded/bank configured, groups/member role, subscription/payment/redeem, AI usage va push host/count hien dung.
- Xac nhan user thuong vao `/console/support` van redirect ve home va khong thay wording admin.
- Khong them write action support neu chua co confirm/audit/rule cu the.

## Phase 10: System Config / Feature Flags / Limits / Maintenance

Muc tieu: dua config van hanh ra DB/RPC, khong hardcode trong frontend.

MVP:

- Feature flags: AI parse, OCR, insight, debt reminder, redeem, payment, Zalo login.
- Kill switch khan cap cho feature loi production.
- Maintenance banner toan app co start/end/status.
- Plan & limit config: free/premium groups, members, AI quota, OCR quota, debt reminder cooldown, redeem duration default.
- Legal/payment disclaimer config neu can.

Approval mode bat buoc:

- All-user maintenance.
- Doi quota toan app.
- Tat payment/redeem/AI.
- Revoke hang loat.

Acceptance criteria:

- Config doc/ghi qua RPC co admin guard.
- Khong secret trong config table.
- Moi config change co audit log va diff tom tat.

### Ket Qua Phase 10 - 2026-06-10

Da lam:

- Tao client helper `src/lib/adminConfig.ts` va test `src/lib/adminConfig.test.ts` de doc/ghi snapshot qua Edge Function `admin-config`.
- Tao UI `/console/config` trong `src/features/admin/ConsoleConfigPage.tsx` va test `src/features/admin/ConsoleConfigPage.test.tsx`.
- UI chia thanh 4 tab: Feature flags, Plan & limits, Maintenance, Disclaimer; co reason + confirm truoc khi save.
- Tao Edge Function `supabase/functions/admin-config/index.ts` voi action `snapshot`, `save_flags`, `save_limits`, `save_maintenance`, `save_disclaimer`.
- `admin-config` dung JWT + server-side `admin_users`; write action yeu cau role `owner` va ghi `admin_audit_logs`.
- Tao migration `supabase/migrations/0029_admin_system_config.sql` de them `maintenance_banners`, seed flags `payments/redeem/debt_reminder/zalo_login`, seed `plan_limits/operation_limits/legal_disclaimer`, public RPC `current_maintenance_banner()`.
- Cap nhat `redeem_code(p_code)` de flag `redeem=false` chan redeem that server-side.
- Them public helper `src/lib/systemConfig.ts`, test `src/lib/systemConfig.test.ts`, component `src/components/MaintenanceBanner.tsx`, va gan vao `src/app/AppShell.tsx` de hien maintenance banner toan app.
- Noi kill switch runtime vao `payos-create` (`payments`), `remind-debt` (`debt_reminder` + `operation_limits.debt_cooldown_hours`), va `zalo-auth` (`zalo_login`).
- Cap nhat `supabase/config.toml` cho `admin-config` verify JWT; them khai bao ro `payos-create` verify JWT.

Supabase da day/deploy:

- `0029_admin_system_config.sql` da apply tren remote DB.
- `admin-config` ACTIVE version 1 tren project `trzkvnxqnveqkhejfher`.
- Cac function runtime bi cham trong phase nay da deploy lai: `payos-create` ACTIVE version 8, `remind-debt` ACTIVE version 4, `zalo-auth` ACTIVE version 16.

Verify da chay trong Phase 10:

- `npm test -- src/lib/systemConfig.test.ts src/lib/adminConfig.test.ts src/features/admin/ConsoleConfigPage.test.tsx` pass: 3 files, 4 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 29 files, 58 tests.
- `npm run build` pass; Vite van canh bao chunk lon >500 kB.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass truoc push, pending dung `0029_admin_system_config.sql`.
- `supabase db push --dry-run --yes` sau push bao `Remote database is up to date`.
- `supabase functions list` xac nhan `admin-config`, `payos-create`, `remind-debt`, `zalo-auth` deu ACTIVE.

Rui ro / gioi han con lai:

- Chua smoke `/console/config` bang owner production that vi can session owner trong browser.
- Plan limits da luu DB va AI quota da co runtime consumer trong AI shared helper; free/premium group/member limits can tiep tuc noi vao cac flow tao group/member neu muon enforcement hoan toan qua DB.
- `operation_limits.redeem_duration_days` va `redeem_max_uses` hien la config van hanh/admin default, chua ep vao UI redeem creation neu form admin van dung gia tri local.
- `current_maintenance_banner()` da public nhung chi hien banner, khong khoa thao tac app; neu can maintenance mode hard-stop thi can phase rieng.
- `deno check` khong chay duoc tren may nay vi Deno chua cai; Supabase deploy function la validation Edge Function chinh.

NHAC CHU DU AN KHI CAN LAM PRODUCTION SMOKE:

- Dang nhap owner production, mo `/console/config`, tat/bat mot flag it rui ro nhu `zalo_login` trong khung test, nhap reason + confirm, xac nhan audit log co row `config.flags.save`.
- Bat maintenance banner voi message ngan, reload app user, xac nhan banner hien dung va tat lai ngay sau smoke.
- Kiem tra user thuong vao `/console/config` van redirect ve home va khong thay wording admin.
- Khi thay doi payment/redeem/AI production, luon nhap reason ro rang vi action co tac dung ngay.

## Phase 11: Release Notes / In-App Announcement

Muc tieu: viet thong bao cap nhat va day vao app.

MVP:

- Draft release note.
- Preview in-app announcement.
- Publish/cancel.
- Gan release note voi notification campaign neu can.
- Luu lich su publish.

Acceptance criteria:

- User nhan duoc announcement theo kenh da chon.
- Publish action co audit va delivery log neu co notification.

### Ket Qua Phase 11 - 2026-06-10

Da lam:

- Tao client helper `src/lib/adminReleases.ts` va test `src/lib/adminReleases.test.ts` de doc snapshot, luu draft, publish va cancel qua Edge Function `admin-releases`.
- Tao UI `/console/releases` trong `src/features/admin/ConsoleReleasesPage.tsx` va test `src/features/admin/ConsoleReleasesPage.test.tsx`.
- Wire module release vao `src/features/admin/ConsolePages.tsx`, cap nhat console home copy sang Phase 11.
- UI co draft editor, audience `all/free/premium`, in-app preview, history list, recent audit, reason audit, confirm truoc publish/cancel.
- Tao migration `supabase/migrations/0030_admin_release_notes.sql` voi bang `release_notes`, status `draft/published/cancelled`, audience, link `notification_id`.
- Tao Edge Function `supabase/functions/admin-releases/index.ts` voi action `snapshot`, `save_draft`, `publish`, `cancel`.
- `admin-releases` dung JWT + server-side `admin_users`; role `owner`/`operator` duoc thao tac; moi write action ghi `admin_audit_logs`.
- Publish release note tao `system_notifications`, `notification_jobs`, va `notification_deliveries` channel `in_app`, nen user thay announcement trong tab He thong cua `/notifications`.
- Cap nhat `supabase/config.toml` cho `admin-releases` verify JWT.

Supabase da day/deploy:

- `0030_admin_release_notes.sql` da apply tren remote DB.
- `admin-releases` ACTIVE version 1 tren project `trzkvnxqnveqkhejfher`.
- `supabase db push --dry-run --yes` sau push bao `Remote database is up to date`.

Verify da chay trong Phase 11:

- `npm test -- src/lib/adminReleases.test.ts src/features/admin/ConsoleReleasesPage.test.tsx` pass: 2 files, 2 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 31 files, 60 tests.
- `npm run build` pass; Vite van canh bao chunk lon >500 kB.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass truoc push, pending dung `0030_admin_release_notes.sql`.
- `supabase functions list` xac nhan `admin-releases` ACTIVE.

Rui ro / gioi han con lai:

- Chua smoke `/console/releases` bang owner production that vi can session owner trong browser.
- MVP publish chi gui in-app announcement; web push/email cho release note co the lam sau bang cach noi them channel hoac dung module Notifications/Email.
- Published release note khong cho cancel trong MVP de tranh xoa/huy announcement da giao; neu can retract announcement thi can rule va audit rieng.
- `deno check` khong chay duoc tren may nay vi Deno chua cai; Supabase deploy function la validation Edge Function chinh.

NHAC CHU DU AN KHI CAN LAM PRODUCTION SMOKE:

- Dang nhap owner production, mo `/console/releases`, tao draft release note target `free` hoac user tap test neu sau nay them target user.
- Publish mot release note noi dung test ngan, xac nhan user thay trong `/notifications` tab He thong.
- Kiem tra `/console/audit` co action `release.draft.save` va `release.publish`; notification delivery log co campaign tu release.
- Xac nhan user thuong vao `/console/releases` van redirect ve home va khong thay wording admin.

## Phase 12: Data Quality / Cleanup Tools

Muc tieu: phat hien du lieu bat thuong, cleanup chi sau khi co rule ro.

Scanner MVP:

- Group khong owner.
- Expense thieu payer/participant.
- Subscription het han nhung premium van active.
- Payment order pending qua lau.
- Redeem `used_count` lech voi `redemption_uses`.
- Push subscription invalid rate cao.

Cleanup de sau:

- Preview affected rows.
- Confirm 2 buoc.
- Dry-run.
- Audit log success/failed.

Acceptance criteria:

- Scanner read-only chay duoc.
- Khong cleanup tu dong khi chua duoc chot rule.

### Ket qua Phase 12 - 2026-06-11

- Da them helper `src/lib/adminDataQuality.ts` + test.
- Da them page `src/features/admin/ConsoleDataQualityPage.tsx` + test va noi route trong `src/features/admin/ConsolePages.tsx`.
- Da them migration `supabase/migrations/0031_admin_data_quality.sql` de luu scan metadata/issue history.
- Da them Edge Function `supabase/functions/admin-data-quality/index.ts` va khai bao trong `supabase/config.toml`.
- Da push Supabase migration va deploy function thanh cong, `admin-data-quality` ACTIVE version 1.
- Scanner MVP hien tai quet: group khong owner, expense thieu payer/participant, subscription active het han, payment pending qua 24h, redeem used_count lech, web push failure rate cao.
- Cleanup van khoa; chua co action sua/xoa du lieu nghiep vu trong Phase 12.
- Verify da chay: `npm test -- src/lib/adminDataQuality.test.ts src/features/admin/ConsoleDataQualityPage.test.tsx`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `git diff --check`, `supabase db push --dry-run --yes`, `supabase db push --yes`, `supabase functions deploy admin-data-quality`, `supabase functions list`.
- Smoke local da xac nhan `/console/data-quality` redirect ve home khi khong co admin session.

## Phase 13: Polish Desktop/Tablet/Mobile Admin

Muc tieu: admin uu tien desktop/tablet nhung mobile van doc/duyet duoc.

Checklist:

- Desktop dashboard density tot, khong card long nhau.
- Sidebar/module grouping ro rang.
- Table co filter/search/sort/detail drawer.
- Mobile: action nguy hiem co confirm ro, khong bi overflow text.
- Loading/empty/error state ben vung.
- UI light, gan Splitz, chuyen nghiep van hanh.

### Ket qua Phase 13 - 2026-06-11

- Da polish `src/features/admin/ConsoleShell.tsx`: desktop giu grouped sidebar, mobile doi sang module rail cuon ngang gon hon, header hien current group/Phase 13, quick module actions theo group hien tai.
- Da cap nhat `src/components/ui.tsx`: `Card` co `min-w-0` de giam overflow trong grid; `Segmented` co horizontal scroll/no-scrollbar + `min-w-fit` de label dai khong bi bop mat tren mobile.
- Da cap nhat `src/features/admin/ConsoleGate.tsx`: loading state trung tinh, khong lo chu console/admin cho user thuong trong luc check quyen.
- Da cap nhat copy home console trong `src/features/admin/ConsolePages.tsx` de phan anh Phase 12 Data Quality va Phase 13 polish.
- Da them `src/features/admin/ConsoleShell.test.tsx` va bo sung test trong `src/features/admin/ConsoleGate.test.tsx` cho mobile module rail + loading neutral.
- Khong tao Supabase migration/function moi trong Phase 13; `supabase db push --dry-run --yes` bao remote database up to date.

Verify da chay trong Phase 13:

- `npm test -- src/features/admin/ConsoleShell.test.tsx src/features/admin/ConsoleDataQualityPage.test.tsx src/features/admin/ConsoleBillingPage.test.tsx src/features/admin/ConsoleNotificationsPage.test.tsx` pass.
- `npm test -- src/features/admin/ConsoleGate.test.tsx src/features/admin/ConsoleShell.test.tsx src/features/admin/ConsoleDataQualityPage.test.tsx` pass.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 34 files, 64 tests.
- `npm run build` pass; Vite van canh bao chunk lon >500 kB.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass: remote database is up to date.
- Browser smoke local `/console/data-quality` khi khong co admin session redirect ve `/`, snapshot khong co wording console/admin.

Rui ro / gioi han con lai:

- Chua smoke visual bang owner production that vi can session admin trong browser. Nen lam o Phase 14/handoff.
- Chua tach code-splitting cho console nen build van co canh bao chunk lon; dua vao Phase 14 neu can giam bundle.

### Backfill Sau Phase 13 - 2026-06-11

Da lam:

- Bo sung standalone page `src/features/admin/ConsoleJobsPage.tsx` cho route `/console/jobs`, dung snapshot san co tu Edge Function `admin-health` qua helper `getAdminHealthSnapshot`.
- Noi route/module trong `src/features/admin/ConsolePages.tsx` va cap nhat copy `src/features/admin/consoleModules.ts` de Job Monitor khong con roi vao placeholder.
- UI job monitor co summary queued/running/failed/checked, filter status, list job, detail panel, result summary JSON va canh bao retry/cancel dang khoa.
- Them test `src/features/admin/ConsoleJobsPage.test.tsx` xac nhan job data render va retry/cancel van bi khoa.
- Khong tao Supabase migration/function moi; `supabase db push --dry-run --yes` bao remote database is up to date.

Verify da chay trong backfill:

- `npm test -- src/features/admin/ConsoleJobsPage.test.tsx src/features/admin/ConsoleShell.test.tsx src/features/admin/ConsoleGate.test.tsx src/lib/adminHealth.test.ts` pass: 4 files, 7 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 35 files, 65 tests.
- `npm run build` pass; Vite van canh bao chunk lon >500 kB.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass: remote database is up to date.
- Browser smoke local `/console/jobs` khi khong co admin session redirect ve `/`, snapshot khong co wording console/admin/job monitor.

Rui ro / gioi han con lai:

- Retry/cancel/pause job van khoa co chu y; chi mo sau khi co rule, preview tac dong, confirm va audit rieng.
- Chua smoke `/console/jobs` bang owner production that vi can session admin trong browser. Dua vao Phase 14/handoff.

## Phase 14: Hardening + QA + Deploy Handoff

Checklist bat buoc:

- User thuong khong vao duoc `/console`.
- Console khong xuat hien trong nav/sitemap/public copy.
- Admin role/RLS/RPC/Edge Function guard hoat dong.
- Audit log co du cho action MVP.
- Khong service role key/API key/private key trong client bundle.
- Redeem race condition an toan.
- Push/email co retry/error state.
- Approval mode dung cho action nguy hiem.
- `npm test`.
- `npm run typecheck`.
- `npm run build`.
- `npm run lint` khong error.
- Supabase `db push --dry-run` sach sau migration.
- Smoke local va production neu co the.
- Cap nhat file nay sau moi phase: files changed, commands, migrations/functions, risk con lai.

### Ket qua Phase 14 - 2026-06-11

Da lam:

- Tach lazy route cho `/console/*`: `src/main.tsx` khong con import eager toan bo console pages/modules.
- Them `src/features/admin/LazyConsoleRoot.tsx` va `src/features/admin/ConsoleRoot.tsx` de admin console load rieng sau khi vao route console.
- Them fallback trung tinh `src/components/SplitzRouteLoading.tsx`, khong co wording console/admin trong luc lazy-load.
- Them `src/features/admin/ConsoleRoot.test.tsx` de verify nested route `/console/jobs` van render dung sau khi chuyen sang lazy root.
- Cap nhat `src/features/admin/ConsoleShell.tsx` va `src/features/admin/ConsolePages.tsx` sang nhan Phase 14 QA / Job Monitor.
- Build sau hardening tach duoc chunk admin rieng `ConsoleRoot-*.js` khoang 225 kB / gzip 43 kB; main entry khong con chua copy admin nhu `Job monitor`, `Retry/cancel`, `admin-ai`, `admin-billing`, `admin-config`.
- Scan bundle client khong thay secret env names: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `VAPID_PRIVATE_KEY`.
- Scan repo chi thay secret names o Edge Functions doc/env reads va comment huong dan `supabase secrets set ...`; khong thay gia tri key that.
- Khong tao Supabase migration/function moi; khong push Supabase that trong Phase 14.

File chinh da thay doi:

- `src/main.tsx`
- `src/components/SplitzRouteLoading.tsx`
- `src/features/admin/LazyConsoleRoot.tsx`
- `src/features/admin/ConsoleRoot.tsx`
- `src/features/admin/ConsoleRoot.test.tsx`
- `src/features/admin/ConsoleShell.tsx`
- `src/features/admin/ConsoleShell.test.tsx`
- `src/features/admin/ConsolePages.tsx`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 14:

- `npm test -- src/features/admin/ConsoleRoot.test.tsx src/features/admin/ConsoleShell.test.tsx src/features/admin/ConsoleGate.test.tsx src/features/admin/ConsoleJobsPage.test.tsx` pass: 4 files, 6 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo, khong them warning moi.
- `npm test` pass: 36 files, 66 tests.
- `npm run build` pass; build van canh bao main chunk lon >500 kB, nhung console admin da tach thanh chunk rieng.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass: remote database is up to date.
- Dist scan: main entry khong chua copy module admin; dist khong chua secret env names server-side.
- Browser smoke local `/`: khong co wording `console`, `admin`, `Job monitor`, `Phase 14`.
- Browser smoke local `/console/jobs` khi khong co admin session redirect ve `/`, khong co wording `console`, `admin`, `Job monitor`, `Retry/cancel`, `Phase 14`.

Rui ro / gioi han con lai:

- Chua smoke production bang owner session that vi can login owner trong browser. Nen lam truoc khi coi admin console production-ready hoan toan.
- Main app entry van lon khoang 1.2 MB / gzip 370 kB, du da tach console chunk; backlog tiep theo nen code-split cac route/user features nang neu can toi uu performance.
- Lint con 29 warning cu cua repo ve React Fast Refresh va setState trong effect; khong phai warning moi cua Phase 14.
- Deno local khong co, nen Edge Function validation trong cac phase truoc dua vao Supabase deploy/list; Phase 14 khong deploy function moi.

NHAC CHU DU AN KHI CAN PRODUCTION SMOKE:

- Dang nhap owner `<owner-email>`, mo `/console`, `/console/jobs`, `/console/health`, `/console/audit`, xac nhan vao duoc va khong co console error.
- Dung mot tai khoan user thuong hoac tab an danh dang nhap user thuong, mo `/console/jobs`, xac nhan redirect ve home va khong thay wording admin.
- Kiem tra Cloudflare deploy sau khi user push GitHub: build pass, asset co chunk `ConsoleRoot-*.js`, app user chay binh thuong, console route chi load sau khi vao `/console`.
- Neu can hardening tiep, uu tien code-split main app entry va lam production owner smoke co anh/chung cu.

### Hotfix Health Check / Redeem Generator - 2026-06-11

Loi tren production:

- `/console/health` hien card `Recent errors` failed voi action `redeem.create` va message `function gen_random_bytes(integer) does not exist`.

Root cause:

- `public.generate_admin_redeem_code(...)` trong migration `0022_admin_redeem_manager.sql` dung `gen_random_bytes(6)`, nhung remote Postgres hien khong co function signature nay.
- `admin-health` cung dang lay failed audit/job moi nhat khong co cua so thoi gian, nen loi cu co the tiep tuc keo card `Recent errors` xuong failed du health check sau do thanh cong.

Da lam:

- Them migration `supabase/migrations/0032_fix_admin_redeem_code_generator.sql` de replace `public.generate_admin_redeem_code(...)`, chuyen sang sinh suffix tu `gen_random_uuid()`.
- Deploy migration `0032` len remote Supabase thanh cong.
- Query remote bang `supabase db query --linked "select public.generate_admin_redeem_code('HEALTH') as generated_code;"` tra ve code mau `HEALTH-...`, xac nhan khong con loi generator.
- Cap nhat `supabase/functions/admin-health/index.ts`: failed audit/job trong `Recent errors` chi tinh trong cua so 6 gio gan nhat bang `errorWindowCutoff`; `Recent jobs` chi failed neu job failed nam trong cua so nay.
- Deploy lai Edge Function `admin-health`; function ACTIVE version 2 tren project `trzkvnxqnveqkhejfher`.
- Them regression tests `src/lib/adminRedeemMigration.test.ts` va `src/lib/adminHealthFunction.test.ts`.

Verify da chay:

- `npm test -- src/lib/adminHealthFunction.test.ts src/lib/adminRedeemMigration.test.ts src/lib/adminRedeem.test.ts src/lib/adminHealth.test.ts` pass: 4 files, 8 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm run build` pass; Vite van canh bao main chunk lon >500 kB.
- `npm test` pass: 38 files, 68 tests.
- `git diff --check` pass.
- `supabase db push --dry-run --yes` pass: remote database is up to date.
- `supabase functions list` xac nhan `admin-health` ACTIVE version 2, updated `2026-06-11 02:23:28 UTC`.

Rui ro / luu y:

- Lich su failed audit cu van con trong `/console/audit`, dung nhu audit log; health check chi khong dung loi cu do de bao failed sau khi qua cua so 6 gio.
- Neu vua co failed action moi trong 6 gio gan nhat, card `Recent errors` van se failed de bao dung tinh trang van hanh.

## Phase 15: No-code Console Home + Terminology Pass

Muc tieu: giam do phuc tap cho nguoi van hanh khong code bang cach doi `/console` tu module-first sang task-first cockpit.

Design direction:

- Ten huong: No-code Operations Cockpit.
- Tone: sang, gon, chuyen nghiep, it thuat ngu ky thuat.
- Layout: mo dau bang `Hom nay`, sau do la `Can xu ly truoc`, `Viec nhanh`, `Suc khoe nhanh`, va `Nang cao`.
- Mau/surface: giu phong cach Splitz light/blue/glass nhung giam cam giac dashboard ky thuat.
- Signature differentiator: Action Center theo tac vu, dua module nang vao lop `Nang cao`.

Da lam:

- Doi `ConsoleHomePage` thanh cockpit task-first: viec can xem truoc, viec nhanh, suc khoe nhanh, va module nang cao theo nhom.
- Them quick actions no-code: tao ma Premium, gui thong bao, kiem tra user, bat banner bao tri, soan thong bao phien ban, gui email test.
- Them entry `Hom nay` vao desktop sidebar va mobile rail trong `ConsoleShell`.
- Cap nhat header shell sang Phase 15 va copy home no-code.
- Terminology pass cho nhan module: `Job monitor` -> `Lich chay`, `Redeem code` -> `Ma Premium`, `AI operations` -> `Dieu hanh AI`, `System config` -> `Cai dat he thong`, `Data quality` -> `Kiem tra du lieu`, `Audit log` -> `Lich su thao tac`, va cac nhan Billing/Support/Release than thien hon.
- Cap nhat tieu de cac trang module tuong ung de khong lech copy voi sidebar.
- Them `src/features/admin/ConsoleHomePage.test.tsx` de khoa hanh vi home task-first va vung `Nang cao`.
- Khong tao migration/function moi; khong can push Supabase trong Phase 15.

File chinh da thay doi:

- `src/features/admin/ConsolePages.tsx`
- `src/features/admin/ConsoleShell.tsx`
- `src/features/admin/consoleModules.ts`
- `src/features/admin/ConsoleHomePage.test.tsx`
- `src/features/admin/ConsoleShell.test.tsx`
- `src/features/admin/ConsoleRoot.test.tsx`
- `src/features/admin/ConsoleAiPage.test.tsx`
- `src/features/admin/ConsoleConfigPage.test.tsx`
- `src/features/admin/ConsoleDataQualityPage.test.tsx`
- `src/features/admin/ConsoleJobsPage.test.tsx`
- `src/features/admin/ConsoleRedeemPage.test.tsx`

Verify da chay trong Phase 15:

- `npm test -- src/features/admin/ConsoleHomePage.test.tsx src/features/admin/ConsoleShell.test.tsx` pass: 2 files, 2 tests.
- `npm test -- src/features/admin` pass: 16 files, 18 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 39 files, 69 tests.
- `npm run build` pass; Vite van canh bao main chunk lon >500 kB, console chunk rieng khoang 230.75 kB / gzip 44.31 kB.
- `git diff --check` pass.
- Browser smoke local `/console`: khi khong co admin session redirect ve `/`, khong hien wording console/admin.

Rui ro / gioi han con lai:

- Chua smoke visual `/console` bang owner session that vi can dang nhap owner `<owner-email>` trong browser.
- Phase 15 chua lam guided wizard that cho tung tac vu; moi chi dua vao entry point task-first. Nen dua vao Phase 16 neu tiep tuc no-code UX.
- Mot so label trong form/detail van con tieng Anh nghiep vu nhu `Queued`, `Provider`, `Active`; nen lam tiep trong Phase 19 copy polish neu muon no-code hoa sau hon.

NHAC CHU DU AN KHI CAN LAM TIEP:

- Phase 16 da lam Guided Task Flows cho cac viec hay dung: tao ma Premium, gui thong bao, bat banner bao tri, kiem tra user.
- Phase 17 da lam Smart Issue Center gom health/jobs/data-quality/audit vao mot danh sach uu tien.
- Phase 19 nen lam copy polish sau cung de Viet hoa va giai thich tac dong cho cac action nguy hiem.

## Phase 16: Guided Task Flows

Muc tieu: bien cac viec nhanh tren `/console` thanh luong thao tac co huong dan, giup nguoi van hanh no-code biet can chuan bi gi, lam theo buoc nao, va khi nao moi mo module that.

Design direction:

- Tiep tuc huong No-code Operations Cockpit cua Phase 15.
- Signature differentiator: Guided Action Panel, chon tac vu ben trai va xem checklist/steps/CTA ben phai.
- Khong tu dong chay side effect; panel chi huong dan va dua den module co guard/confirm/audit rieng.

Da lam:

- Doi quick actions tren `ConsoleHomePage` tu link truc tiep sang task selector co `aria-pressed`.
- Them guided panel `Quy trinh duoc huong dan` cho 6 tac vu: tao ma Premium, gui thong bao he thong, kiem tra user, bat banner bao tri, soan thong bao phien ban, gui email test.
- Moi flow co `Truoc khi lam`, `Cac buoc`, note nhac truoc khi mo man, va CTA mo dung module.
- Cap nhat badge home/shell sang Phase 16.
- Them test tuong tac cho guided task: click `Tao ma Premium` phai hien checklist va link `/console/redeem`.
- Khong tao migration/function moi; khong can push Supabase trong Phase 16.

File chinh da thay doi:

- `src/features/admin/ConsolePages.tsx`
- `src/features/admin/ConsoleShell.tsx`
- `src/features/admin/ConsoleHomePage.test.tsx`
- `src/features/admin/ConsoleShell.test.tsx`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 16:

- `npm test -- src/features/admin/ConsoleHomePage.test.tsx` pass: 1 file, 2 tests.
- `npm test -- src/features/admin` pass: 16 files, 19 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 39 files, 70 tests.
- `npm run build` pass; Vite van canh bao main chunk lon >500 kB, console chunk rieng khoang 235.56 kB / gzip 45.27 kB.
- `git diff --check` pass.
- Browser smoke local `/console`: khi khong co admin session redirect ve `/`, khong hien console.

Rui ro / gioi han con lai:

- Chua smoke visual guided panel bang owner session that vi can dang nhap owner `<owner-email>` trong browser.
- Flow hien la huong dan + handoff vao module, chua phai wizard ghi du lieu truc tiep. Neu muon thao tac no-code end-to-end thi can phase rieng cho tung module va van phai giu audit/confirm.
- Phase 17 nen gom health/jobs/data-quality/audit thanh Smart Issue Center de nguoi van hanh thay viec can lam theo muc uu tien thay vi tu doc tung module.

## Phase 17: Smart Issue Center

Muc tieu: gom cac diem can xem truoc tu health/jobs/data-quality/audit thanh mot danh sach uu tien tren `/console`, de nguoi van hanh no-code biet nen mo dau tien o dau va xu ly theo thu tu nao.

Design direction:

- Tiep tuc No-code Operations Cockpit.
- Signature differentiator: Smart Issue Center, sap xep theo muc uu tien va dua ra next step ro rang.
- Frontend-only trong phase nay: khong goi `admin-health`/`admin-data-quality` tu home de tranh tao audit/job/scan ngam.
- Moi CTA chi dieu huong den module co guard/confirm/audit rieng; khong chay action ngam.

Da lam:

- Doi khu `Can xu ly truoc` thanh `Trung tam uu tien` tren `ConsoleHomePage`.
- Them 4 issue handoff theo priority: kiem tra suc khoe he thong, xem lich chay bi loi, kiem tra du lieu bat thuong, xem lai thao tac admin.
- Moi issue co priority badge, module badge, dau hieu can xem, goi y cach xu ly va CTA mo dung module.
- Them copy `Khong chay scan ngam` de lam ro home khong tu dong goi health/data-quality scan.
- Cap nhat badge home/shell sang Phase 17.
- Them test cho Smart Issue Center: phai hien priority, copy no-code, va link dung `/console/health`, `/console/jobs`, `/console/data-quality`.
- Khong tao migration/function moi; khong can push Supabase trong Phase 17.

File chinh da thay doi:

- `src/features/admin/ConsolePages.tsx`
- `src/features/admin/ConsoleShell.tsx`
- `src/features/admin/ConsoleHomePage.test.tsx`
- `src/features/admin/ConsoleShell.test.tsx`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 17:

- `npm test -- src/features/admin/ConsoleHomePage.test.tsx` pass: 1 file, 3 tests.
- `npm test -- src/features/admin` pass: 16 files, 20 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 39 files, 71 tests.
- `npm run build` pass; Vite van canh bao main chunk lon >500 kB, console chunk rieng khoang 237.66 kB / gzip 46.01 kB.
- `git diff --check` pass.
- Browser smoke local `/console`: khi khong co admin session redirect ve `/`, khong hien console.

Rui ro / gioi han con lai:

- Smart Issue Center hien la priority handoff tinh, chua doc snapshot that de sap xep dong theo failed/critical hien tai. Neu muon realtime issue center, can thiet ke read-only API/cache de khong tao audit/scan moi moi lan mo home.
- Chua smoke visual `/console` bang owner session that vi can dang nhap owner `<owner-email>` trong browser.

## Phase 18: Advanced Mode Gate

Muc tieu: giu console home gon cho nguoi van hanh no-code bang cach khong show module directory day du mac dinh; cac module sau chi hien sau khi admin chu dong mo `Che do nang cao`.

Design direction:

- Tiep tuc No-code Operations Cockpit.
- Signature differentiator: Advanced Mode Gate, mot lop dong/mo ro rang truoc khi vao module directory.
- Mac dinh uu tien Smart Issue Center + Guided Task Flows; module directory chi la lop sau.
- Khong doi route, khong khoa direct link module, khong tao backend call hay side effect.

Da lam:

- Doi khu `Nang cao` tren `ConsoleHomePage` thanh gate dong/mo bang nut `Mo che do nang cao` / `An che do nang cao`.
- Mac dinh chi hien trang thai `Che do nang cao dang tat`, khong render `12 module` va module directory.
- Khi mo, hien `Che do nang cao dang bat`, canh bao `Chi dung khi can di sau`, badge `12 module`, va danh sach module theo nhom.
- Cap nhat badge home/shell sang Phase 18.
- Them test dam bao module directory bi an mac dinh va chi hien sau toggle.
- Khong tao migration/function moi; khong can push Supabase trong Phase 18.

File chinh da thay doi:

- `src/features/admin/ConsolePages.tsx`
- `src/features/admin/ConsoleHomePage.test.tsx`
- `src/features/admin/ConsoleShell.tsx`
- `src/features/admin/ConsoleShell.test.tsx`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 18:

- `npm test -- src/features/admin/ConsoleHomePage.test.tsx` pass: 1 file, 4 tests.
- `npm test -- src/features/admin` pass: 16 files, 21 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 39 files, 72 tests.
- `npm run build` pass; Vite van canh bao main chunk lon >500 kB, console chunk rieng khoang 238.66 kB / gzip 46.18 kB.
- `git diff --check` pass.
- Browser smoke local `/console`: khi khong co admin session redirect ve `/`, khong hien console.

Rui ro / gioi han con lai:

- Desktop sidebar van hien module list cho admin da vao console; Phase 18 chi gate module directory trong home. Neu muon giam phuc tap hon nua, co the them basic/advanced rail cho sidebar o phase sau.
- Chua smoke visual `/console` bang owner session that vi can dang nhap owner `<owner-email>` trong browser.

## Phase 19: Copy Polish / Terminology Pass

Muc tieu: lam console de doc hon cho nguoi van hanh no-code bang cach giam nhan tieng Anh/dev-heavy o cac be mat chinh, dong bo thuat ngu van hanh giua home, health/jobs, billing, support, AI, config, data quality, email va audit.

Design direction:

- Tiep tuc No-code Operations Cockpit va Advanced Mode Gate.
- Signature differentiator: ngon ngu van hanh ro rang, ngan gon, uu tien tac vu va trang thai thay vi raw engineering label.
- Giu lai ten san pham/ky thuat can nhan dien nhu Supabase, Edge Function, Resend, PayOS, OCR, JSON, Gemini, DeepSeek; khong dich den muc mat ngu can debug.
- Khong doi flow, khong tao side effect moi, khong goi backend moi.

Da lam:

- Dong bo copy Jobs/Health: `Queued/Running/Failed/Job detail/Target` thanh `Dang cho/Dang chay/That bai/Chi tiet tac vu/Doi tuong`.
- Dong bo copy Config: `Feature flags`, `Plan & limits`, `Maintenance banner`, `Disclaimer`, status badge va severity sang tieng Viet van hanh.
- Dong bo copy AI: `Provider`, `Runtime config`, `Usage`, `Feature`, status provider thanh `Nha cung cap`, `Cau hinh chay`, `Luot dung`, `Tinh nang`, `Da cau hinh/Thieu cau hinh/Loi`.
- Dong bo copy Data Quality: `Read-only scanner`, `Critical/Warning/Info`, `Target`, `Metadata` thanh `Bo quet chi doc`, `Nghiem trong/Canh bao/Thong tin`, `Doi tuong`, `Du lieu tom tat`.
- Polish console home/module directory: bullet/module summary dung ngon ngu van hanh, giam `Health cards`, `Provider checks`, `Payment orders`, `Payload summary`, `Read-only scanner` tren mat tien console.
- Polish Billing/Support/Email/Audit surface: tab, summary pill, detail label va badge trang thai chinh sang tieng Viet; giu Premium/PayOS/Resend/Template khi la ten mien san pham.
- Cap nhat test admin de chong regression copy cu: Jobs, Config, AI, Data Quality, Billing, Support va Home.
- Khong tao migration/function moi; khong can push Supabase trong Phase 19.

File chinh da thay doi:

- `src/features/admin/ConsoleJobsPage.tsx`
- `src/features/admin/ConsoleHealthPage.tsx`
- `src/features/admin/ConsoleConfigPage.tsx`
- `src/features/admin/ConsoleAiPage.tsx`
- `src/features/admin/ConsoleDataQualityPage.tsx`
- `src/features/admin/ConsoleBillingPage.tsx`
- `src/features/admin/ConsoleSupportPage.tsx`
- `src/features/admin/ConsoleEmailPage.tsx`
- `src/features/admin/ConsolePages.tsx`
- `src/features/admin/consoleModules.ts`
- `src/features/admin/*Page.test.tsx` lien quan
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 19:

- `npm test -- src/features/admin/ConsoleJobsPage.test.tsx src/features/admin/ConsoleConfigPage.test.tsx src/features/admin/ConsoleAiPage.test.tsx src/features/admin/ConsoleDataQualityPage.test.tsx` pass: 4 files, 4 tests.
- `npm test -- src/features/admin` pass: 16 files, 21 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 39 files, 72 tests.
- `npm run build` pass; Vite van canh bao main chunk lon >500 kB, console chunk rieng khoang 241.11 kB / gzip 46.60 kB.
- `git diff --check` pass.
- `npm run dev -- --host 127.0.0.1` da start local; `curl -I http://127.0.0.1:5173/console` tra HTML 200 cua SPA.

Rui ro / gioi han con lai:

- Browser smoke headless bang Google Chrome bi moi truong Chrome chan voi loi `Failed parsing extensions`; route guard van duoc bao phu boi test admin, nhung chua co visual smoke browser thanh cong trong Phase 19.
- Chua smoke visual `/console` bang owner session that vi can dang nhap owner `<owner-email>` trong browser.
- Mot so term domain nhu `Template`, `JSON`, `OCR`, `PayOS`, `Resend`, `Gemini`, `DeepSeek` co chu dich giu lai de van debug/van hanh duoc.

## Phase 20: Basic/Advanced Navigation Gate

Muc tieu: xu ly phan con do tu Phase 18 - desktop sidebar va mobile rail van show day du 12 module ngay khi admin vao console, lam nguoi van hanh no-code bi qua tai. Phase nay dua navigation ve che do gon mac dinh va chi mo module directory day du khi admin chu dong bat menu nang cao.

Design direction:

- Tiep tuc No-code Operations Cockpit.
- Signature differentiator: Basic Navigation mac dinh chi hien `Hom nay` + cac diem can xem nhieu nhat, Advanced Navigation mo bang nut rieng.
- Khong doi route, khong chan deep link module; neu admin dang o mot module khong nam trong basic list thi module hien tai van duoc chen vao nav gon de khong bi lac.
- Khong tao backend call, migration, function hay side effect moi.

Da lam:

- Them state `advancedNavOpen` vao `ConsoleShell`.
- Desktop sidebar mac dinh chi hien `Hom nay`, nut `Mo menu nang cao`, va nhom `Viec can xem`: Dashboard van hanh, Lich chay, Kiem tra du lieu, Lich su thao tac.
- Mobile rail dung cung logic basic/advanced, khong render 12 module mac dinh nua.
- Khi bam `Mo menu nang cao`, sidebar/rail hien day du 12 module theo nhom nhu truoc; bam lai `An menu nang cao` de dong.
- Cap nhat badge shell sang Phase 20.
- Them regression test dam bao `Email / Resend` bi an mac dinh va chi hien sau khi mo menu nang cao.
- Khong tao migration/function moi; khong can push Supabase trong Phase 20.

File chinh da thay doi:

- `src/features/admin/ConsoleShell.tsx`
- `src/features/admin/ConsoleShell.test.tsx`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 20:

- `npm test -- src/features/admin/ConsoleShell.test.tsx` pass: 1 file, 1 test.
- `npm test -- src/features/admin` pass: 16 files, 21 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 39 files, 72 tests.
- `npm run build` pass; Vite van canh bao main chunk lon >500 kB, console chunk rieng khoang 242.78 kB / gzip 46.81 kB.
- `npm run dev -- --host 127.0.0.1` start local; `curl -I http://127.0.0.1:5173/console/data-quality` tra HTML 200 cua SPA.

Rui ro / gioi han con lai:

- Chua smoke visual `/console` bang owner session that vi can dang nhap owner `<owner-email>` trong browser.

## Phase 21: Multi-admin Role Management UI

Muc tieu: cho phep owner quan ly quyen admin dau tien trong console, de sau mo rong thanh multi-admin ma van giu guard server-side va audit bat buoc.

Design direction:

- Tiep tuc No-code Operations Cockpit.
- Signature differentiator: quan ly admin bang profile, role, status va audit guidance, khong raw SQL.
- Mac dinh owner-only cho moi thao tac write; snapshot/search cung di qua Edge Function co guard.
- Khong render hay link noi bo trong app user; user thuong van khong thay console.

Da lam:

- Them module `Quyen admin` vao catalog va route console.
- Tao page `src/features/admin/ConsoleAdminAccessPage.tsx` voi snapshot, search profile, cap quyen, tat quyen va audit gan day.
- Them helper client `src/lib/adminAccess.ts` goi Edge Function `admin-access`.
- Tao Edge Function `supabase/functions/admin-access/index.ts` voi `verify_jwt=true`, owner-only, check `admin_users`, canh giu owner cuoi cung va ghi `admin_audit_logs`.
- Cap nhat `supabase/config.toml` cho `functions.admin-access`.
- Cap nhat console home/shell + tests de module count tu dong theo catalog va no-code wording khong lech.
- Supabase deploy da chay thanh cong: `supabase functions deploy admin-access` tren project `trzkvnxqnveqkhejfher`.

File chinh da thay doi:

- `src/features/admin/ConsoleAdminAccessPage.tsx`
- `src/features/admin/ConsoleAdminAccessPage.test.tsx`
- `src/lib/adminAccess.ts`
- `src/features/admin/consoleModules.ts`
- `src/features/admin/ConsolePages.tsx`
- `src/features/admin/ConsoleHomePage.test.tsx`
- `src/features/admin/ConsoleShell.tsx`
- `src/features/admin/ConsoleShell.test.tsx`
- `supabase/functions/admin-access/index.ts`
- `supabase/config.toml`
- `docs/CONSOLE_ADMIN_ROADMAP.md`

Verify da chay trong Phase 21:

- `npm test -- src/features/admin/ConsoleAdminAccessPage.test.tsx src/features/admin/ConsoleHomePage.test.tsx src/features/admin/ConsoleShell.test.tsx` pass: 3 files, 7 tests.
- `npm test -- src/features/admin` pass: 17 files, 23 tests.
- `npm run typecheck` pass.
- `npm run lint` pass, 0 error; con 29 warning cu cua repo.
- `npm test` pass: 40 files, 74 tests.
- `npm run build` pass; Vite van canh bao main chunk lon >500 kB, console chunk rieng khoang 256.00 kB / gzip 49.28 kB.
- `git diff --check` pass.
- `supabase functions deploy admin-access` pass.

Rui ro / gioi han con lai:

- Edge Function deploy da xong, nhung chua co browser session owner that de smoke end-to-end UI + function call trong moi truong production.
- Multi-admin nay moi chi la owner-only control surface dau tien; chua co UI phan quyen rieng theo module/action.

## Backlog Sau MVP

- Fine-grained admin permissions theo module/action.
- Full recurring notification engine.
- Bounce/webhook email analytics nang cao.
- PayOS reconciliation nang cao.
- Support write actions co rule chi tiet.
- Advanced data cleanup automation.
- Admin notes cho campaign/user/code.
- Export CSV/report cho admin.

## Thu Tu Uu Tien De Implement Khi Duoc Duyet

```text
1. Phase 0  - audit schema/routing
2. Phase 1  - /console shell + admin guard + route placeholders
3. Phase 2  - admin audit log foundation
4. Phase 3  - redeem code manager MVP
5. Phase 4  - notification center send-now + schedule MVP
6. Phase 5  - dashboard health + job monitor MVP
7. Phase 6  - AI operations/config
8. Phase 7  - Email/Resend console
9. Phase 8  - Billing/Premium console
10. Phase 9 - User/Group Support 360 read-only
11. Phase 10 - System Config + feature flags + limits + maintenance
12. Phase 11 - release notes / in-app announcement
13. Phase 12 - data quality scanner
14. Phase 13 - desktop/tablet/mobile polish
15. Phase 14 - hardening/QA/deploy handoff
16. Phase 15 - no-code console home + terminology pass
17. Phase 16 - guided task flows
18. Phase 17 - smart issue center
19. Phase 18 - advanced mode gate
20. Phase 19 - copy polish / terminology pass
21. Phase 20 - basic/advanced navigation gate
22. Phase 21 - multi-admin role management UI
```

## Quyet Dinh Da Chot Sau Phase 0

1. Seed admin dau tien bang Supabase Auth email `<owner-email>`.
2. Permission thuc te dua tren `profiles.id`/`auth.uid()` trong `admin_users`, khong hardcode email trong frontend.
3. User thuong vao `/console` se redirect ve home.
4. In-app system notification phai hien trong tab `He thong` cua man `/notifications` hien co.
5. Web push/VAPID/Edge Function production duoc user xac nhan la da du; console van can health check truoc khi gui dien rong.
6. Resend production da san sang; mail ma xac thuc gui binh thuong.
7. PayOS production da san sang; thanh toan dang hoat dong.
8. Plan/limit config se dua ra admin som thay vi giu hardcode lau.
9. User/Group Support MVP di theo huong read-only truoc; moi action ho tro se them sau khi co audit/rule.

## Cau Hoi Con Can Chot Truoc Khi Implement Sau

Hien khong con cau hoi chan Phase 1. Truoc moi phase tiep theo van can doc lai `docs/CONTEXT.md` va file nay, sau do chi chot cac chi tiet pham vi cua phase do.
