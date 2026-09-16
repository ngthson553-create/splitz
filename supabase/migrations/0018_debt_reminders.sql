-- Splitz — Giai đoạn 3: Nhắc nợ một chạm (FREE).
-- Chủ nợ bấm "Nhắc" ở tab Quyết toán → Edge Function `remind-debt` gửi Web Push tới
-- thiết bị con nợ (kênh in-app là localStorage per-device nên không đẩy chéo user được).
--
-- Bảng `debt_reminders` = NHẬT KÝ nhắc + NGUỒN CHÂN LÝ chống spam (rate-limit
-- 1 lần / 24h / khoản theo cặp group+from+to). Ghi CHỈ qua Edge Function (service role),
-- không mở policy INSERT trực tiếp — giống pattern settlements (mọi side-effect qua server).
-- Thành viên nhóm được SELECT để UI hiển thị trạng thái "đã nhắc" (cooldown).

create table public.debt_reminders (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups (id) on delete cascade,
  from_member_id uuid not null references public.group_members (id) on delete cascade, -- con nợ
  to_member_id   uuid not null references public.group_members (id) on delete cascade, -- chủ nợ (người nhắc)
  reminded_by    uuid not null references public.profiles (id) on delete cascade,      -- user bấm nhắc
  reminded_at    timestamptz not null default now(),
  check (from_member_id <> to_member_id)
);

-- Tra "lần nhắc gần nhất theo khoản" nhanh (rate-limit + hiển thị cooldown).
create index debt_reminders_pair_idx
  on public.debt_reminders (group_id, from_member_id, to_member_id, reminded_at desc);

alter table public.debt_reminders enable row level security;

-- Thành viên nhóm đọc được nhật ký nhắc của nhóm (để biết khoản nào vừa nhắc).
create policy debt_reminders_select on public.debt_reminders
  for select using (public.is_group_member(group_id));

-- KHÔNG có policy insert/update/delete: chỉ Edge Function (service role, bypass RLS) ghi.
