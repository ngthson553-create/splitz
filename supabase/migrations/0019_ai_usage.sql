-- Splitz — Giai đoạn 3: hạn mức AI (nhập chi tự nhiên bằng LLM).
-- Tính năng "hiểu thông minh" gọi Gemini qua Edge Function `parse-expense` (giấu key,
-- kiểm soát quota). FREE = 15 lần/tháng/feature → Premium = không giới hạn.
-- Parser quy tắc (client, offline) KHÔNG động vào bảng này — luôn FREE unlimited.
--
-- Đếm theo (user, feature, tháng). `feature` để mở rộng sau: 'parse_expense' bây giờ,
-- sau thêm 'ocr_receipt', 'insight'. Ghi tăng CHỈ qua bump_ai_usage (Edge Function gọi
-- SAU khi LLM trả thành công → không trừ quota khi lỗi).

create table public.ai_usage (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  feature    text not null,
  period     text not null,                 -- 'YYYY-MM' (tháng, theo UTC)
  count      int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, period)
);

alter table public.ai_usage enable row level security;

-- User đọc usage CỦA MÌNH (để UI hiện "còn N lần tháng này").
create policy ai_usage_self_select on public.ai_usage
  for select using (user_id = auth.uid());
-- KHÔNG policy insert/update: chỉ Edge Function (service role) + hàm bump ghi.

-- Tăng đếm 1 đơn vị một cách NGUYÊN TỬ → trả về count mới. Service role gọi.
create or replace function public.bump_ai_usage(p_uid uuid, p_feature text, p_period text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.ai_usage (user_id, feature, period, count, updated_at)
  values (p_uid, p_feature, p_period, 1, now())
  on conflict (user_id, feature, period)
  do update set count = public.ai_usage.count + 1, updated_at = now()
  returning count into v_count;
  return v_count;
end;
$$;

-- Chỉ service_role (Edge Function) được gọi — client không tự tăng quota.
revoke all on function public.bump_ai_usage(uuid, text, text) from public;
grant execute on function public.bump_ai_usage(uuid, text, text) to service_role;
