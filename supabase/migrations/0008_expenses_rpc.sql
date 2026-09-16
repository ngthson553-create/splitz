-- Splitz — Slice 4: khoản chi per-record + chống xung đột (version).
-- upsert_expense ghi atomic expense + payers + participants + items trong 1 transaction,
-- KIỂM version khi sửa: nếu version client cầm != version server → raise 'CONFLICT'
-- (có người vừa sửa) → client báo "tải lại", KHÔNG ghi đè mù. Đây là điểm Hysplit cũ chết.

create or replace function public.upsert_expense(
  p_group_id      uuid,
  p_expense_id    uuid,           -- null = tạo mới
  p_title         text,
  p_note          text,
  p_paid_at       timestamptz,
  p_split_mode    text,
  p_amount        numeric,        -- VND: amount_base = amount_original = p_amount
  p_currency      text,
  p_category      text,
  p_payers        jsonb,          -- [{ "member_id": uuid, "amount": number }]
  p_participants  jsonb,          -- [{ "member_id": uuid, "split_value": number|null }]
  p_items         jsonb,          -- [{ "title": text, "amount": number, "members": [uuid,...] }]
  p_expected_version int          -- null khi tạo mới
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
  v_cur_ver   int;
  v_cur_by    uuid;
  v_item      jsonb;
  v_item_id   uuid;
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
       p_amount, 1, p_amount, p_category, v_my_member)
    returning id into v_id;
  else
    select e.version, e.created_by into v_cur_ver, v_cur_by
      from public.expenses e
      where e.id = p_expense_id and e.group_id = p_group_id;
    if not found then
      raise exception 'CONFLICT: khoản chi đã bị xoá.' using errcode = 'P0001';
    end if;
    -- Quyền: chủ nhóm sửa mọi khoản; thành viên chỉ sửa khoản DO MÌNH tạo.
    if not (public.is_group_owner(p_group_id, v_uid) or v_cur_by = v_my_member) then
      raise exception 'Bạn chỉ sửa được khoản chi do mình tạo.' using errcode = '42501';
    end if;
    -- Chống ghi đè mù: version phải khớp.
    if p_expected_version is not null and v_cur_ver <> p_expected_version then
      raise exception 'CONFLICT: khoản chi vừa được cập nhật.' using errcode = 'P0001';
    end if;

    update public.expenses set
      title = p_title,
      note = p_note,
      paid_at = coalesce(p_paid_at, paid_at),
      split_mode = p_split_mode,
      currency = coalesce(p_currency, 'VND'),
      amount_original = p_amount,
      exchange_rate = 1,
      amount_base = p_amount,
      category = p_category
      where id = p_expense_id;          -- trigger touch_row tự tăng version
    v_id := p_expense_id;

    -- Thay toàn bộ dòng con (đơn giản & nhất quán; item_participants cascade theo item).
    delete from public.expense_payers where expense_payers.expense_id = v_id;
    delete from public.expense_participants where expense_participants.expense_id = v_id;
    delete from public.expense_items where expense_items.expense_id = v_id;
  end if;

  -- Payers
  insert into public.expense_payers (expense_id, member_id, amount)
  select v_id, (e->>'member_id')::uuid, (e->>'amount')::numeric
  from jsonb_array_elements(coalesce(p_payers, '[]'::jsonb)) e;

  -- Participants
  insert into public.expense_participants (expense_id, member_id, split_value)
  select v_id, (e->>'member_id')::uuid,
         case when e->>'split_value' is null then null else (e->>'split_value')::numeric end
  from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) e;

  -- Items (+ item participants)
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
  uuid, uuid, text, text, timestamptz, text, numeric, text, text, jsonb, jsonb, jsonb, int
) to authenticated;
