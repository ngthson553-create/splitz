-- Splitz — Slice 6: gói Premium + giới hạn theo CHỦ NHÓM.
-- Giới hạn (theo gói của owner): Free = 3 nhóm, 8 thành viên/nhóm;
-- Cá nhân/Team = không giới hạn nhóm, 25 thành viên/nhóm.
-- Enforce bằng TRIGGER (bắt mọi đường ghi: RPC, save, join). Hết hạn → effective_plan
-- trả 'free' → chặn TẠO THÊM vượt giới hạn Free, KHÔNG xoá dữ liệu cũ (đúng ROADMAP).

-- ── Gói hiệu lực của 1 user (xét sub cá nhân + ghế team, có hạn) ──
create or replace function public.effective_plan(uid uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    -- 1) Gói cá nhân/team của chính user, còn hiệu lực
    (select s.plan from public.subscriptions s
       where s.user_id = uid
         and s.status = 'active'
         and s.plan in ('personal','team')
         and (s.period_end is null or s.period_end > now())
       limit 1),
    -- 2) Là ghế trong team của người khác (team còn hiệu lực) → 'team'
    (select 'team' from public.team_members tm
       join public.teams t on t.id = tm.team_id
       join public.subscriptions s on s.user_id = t.owner_user_id
       where tm.user_id = uid
         and s.plan = 'team' and s.status = 'active'
         and (s.period_end is null or s.period_end > now())
       limit 1),
    'free'
  );
$$;

create or replace function public.plan_max_groups(plan text)
returns int language sql immutable as $$
  select case when plan = 'free' then 3 else null end;  -- null = không giới hạn
$$;

create or replace function public.plan_max_members(plan text)
returns int language sql immutable as $$
  select case when plan = 'free' then 8 else 25 end;
$$;

-- ── Trigger: giới hạn số nhóm của owner (Free = 3) ──
create or replace function public.enforce_group_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int := public.plan_max_groups(public.effective_plan(new.owner_id));
  v_count int;
begin
  if v_max is null then return new; end if;  -- không giới hạn
  select count(*) into v_count from public.groups where owner_id = new.owner_id;
  if v_count >= v_max then
    raise exception 'Gói Free chỉ tạo tối đa % nhóm. Nâng cấp để tạo thêm.', v_max
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_groups_limit on public.groups;
create trigger trg_groups_limit before insert on public.groups
  for each row execute function public.enforce_group_limit();

-- ── Trigger: giới hạn số thành viên/nhóm (theo gói CHỦ NHÓM) ──
create or replace function public.enforce_member_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_max int;
  v_count int;
begin
  select owner_id into v_owner from public.groups where id = new.group_id;
  v_max := public.plan_max_members(public.effective_plan(v_owner));
  select count(*) into v_count from public.group_members where group_id = new.group_id;
  if v_count >= v_max then
    raise exception 'Nhóm đã đạt giới hạn % thành viên theo gói của chủ nhóm.', v_max
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_members_limit on public.group_members;
create trigger trg_members_limit before insert on public.group_members
  for each row execute function public.enforce_member_limit();

-- ── RPC cho frontend: thông tin gói + giới hạn + đã dùng ──
create or replace function public.my_plan_info()
returns table (
  plan text,
  status text,
  period_end timestamptz,
  source text,
  max_groups int,
  max_members int,
  group_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    public.effective_plan(auth.uid()) as plan,
    (select s.status from public.subscriptions s where s.user_id = auth.uid()),
    (select s.period_end from public.subscriptions s where s.user_id = auth.uid()),
    (select s.source from public.subscriptions s where s.user_id = auth.uid()),
    public.plan_max_groups(public.effective_plan(auth.uid())),
    public.plan_max_members(public.effective_plan(auth.uid())),
    (select count(*) from public.groups where owner_id = auth.uid());
$$;

grant execute on function public.effective_plan(uuid) to authenticated;
grant execute on function public.my_plan_info() to authenticated;
