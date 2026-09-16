-- Splitz — Slice 1: schema chuẩn hoá (per-record, KHÔNG JSONB cục).
-- Thay thế bản aggregate JSONB ở 0001. Giai đoạn cloud bắt đầu từ tài khoản
-- mới (ROADMAP: "bỏ local, làm lại từ cloud") → không migrate dữ liệu cũ.
--
-- Nguyên tắc:
--  • Mỗi expense/member/settlement = 1 ROW riêng (lý do Hysplit cũ chết).
--  • Optimistic concurrency: cột version + updated_at (trigger ở 0003).
--  • Số dư/công nợ là DERIVED (tính lại từ expenses), KHÔNG lưu cứng.
--  • Multi-currency chuẩn bị sẵn: currency + amount_original + exchange_rate + amount_base.
--  • Tiền: numeric(18,2) — chứa cả VND nguyên lẫn ngoại tệ thập phân.

create extension if not exists "pgcrypto";

-- 0001 dùng bảng groups JSONB; thay bằng schema chuẩn hoá.
drop table if exists public.groups cascade;

-- ── Nhóm A: tài khoản & gói ─────────────────────────────────────────────

create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null unique,            -- khoá định danh (account linking theo email)
  display_name        text not null,
  avatar_url          text,
  bank_code           text,                             -- STK mặc định của user thật
  bank_account_number text,
  bank_account_name   text,
  onboarded_at        timestamptz,                      -- null = chưa qua onboarding
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  period_end    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.team_members (
  team_id    uuid not null references public.teams (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
-- Giới hạn 5 ghế enforce ở Edge Function (đếm row), không bằng constraint.

create table public.subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references public.profiles (id) on delete cascade,
  plan       text not null default 'free' check (plan in ('free','personal','team')),
  status     text not null default 'active' check (status in ('active','expired')),
  period_end timestamptz,                               -- null với free
  source     text check (source in ('payos','redemption','manual')),
  team_id    uuid references public.teams (id) on delete set null,  -- ghế từ team nào (nếu plan team)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.redemption_codes (
  code          text primary key,
  plan          text not null check (plan in ('personal','team')),
  duration_days int  not null check (duration_days > 0),
  max_uses      int  not null default 1 check (max_uses > 0),
  used_count    int  not null default 0,
  expires_at    timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.redemption_uses (
  id      uuid primary key default gen_random_uuid(),
  code    text not null references public.redemption_codes (code) on delete cascade,
  used_by uuid not null references public.profiles (id) on delete cascade,
  used_at timestamptz not null default now(),
  unique (code, used_by)
);

-- Quota tính năng AI theo user/tháng (enforce hạn mức Free, vd nhập chi tự nhiên ~15 lần/tháng).
-- period: 'YYYY-MM'. Ghi/đếm qua Edge Function (service role).
create table public.ai_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  feature    text not null,                            -- nl_expense | ocr_bill | insight
  period     text not null,                            -- 'YYYY-MM'
  count      int  not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, feature, period)
);

-- ── Nhóm B: nhóm & thành viên ───────────────────────────────────────────

create table public.groups (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles (id) on delete restrict, -- bắt chuyển quyền trước khi xoá TK
  name              text not null,
  emoji             text,
  base_currency     text not null default 'VND',        -- đồng tiền hiển thị chính của nhóm
  settlement_method text not null default 'smart_settle'
                       check (settlement_method in ('smart_settle','maximize_reduction')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  version           int not null default 1
);

create table public.group_members (
  id                  uuid primary key default gen_random_uuid(),
  group_id            uuid not null references public.groups (id) on delete cascade,
  user_id             uuid references public.profiles (id) on delete set null, -- NULL = thành viên ảo
  name                text not null,
  color               text,
  role                text not null default 'member' check (role in ('owner','member')),
  bank_code           text,                             -- ảo: người tạo nhập hộ; thật: snapshot từ profile, cho override
  bank_account_number text,
  bank_account_name   text,
  claim_token         text unique,                      -- để member ảo claim danh tính (mô hình Splitwise)
  joined_at           timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  version             int not null default 1
);
-- 1 user thật chỉ xuất hiện 1 lần / nhóm (member ảo không ràng buộc).
create unique index group_members_group_user_uidx
  on public.group_members (group_id, user_id)
  where user_id is not null;
create index group_members_group_idx on public.group_members (group_id);

create table public.group_invites (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.groups (id) on delete cascade,
  kind             text not null check (kind in ('link','code','contact')),
  token            text unique,                         -- link mời / mã nhóm
  target_member_id uuid references public.group_members (id) on delete cascade, -- mời để claim member ảo cụ thể
  email            text,
  phone            text,
  created_by       uuid references public.profiles (id) on delete set null,
  expires_at       timestamptz,
  max_uses         int not null default 1 check (max_uses > 0),
  used_count       int not null default 0,
  created_at       timestamptz not null default now()
);
create index group_invites_group_idx on public.group_invites (group_id);

-- ── Nhóm C: khoản chi (per-record) ──────────────────────────────────────

create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups (id) on delete cascade,
  title           text not null,
  note            text,
  paid_at         timestamptz not null default now(),
  split_mode      text not null check (split_mode in ('equal','shares','percent','exact','itemized')),
  category        text,                                                 -- nhãn phân loại (rule-based: Ăn uống/Đi lại...)
  currency        text not null default 'VND',
  amount_original numeric(18,2) not null check (amount_original >= 0),  -- số tiền ở đồng gốc
  exchange_rate   numeric(18,6) not null default 1,                    -- snapshot tỷ giá lúc chi
  amount_base     numeric(18,2) not null check (amount_base >= 0),     -- đã quy đổi về base_currency của nhóm
  created_by      uuid references public.group_members (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  version         int not null default 1
);
create index expenses_group_idx on public.expenses (group_id, paid_at desc);

create table public.expense_payers (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  member_id  uuid not null references public.group_members (id) on delete cascade,
  amount     numeric(18,2) not null check (amount >= 0),
  unique (expense_id, member_id)
);

create table public.expense_participants (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  member_id   uuid not null references public.group_members (id) on delete cascade,
  split_value numeric(18,4),                            -- cho shares|percent|exact; null với equal
  unique (expense_id, member_id)
);

create table public.expense_items (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  title      text not null,
  amount     numeric(18,2) not null check (amount >= 0),
  sort       int not null default 0
);

create table public.expense_item_participants (
  id        uuid primary key default gen_random_uuid(),
  item_id   uuid not null references public.expense_items (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  unique (item_id, member_id)
);

-- ── Nhóm D: quyết toán & nhật ký ────────────────────────────────────────

create table public.settlements (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references public.groups (id) on delete cascade,
  from_member_id uuid not null references public.group_members (id) on delete cascade,
  to_member_id   uuid not null references public.group_members (id) on delete cascade,
  amount         numeric(18,2) not null check (amount > 0),
  currency       text not null default 'VND',
  method         text not null default 'manual'
                    check (method in ('smart_settle','maximize_reduction','manual')),
  status         text not null default 'pending'
                    check (status in ('pending','confirmed','cancelled')), -- xác nhận đôi
  created_by     uuid references public.group_members (id) on delete set null,
  created_at     timestamptz not null default now(),
  confirmed_by   uuid references public.group_members (id) on delete set null,
  confirmed_at   timestamptz,
  version        int not null default 1,
  check (from_member_id <> to_member_id)
);
create index settlements_group_idx on public.settlements (group_id, status);

create table public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action        text not null,                          -- vd: expense.create, expense.update, member.add
  target_type   text,                                   -- expense | member | settlement | group
  target_id     uuid,
  snapshot      jsonb,                                  -- diff/snapshot cơ bản cho tab Hoạt động
  created_at    timestamptz not null default now()
);
create index activity_log_group_idx on public.activity_log (group_id, created_at desc);
