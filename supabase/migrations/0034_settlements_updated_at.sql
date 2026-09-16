-- Splitz — settlements.updated_at
-- `public.settlements` đang dùng trigger `touch_row()` (0003) để bump `updated_at`
-- và `version` khi update, nhưng schema gốc chưa có cột `updated_at`.
-- Hệ quả: confirm/cancel settlement có thể lỗi `record "new" has no field "updated_at"`.

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'settlements'
      and column_name = 'updated_at'
  ) then
    alter table public.settlements add column updated_at timestamptz;
  end if;
end $$;

update public.settlements
set updated_at = coalesce(updated_at, confirmed_at, created_at, now())
where updated_at is null;

alter table public.settlements
  alter column updated_at set default now();

alter table public.settlements
  alter column updated_at set not null;
