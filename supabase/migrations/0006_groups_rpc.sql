-- Splitz — Slice 3: nhóm + thành viên + mời (RPC + mở rộng RLS).
-- Các thao tác nhạy cảm RLS (tạo nhóm kèm owner-member, tham gia qua lời mời, claim
-- thành viên ảo) đặt trong hàm SECURITY DEFINER để atomic và không hở RLS.

-- ── Mở rộng RLS profiles: thành viên CÙNG NHÓM đọc được hồ sơ của nhau ──
-- (nợ kỹ thuật từ Slice 1/2: cần tên/avatar/STK để hiển thị + tạo QR).
create or replace function public.shares_group_with(other_user uuid, uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = uid and b.user_id = other_user
  );
$$;

drop policy if exists profiles_comember_select on public.profiles;
create policy profiles_comember_select on public.profiles
  for select using (id = auth.uid() or public.shares_group_with(id));

-- ── Tạo nhóm: insert group + owner-member (snapshot STK từ profile) ──
create or replace function public.create_group(
  p_name text,
  p_emoji text default null,
  p_currency text default 'VND'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
  v_prof record;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập.' using errcode = '28000';
  end if;

  select display_name, bank_code, bank_account_number, bank_account_name
    into v_prof from public.profiles where id = v_uid;

  insert into public.groups (owner_id, name, emoji, base_currency)
  values (v_uid, coalesce(nullif(btrim(p_name), ''), 'Nhóm mới'), p_emoji, coalesce(p_currency, 'VND'))
  returning id into v_group_id;

  insert into public.group_members
    (group_id, user_id, name, role, bank_code, bank_account_number, bank_account_name)
  values
    (v_group_id, v_uid, coalesce(v_prof.display_name, 'Tôi'), 'owner',
     v_prof.bank_code, v_prof.bank_account_number, v_prof.bank_account_name);

  return v_group_id;
end;
$$;

-- ── Tham gia nhóm qua lời mời (link/mã); hoặc claim thành viên ảo nếu invite trỏ tới ──
create or replace function public.join_group_via_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv record;
  v_prof record;
  v_existing uuid;
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập.' using errcode = '28000';
  end if;

  select * into v_inv from public.group_invites where token = p_token;
  if v_inv.id is null then
    raise exception 'Lời mời không tồn tại.' using errcode = 'P0002';
  end if;
  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    raise exception 'Lời mời đã hết hạn.' using errcode = 'P0001';
  end if;
  if v_inv.used_count >= v_inv.max_uses then
    raise exception 'Lời mời đã hết lượt dùng.' using errcode = 'P0001';
  end if;

  select display_name, bank_code, bank_account_number, bank_account_name
    into v_prof from public.profiles where id = v_uid;

  -- Đã là thành viên thật của nhóm? → trả về luôn, không thêm trùng.
  select id into v_existing from public.group_members
    where group_id = v_inv.group_id and user_id = v_uid;
  if v_existing is not null then
    return v_inv.group_id;
  end if;

  if v_inv.target_member_id is not null then
    -- Claim: gắn user vào đúng thành viên ảo (giữ tên/lịch sử của họ).
    update public.group_members
      set user_id = v_uid,
          bank_code = coalesce(bank_code, v_prof.bank_code),
          bank_account_number = coalesce(bank_account_number, v_prof.bank_account_number),
          bank_account_name = coalesce(bank_account_name, v_prof.bank_account_name)
      where id = v_inv.target_member_id
        and group_id = v_inv.group_id
        and user_id is null;
    if not found then
      raise exception 'Thành viên này đã được nhận hoặc không hợp lệ.' using errcode = 'P0001';
    end if;
  else
    insert into public.group_members
      (group_id, user_id, name, role, bank_code, bank_account_number, bank_account_name)
    values
      (v_inv.group_id, v_uid, coalesce(v_prof.display_name, 'Thành viên'), 'member',
       v_prof.bank_code, v_prof.bank_account_number, v_prof.bank_account_name);
  end if;

  update public.group_invites set used_count = used_count + 1 where id = v_inv.id;
  return v_inv.group_id;
end;
$$;

-- ── Chuyển quyền sở hữu nhóm (cần khi owner muốn rời / xoá tài khoản) ──
create or replace function public.transfer_group_ownership(p_group_id uuid, p_to_member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new_user uuid;
begin
  if not public.is_group_owner(p_group_id, v_uid) then
    raise exception 'Chỉ chủ nhóm mới chuyển quyền.' using errcode = '42501';
  end if;
  select user_id into v_new_user from public.group_members
    where id = p_to_member and group_id = p_group_id;
  if v_new_user is null then
    raise exception 'Người nhận phải là thành viên đã có tài khoản.' using errcode = 'P0001';
  end if;

  update public.groups set owner_id = v_new_user where id = p_group_id;
  update public.group_members set role = 'owner' where id = p_to_member;
  update public.group_members set role = 'member'
    where group_id = p_group_id and user_id = v_uid and id <> p_to_member;
end;
$$;

-- ── Rời nhóm (member tự rời). Owner phải chuyển quyền trước (xem transfer).
-- Lưu ý: CHẶN-KHI-CÒN-NỢ sẽ bổ sung ở Slice 5 (cần số dư từ khoản chi/quyết toán).
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập.' using errcode = '28000';
  end if;
  if public.is_group_owner(p_group_id, v_uid) then
    raise exception 'Chủ nhóm phải chuyển quyền sở hữu trước khi rời.' using errcode = 'P0001';
  end if;
  delete from public.group_members where group_id = p_group_id and user_id = v_uid;
end;
$$;

-- ── Xem trước lời mời (trước khi là thành viên — bypass RLS có kiểm soát) ──
create or replace function public.get_invite_preview(p_token text)
returns table (
  group_id uuid,
  group_name text,
  group_emoji text,
  member_count bigint,
  kind text,
  is_claim boolean,
  target_name text,
  valid boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    g.id,
    g.name,
    g.emoji,
    (select count(*) from public.group_members m where m.group_id = g.id),
    i.kind,
    i.target_member_id is not null,
    tm.name,
    (coalesce(i.expires_at, now() + interval '1 second') >= now() and i.used_count < i.max_uses)
  from public.group_invites i
  join public.groups g on g.id = i.group_id
  left join public.group_members tm on tm.id = i.target_member_id
  where i.token = p_token;
$$;

-- Cho phép client (đăng nhập) gọi các RPC trên.
grant execute on function public.create_group(text, text, text) to authenticated;
grant execute on function public.join_group_via_invite(text) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.get_invite_preview(text) to authenticated, anon;
grant execute on function public.leave_group(uuid) to authenticated;
