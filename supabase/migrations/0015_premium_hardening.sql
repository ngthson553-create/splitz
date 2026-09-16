-- Splitz — Slice 6 (QC fix): siết race giới hạn + thu hẹp quyền effective_plan.
--  • Trigger giới hạn nhóm/thành viên: thêm advisory lock theo owner/group để 2 insert
--    đồng thời không cùng lọt qua ngưỡng (đếm-rồi-chèn nguyên tử trong transaction).
--  • effective_plan(uid) nhận uid tuỳ ý → bỏ execute của authenticated (tránh dò gói
--    người khác). Trigger + my_plan_info là SECURITY DEFINER nên vẫn gọi được.

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
  if v_max is null then return new; end if;  -- premium: không giới hạn
  -- Khoá theo owner đến hết transaction → các insert nhóm cùng owner xếp hàng.
  perform pg_advisory_xact_lock(hashtext('splitz:group_limit'), hashtext(new.owner_id::text));
  select count(*) into v_count from public.groups where owner_id = new.owner_id;
  if v_count >= v_max then
    raise exception 'Gói Free chỉ tạo tối đa % nhóm. Nâng cấp để tạo thêm.', v_max
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

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
  -- Khoá theo nhóm đến hết transaction → các insert thành viên cùng nhóm xếp hàng.
  perform pg_advisory_xact_lock(hashtext('splitz:member_limit'), hashtext(new.group_id::text));
  select count(*) into v_count from public.group_members where group_id = new.group_id;
  if v_count >= v_max then
    raise exception 'Nhóm đã đạt giới hạn % thành viên theo gói của chủ nhóm.', v_max
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- effective_plan chỉ dùng nội bộ (trigger + my_plan_info, đều SECURITY DEFINER).
revoke execute on function public.effective_plan(uuid) from public, authenticated;
