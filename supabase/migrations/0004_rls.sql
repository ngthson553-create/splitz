-- Splitz — Slice 1: Row Level Security.
-- Nguyên tắc:
--  • Đọc dữ liệu nhóm CHỈ KHI là thành viên nhóm (kể cả STK — cần để tạo QR trong nhóm).
--  • Sửa/xoá nhóm + sửa MỌI expense = chỉ owner.
--  • Member thường: thêm expense; sửa/xoá expense DO MÌNH TẠO.
--  • subscriptions/redemption: user đọc của mình; cấp/validate code qua Edge Function (service role bỏ qua RLS).
-- Helper SECURITY DEFINER để tránh đệ quy RLS (policy của group_members tự tham chiếu chính nó).

-- ── Helpers ─────────────────────────────────────────────────────────────

create or replace function public.is_group_member(gid uuid, uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = uid
  );
$$;

create or replace function public.is_group_owner(gid uuid, uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.groups g
    where g.id = gid and g.owner_id = uid
  );
$$;

-- member_id của user hiện tại trong 1 nhóm (để xác định "expense do mình tạo").
create or replace function public.my_member_id(gid uuid, uid uuid default auth.uid())
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select gm.id from public.group_members gm
  where gm.group_id = gid and gm.user_id = uid
  limit 1;
$$;

-- ── Bật RLS ─────────────────────────────────────────────────────────────

alter table public.profiles                  enable row level security;
alter table public.teams                     enable row level security;
alter table public.team_members              enable row level security;
alter table public.subscriptions             enable row level security;
alter table public.redemption_codes          enable row level security;
alter table public.redemption_uses           enable row level security;
alter table public.ai_usage                  enable row level security;
alter table public.groups                    enable row level security;
alter table public.group_members             enable row level security;
alter table public.group_invites             enable row level security;
alter table public.expenses                  enable row level security;
alter table public.expense_payers            enable row level security;
alter table public.expense_participants      enable row level security;
alter table public.expense_items             enable row level security;
alter table public.expense_item_participants enable row level security;
alter table public.settlements               enable row level security;
alter table public.activity_log              enable row level security;

-- ── profiles: tự đọc/sửa của mình ───────────────────────────────────────
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_self_insert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── subscriptions: user đọc của mình (ghi qua service role) ──────────────
create policy subscriptions_self_select on public.subscriptions
  for select using (user_id = auth.uid());

-- ── teams: chủ team + thành viên team đọc; chủ quản lý ───────────────────
create policy teams_member_select on public.teams
  for select using (
    owner_user_id = auth.uid()
    or exists (select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid())
  );
create policy teams_owner_all on public.teams
  for all using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy team_members_select on public.team_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_user_id = auth.uid())
  );

-- ── redemption: user xem lần dùng của mình (cấp/validate qua Edge Function) ─
create policy redemption_uses_self_select on public.redemption_uses
  for select using (used_by = auth.uid());

-- ── ai_usage: user xem quota của mình (ghi/đếm qua Edge Function service role) ─
create policy ai_usage_self_select on public.ai_usage
  for select using (user_id = auth.uid());

-- ── groups: thành viên đọc; owner toàn quyền; user tạo nhóm mới ──────────
create policy groups_member_select on public.groups
  for select using (public.is_group_member(id) or owner_id = auth.uid());
create policy groups_owner_insert on public.groups
  for insert with check (owner_id = auth.uid());
create policy groups_owner_update on public.groups
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy groups_owner_delete on public.groups
  for delete using (owner_id = auth.uid());

-- ── group_members: thành viên nhóm đọc (gồm STK); owner quản lý ──────────
create policy group_members_select on public.group_members
  for select using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy group_members_owner_insert on public.group_members
  for insert with check (public.is_group_owner(group_id));
create policy group_members_update on public.group_members
  -- owner sửa mọi member; user thật tự sửa STK/tên của chính mình.
  for update using (public.is_group_owner(group_id) or user_id = auth.uid())
            with check (public.is_group_owner(group_id) or user_id = auth.uid());
create policy group_members_owner_delete on public.group_members
  for delete using (public.is_group_owner(group_id));

-- ── group_invites: thành viên đọc/tạo; owner xoá ────────────────────────
create policy group_invites_select on public.group_invites
  for select using (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy group_invites_insert on public.group_invites
  for insert with check (public.is_group_member(group_id) or public.is_group_owner(group_id));
create policy group_invites_delete on public.group_invites
  for delete using (public.is_group_owner(group_id));

-- ── expenses: thành viên đọc; member thêm; owner/người tạo sửa-xoá ───────
create policy expenses_select on public.expenses
  for select using (public.is_group_member(group_id));
create policy expenses_insert on public.expenses
  for insert with check (public.is_group_member(group_id));
create policy expenses_update on public.expenses
  for update using (public.is_group_owner(group_id) or created_by = public.my_member_id(group_id))
            with check (public.is_group_owner(group_id) or created_by = public.my_member_id(group_id));
create policy expenses_delete on public.expenses
  for delete using (public.is_group_owner(group_id) or created_by = public.my_member_id(group_id));

-- ── bảng con của expense: theo quyền của expense cha ─────────────────────
-- Đọc nếu là thành viên nhóm chứa expense; ghi nếu owner hoặc người tạo expense.
create or replace function public.can_read_expense(eid uuid, uid uuid default auth.uid())
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.expenses e
    where e.id = eid and public.is_group_member(e.group_id, uid)
  );
$$;
create or replace function public.can_write_expense(eid uuid, uid uuid default auth.uid())
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.expenses e
    where e.id = eid
      and (public.is_group_owner(e.group_id, uid) or e.created_by = public.my_member_id(e.group_id, uid))
  );
$$;

create policy expense_payers_select on public.expense_payers
  for select using (public.can_read_expense(expense_id));
create policy expense_payers_write on public.expense_payers
  for all using (public.can_write_expense(expense_id)) with check (public.can_write_expense(expense_id));

create policy expense_participants_select on public.expense_participants
  for select using (public.can_read_expense(expense_id));
create policy expense_participants_write on public.expense_participants
  for all using (public.can_write_expense(expense_id)) with check (public.can_write_expense(expense_id));

create policy expense_items_select on public.expense_items
  for select using (public.can_read_expense(expense_id));
create policy expense_items_write on public.expense_items
  for all using (public.can_write_expense(expense_id)) with check (public.can_write_expense(expense_id));

create policy expense_item_participants_select on public.expense_item_participants
  for select using (exists (
    select 1 from public.expense_items it where it.id = item_id and public.can_read_expense(it.expense_id)
  ));
create policy expense_item_participants_write on public.expense_item_participants
  for all using (exists (
    select 1 from public.expense_items it where it.id = item_id and public.can_write_expense(it.expense_id)
  )) with check (exists (
    select 1 from public.expense_items it where it.id = item_id and public.can_write_expense(it.expense_id)
  ));

-- ── settlements: thành viên đọc/tạo; cập nhật trạng thái (xác nhận đôi) ──
create policy settlements_select on public.settlements
  for select using (public.is_group_member(group_id));
create policy settlements_insert on public.settlements
  for insert with check (public.is_group_member(group_id));
create policy settlements_update on public.settlements
  -- người nhận xác nhận "đã nhận", owner hoặc người tạo có thể huỷ.
  for update using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

-- ── activity_log: thành viên đọc; ghi qua thao tác (insert là thành viên) ─
create policy activity_log_select on public.activity_log
  for select using (public.is_group_member(group_id));
create policy activity_log_insert on public.activity_log
  for insert with check (public.is_group_member(group_id));
