-- Splitz — Slice 7: đa tiền tệ (an toàn, KHÔNG đụng engine).
-- Mỗi nhóm có đồng chính (base = VND). Khoản chi nhập bằng ngoại tệ → client snapshot
-- tỷ giá, quy đổi sang VND (amount_base). Engine vẫn chạy trên amount_base (VND nguyên).
-- Thêm 2 tham số p_amount_original + p_exchange_rate vào upsert_expense; GIỮ NGUYÊN
-- logic version-atomic (kiểm version trong WHERE) của bản QC 0009.
-- Phải DROP rồi CREATE vì đổi danh sách tham số.

drop function if exists public.upsert_expense(
  uuid, uuid, text, text, timestamptz, text, numeric, text, text, jsonb, jsonb, jsonb, int
);

create function public.upsert_expense(
  p_group_id      uuid,
  p_expense_id    uuid,
  p_title         text,
  p_note          text,
  p_paid_at       timestamptz,
  p_split_mode    text,
  p_amount        numeric,        -- amount_base (VND)
  p_currency      text,
  p_category      text,
  p_payers        jsonb,
  p_participants  jsonb,
  p_items         jsonb,
  p_expected_version int,
  p_amount_original numeric default null,  -- số tiền đồng gốc (null = bằng base)
  p_exchange_rate   numeric default 1      -- tỷ giá snapshot (gốc → base)
)
returns table (expense_id uuid, version int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_my_member uuid;
  v_id        uuid;
  v_cur_by    uuid;
  v_item      jsonb;
  v_item_id   uuid;
  v_orig      numeric := coalesce(p_amount_original, p_amount);
  v_rate      numeric := coalesce(p_exchange_rate, 1);
begin
  if v_uid is null then
    raise exception 'Chưa đăng nhập.' using errcode = '28000';
  end if;
  if not public.is_group_member(p_group_id, v_uid) then
    raise exception 'Bạn không thuộc nhóm này.' using errcode = '42501';
  end if;
  v_my_member := public.my_member_id(p_group_id, v_uid);

  if p_expense_id is null then
    insert into public.expenses
      (group_id, title, note, paid_at, split_mode, currency,
       amount_original, exchange_rate, amount_base, category, created_by)
    values
      (p_group_id, p_title, p_note, coalesce(p_paid_at, now()), p_split_mode, coalesce(p_currency, 'VND'),
       v_orig, v_rate, p_amount, p_category, v_my_member)
    returning id into v_id;
  else
    select e.created_by into v_cur_by
      from public.expenses e
      where e.id = p_expense_id and e.group_id = p_group_id;
    if not found then
      raise exception 'CONFLICT: khoản chi đã bị xoá.' using errcode = 'P0001';
    end if;
    if not (public.is_group_owner(p_group_id, v_uid) or v_cur_by = v_my_member) then
      raise exception 'Bạn chỉ sửa được khoản chi do mình tạo.' using errcode = '42501';
    end if;

    update public.expenses set
      title = p_title,
      note = p_note,
      paid_at = coalesce(p_paid_at, paid_at),
      split_mode = p_split_mode,
      currency = coalesce(p_currency, 'VND'),
      amount_original = v_orig,
      exchange_rate = v_rate,
      amount_base = p_amount,
      category = p_category
      where id = p_expense_id
        and (p_expected_version is null or version = p_expected_version);
    if not found then
      raise exception 'CONFLICT: khoản chi vừa được cập nhật.' using errcode = 'P0001';
    end if;
    v_id := p_expense_id;

    delete from public.expense_payers where expense_payers.expense_id = v_id;
    delete from public.expense_participants where expense_participants.expense_id = v_id;
    delete from public.expense_items where expense_items.expense_id = v_id;
  end if;

  insert into public.expense_payers (expense_id, member_id, amount)
  select v_id, (e->>'member_id')::uuid, (e->>'amount')::numeric
  from jsonb_array_elements(coalesce(p_payers, '[]'::jsonb)) e;

  insert into public.expense_participants (expense_id, member_id, split_value)
  select v_id, (e->>'member_id')::uuid,
         case when e->>'split_value' is null then null else (e->>'split_value')::numeric end
  from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) e;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.expense_items (expense_id, title, amount)
    values (v_id, v_item->>'title', (v_item->>'amount')::numeric)
    returning id into v_item_id;

    insert into public.expense_item_participants (item_id, member_id)
    select v_item_id, m::uuid
    from jsonb_array_elements_text(coalesce(v_item->'members', '[]'::jsonb)) m;
  end loop;

  return query
    select e.id, e.version from public.expenses e where e.id = v_id;
end;
$$;

grant execute on function public.upsert_expense(
  uuid, uuid, text, text, timestamptz, text, numeric, text, text, jsonb, jsonb, jsonb, int, numeric, numeric
) to authenticated;
