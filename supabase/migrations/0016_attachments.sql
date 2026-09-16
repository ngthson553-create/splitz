-- Splitz — Slice 7: đính kèm chứng từ (ảnh + PDF) cho khoản chi.
-- Lưu file trên Supabase Storage (bucket private 'receipts', path = group_id/expense_id/uuid.ext).
-- Metadata ở bảng expense_attachments. RLS: chỉ thành viên CÙNG NHÓM đọc/đính/ xoá.

create table public.expense_attachments (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.expenses (id) on delete cascade,
  group_id     uuid not null references public.groups (id) on delete cascade,
  storage_path text not null,
  mime_type    text,
  file_name    text,
  size_bytes   int,
  uploaded_by  uuid references public.group_members (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index expense_attachments_expense_idx on public.expense_attachments (expense_id);

alter table public.expense_attachments enable row level security;

create policy attachments_select on public.expense_attachments
  for select using (public.is_group_member(group_id));
create policy attachments_insert on public.expense_attachments
  for insert with check (public.is_group_member(group_id));
create policy attachments_delete on public.expense_attachments
  for delete using (
    public.is_group_owner(group_id) or uploaded_by = public.my_member_id(group_id)
  );

-- ── Storage bucket + RLS (group_id là folder cấp 1 trong path) ──
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects
  for select using (
    bucket_id = 'receipts'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

-- Lưu ý: xoá khoản chi cascade xoá metadata; file trong Storage có thể còn lại (orphan)
-- → dọn định kỳ bằng job sau nếu cần. Chấp nhận ở giai đoạn này.
