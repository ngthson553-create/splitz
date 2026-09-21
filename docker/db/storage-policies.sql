-- Policy SELECT cho storage.buckets khi self-host.
--
-- Image supabase/postgres dựng schema storage với RLS BẬT nhưng KHÔNG kèm
-- policy nào, còn storage-api v1.74 không tự migrate lúc boot (phiên cũ có
-- DB_INSTALL, v1.74 bỏ) → thiếu policy này thì mọi request đều NoSuchBucket.
-- Policy cho storage.objects của TỪNG bucket do migration Splitz tạo riêng
-- (0016_attachments.sql: receipts_read/insert/delete).
--
-- Chỉ chạy lần init ĐẦU (cùng cơ chế với docker/db/roles.sql).
-- Idempotent: migrations service có thể chạy lại sau restart.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and policyname = 'buckets_select_all_roles'
  ) then
    execute 'create policy buckets_select_all_roles on storage.buckets
               for select to anon, authenticated using (true)';
  end if;
end
$$;
