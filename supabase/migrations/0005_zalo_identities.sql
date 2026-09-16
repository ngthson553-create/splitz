-- Splitz — Zalo login (provider tuỳ biến, Supabase không hỗ trợ sẵn).
-- Zalo KHÔNG trả email → không thể dùng Supabase Auth identity linking.
-- Ta tự quản map: zalo_id → user (auth.users). Tài khoản vẫn định danh theo EMAIL
-- (user nhập + xác thực OTP lần đầu khi đăng nhập Zalo); Zalo chỉ là cách đăng nhập thêm.
-- Ghi vào bảng này CHỈ qua Edge Function (service role, bỏ qua RLS).

create table public.zalo_identities (
  zalo_id    text primary key,                         -- id người dùng do Zalo cấp
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text,
  picture    text,
  created_at timestamptz not null default now()
);
create index zalo_identities_user_idx on public.zalo_identities (user_id);

alter table public.zalo_identities enable row level security;

-- User chỉ đọc liên kết Zalo của chính mình; mọi thao tác ghi qua Edge Function.
create policy zalo_identities_self_select on public.zalo_identities
  for select using (user_id = auth.uid());
