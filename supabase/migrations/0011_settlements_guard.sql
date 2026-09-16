-- Splitz — Slice 5 (QC fix): vá race + chặn amount vô lý cho quyết toán.
--  • confirm/cancel: trước đây kiểm status bằng SELECT-rồi-UPDATE (WHERE chỉ có id) →
--    confirm và cancel chạy đồng thời có thể đè nhau (kết thúc 'confirmed' dù vừa bị huỷ).
--    Nay đưa `status = 'pending'` vào WHERE của UPDATE (khoá row, kiểm+ghi nguyên tử).
--  • create: chặn số tiền > tổng chi tiêu nhóm (cận trên rẻ, không cần engine ghép nợ
--    trong SQL; double-confirm vẫn là lớp bảo vệ chính). Vẫn cho trả từng phần.
-- create or replace → an toàn chạy lại, không sửa migration đã áp dụng.

-- ── Tạo quyết toán (người trả ghi) + chặn amount vô lý ──
create or replace function public.create_settlement(
  p_group_id   uuid,
  p_from_member uuid,
  p_to_member  uuid,
  p_amount     numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_my  uuid;
  v_to_in_group boolean;
  v_total numeric;
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập.' using errcode = '28000';
  end if;
  v_my := public.my_member_id(p_group_id, v_uid);
  if v_my is null or v_my <> p_from_member then
    raise exception 'Chỉ người trả mới ghi nhận khoản đã chuyển của mình.' using errcode = '42501';
  end if;
  if p_from_member = p_to_member then
    raise exception 'Người trả và người nhận phải khác nhau.' using errcode = 'P0001';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Số tiền không hợp lệ.' using errcode = 'P0001';
  end if;
  select exists(select 1 from public.group_members where id = p_to_member and group_id = p_group_id)
    into v_to_in_group;
  if not v_to_in_group then
    raise exception 'Người nhận không thuộc nhóm.' using errcode = 'P0001';
  end if;
  -- Cận trên hợp lý: không ai có thể nợ quá tổng chi tiêu của nhóm.
  select coalesce(sum(amount_base), 0) into v_total from public.expenses where group_id = p_group_id;
  if p_amount > v_total then
    raise exception 'Số tiền vượt tổng chi tiêu của nhóm.' using errcode = 'P0001';
  end if;

  insert into public.settlements
    (group_id, from_member_id, to_member_id, amount, method, status, created_by)
  values
    (p_group_id, p_from_member, p_to_member, p_amount, 'manual', 'pending', v_my)
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Xác nhận đã nhận (chỉ người nhận) — guard status trong UPDATE ──
create or replace function public.confirm_settlement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rec record;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập.' using errcode = '28000';
  end if;
  select s.id, s.status, s.to_member_id, tm.user_id as to_user
    into v_rec
    from public.settlements s
    join public.group_members tm on tm.id = s.to_member_id
    where s.id = p_id;
  if v_rec.id is null then
    raise exception 'Quyết toán không tồn tại.' using errcode = 'P0002';
  end if;
  if v_rec.to_user is distinct from v_uid then
    raise exception 'Chỉ người nhận mới xác nhận đã nhận tiền.' using errcode = '42501';
  end if;
  if v_rec.status <> 'pending' then
    raise exception 'Quyết toán không ở trạng thái chờ.' using errcode = 'P0001';
  end if;

  update public.settlements
    set status = 'confirmed', confirmed_at = now(), confirmed_by = to_member_id
    where id = p_id and status = 'pending';
  if not found then
    raise exception 'CONFLICT: quyết toán vừa được cập nhật.' using errcode = 'P0001';
  end if;
end;
$$;

-- ── Huỷ một quyết toán đang chờ — guard status trong UPDATE ──
create or replace function public.cancel_settlement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rec record;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập.' using errcode = '28000';
  end if;
  select s.id, s.status, s.group_id, fm.user_id as from_user, tm.user_id as to_user
    into v_rec
    from public.settlements s
    join public.group_members fm on fm.id = s.from_member_id
    join public.group_members tm on tm.id = s.to_member_id
    where s.id = p_id;
  if v_rec.id is null then
    raise exception 'Quyết toán không tồn tại.' using errcode = 'P0002';
  end if;
  if not (v_rec.from_user = v_uid or v_rec.to_user = v_uid or public.is_group_owner(v_rec.group_id, v_uid)) then
    raise exception 'Bạn không có quyền huỷ quyết toán này.' using errcode = '42501';
  end if;
  if v_rec.status <> 'pending' then
    raise exception 'Chỉ huỷ được quyết toán đang chờ.' using errcode = 'P0001';
  end if;

  update public.settlements set status = 'cancelled'
    where id = p_id and status = 'pending';
  if not found then
    raise exception 'CONFLICT: quyết toán vừa được cập nhật.' using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.create_settlement(uuid, uuid, uuid, numeric) to authenticated;
grant execute on function public.confirm_settlement(uuid) to authenticated;
grant execute on function public.cancel_settlement(uuid) to authenticated;
