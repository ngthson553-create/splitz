-- Splitz — Slice 5: quyết toán + xác nhận đôi.
-- Ghi quyết toán CHỈ qua RPC (SECURITY DEFINER) để ép đúng danh tính:
--  • create: chỉ NGƯỜI TRẢ (from) tự ghi "tôi đã chuyển" → status 'pending'.
--  • confirm: chỉ NGƯỜI NHẬN (to) bấm "đã nhận" → 'confirmed' (chống tự đánh dấu khống).
--  • cancel: người trả/nhận/chủ nhóm huỷ một pending.
-- Khoá RLS: bỏ quyền INSERT/UPDATE trực tiếp (chỉ giữ SELECT cho thành viên) → mọi
-- thay đổi trạng thái phải qua RPC, không thể update thẳng bảng để tự xác nhận.

drop policy if exists settlements_insert on public.settlements;
drop policy if exists settlements_update on public.settlements;
-- giữ settlements_select (thành viên đọc). Xoá cứng không dùng (huỷ = status cancelled).

-- ── Tạo quyết toán (người trả ghi) ──
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

  insert into public.settlements
    (group_id, from_member_id, to_member_id, amount, method, status, created_by)
  values
    (p_group_id, p_from_member, p_to_member, p_amount, 'manual', 'pending', v_my)
  returning id into v_id;
  return v_id;
end;
$$;

-- ── Xác nhận đã nhận (chỉ người nhận) ──
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
  if v_rec.status <> 'pending' then
    raise exception 'Quyết toán không ở trạng thái chờ.' using errcode = 'P0001';
  end if;
  if v_rec.to_user is distinct from v_uid then
    raise exception 'Chỉ người nhận mới xác nhận đã nhận tiền.' using errcode = '42501';
  end if;

  update public.settlements
    set status = 'confirmed', confirmed_at = now(), confirmed_by = to_member_id
    where id = p_id;
end;
$$;

-- ── Huỷ một quyết toán đang chờ (người trả / người nhận / chủ nhóm) ──
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
  if v_rec.status <> 'pending' then
    raise exception 'Chỉ huỷ được quyết toán đang chờ.' using errcode = 'P0001';
  end if;
  if not (v_rec.from_user = v_uid or v_rec.to_user = v_uid or public.is_group_owner(v_rec.group_id, v_uid)) then
    raise exception 'Bạn không có quyền huỷ quyết toán này.' using errcode = '42501';
  end if;

  update public.settlements set status = 'cancelled' where id = p_id;
end;
$$;

grant execute on function public.create_settlement(uuid, uuid, uuid, numeric) to authenticated;
grant execute on function public.confirm_settlement(uuid) to authenticated;
grant execute on function public.cancel_settlement(uuid) to authenticated;
