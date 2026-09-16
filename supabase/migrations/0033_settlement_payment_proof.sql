-- Splitz — Settlement proof: luồng thanh toán khác + chứng từ trong sheet quyết toán.
--  • Thêm payment_method + metadata chứng từ vào settlements.
--  • Payer có thể gắn file chứng từ vào settlement pending qua RPC SECURITY DEFINER.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'settlements'
      and column_name = 'payment_method'
  ) then
    alter table public.settlements add column payment_method text not null default 'bank_transfer';
  end if;
end $$;

update public.settlements
set payment_method = 'bank_transfer'
where payment_method is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'settlements_payment_method_check'
  ) then
    alter table public.settlements
      add constraint settlements_payment_method_check
      check (payment_method in ('bank_transfer', 'other'));
  end if;
end $$;

alter table public.settlements add column if not exists proof_storage_path text;
alter table public.settlements add column if not exists proof_mime_type text;
alter table public.settlements add column if not exists proof_file_name text;
alter table public.settlements add column if not exists proof_size_bytes int;

create or replace function public.attach_settlement_proof(
  p_id uuid,
  p_storage_path text,
  p_mime_type text default null,
  p_file_name text default null,
  p_size_bytes int default null
)
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
  if coalesce(trim(p_storage_path), '') = '' then
    raise exception 'Thiếu chứng từ thanh toán.' using errcode = 'P0001';
  end if;

  select s.id, s.status, fm.user_id as from_user
    into v_rec
    from public.settlements s
    join public.group_members fm on fm.id = s.from_member_id
    where s.id = p_id;

  if v_rec.id is null then
    raise exception 'Quyết toán không tồn tại.' using errcode = 'P0002';
  end if;
  if v_rec.from_user is distinct from v_uid then
    raise exception 'Chỉ người trả mới gắn chứng từ cho khoản này.' using errcode = '42501';
  end if;
  if v_rec.status <> 'pending' then
    raise exception 'Chỉ gắn chứng từ khi khoản này còn chờ xác nhận.' using errcode = 'P0001';
  end if;

  update public.settlements
    set payment_method = 'other',
        proof_storage_path = p_storage_path,
        proof_mime_type = p_mime_type,
        proof_file_name = p_file_name,
        proof_size_bytes = greatest(coalesce(p_size_bytes, 0), 0)
    where id = p_id and status = 'pending';
  if not found then
    raise exception 'CONFLICT: quyết toán vừa được cập nhật.' using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.attach_settlement_proof(uuid, text, text, text, int) to authenticated;
