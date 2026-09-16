-- Splitz — Slice 3 (QC fix): atomic hoá lượt dùng lời mời.
-- Trước: kiểm `used_count >= max_uses` rồi mới `+1` ở cuối → 2 người join đồng thời
-- có thể cùng lọt, vượt max_uses. Nay tăng đếm bằng UPDATE có điều kiện
-- `used_count < max_uses` (khoá row, serial hoá); nếu 0 row → raise (toàn bộ hàm là
-- 1 transaction nên insert/claim ở trên tự rollback). Pre-check vẫn giữ cho thông báo
-- thân thiện ở trường hợp thường.
-- Dùng `create or replace` → an toàn chạy lại, không sửa file migration đã áp dụng.

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

  -- Đã là thành viên thật của nhóm? → trả về luôn, không thêm trùng (không tốn lượt).
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

  -- Tăng lượt dùng ATOMIC: chỉ thành công khi còn lượt; hết lượt → 0 row → raise →
  -- rollback luôn insert/claim ở trên (cùng 1 transaction).
  update public.group_invites
    set used_count = used_count + 1
    where id = v_inv.id and used_count < max_uses;
  if not found then
    raise exception 'Lời mời đã hết lượt dùng.' using errcode = 'P0001';
  end if;

  return v_inv.group_id;
end;
$$;

grant execute on function public.join_group_via_invite(text) to authenticated;
