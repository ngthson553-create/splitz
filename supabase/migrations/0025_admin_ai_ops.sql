-- Splitz Console Admin - Phase 6 AI operations/config.
-- Config is stored in DB but read/written only through guarded Edge Functions.

create table public.app_config (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  category   text not null default 'system',
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (length(trim(key)) > 0)
);

create table public.feature_flags (
  key         text primary key,
  label       text not null,
  description text not null default '',
  enabled     boolean not null default true,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  check (length(trim(key)) > 0)
);

create table public.ai_prompt_versions (
  id          uuid primary key default gen_random_uuid(),
  prompt_key  text not null check (prompt_key in ('parse_expense','ocr_receipt','insight')),
  version     int not null check (version > 0),
  title       text not null,
  prompt      text not null check (length(trim(prompt)) > 0),
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (prompt_key, version)
);

create unique index ai_prompt_versions_one_active_idx on public.ai_prompt_versions (prompt_key) where active;
create index ai_prompt_versions_key_idx on public.ai_prompt_versions (prompt_key, version desc);
create index app_config_category_idx on public.app_config (category, updated_at desc);
create index feature_flags_updated_idx on public.feature_flags (updated_at desc);

alter table public.app_config enable row level security;
alter table public.feature_flags enable row level security;
alter table public.ai_prompt_versions enable row level security;

revoke all on table public.app_config from anon, authenticated;
revoke all on table public.feature_flags from anon, authenticated;
revoke all on table public.ai_prompt_versions from anon, authenticated;

grant all on table public.app_config to service_role;
grant all on table public.feature_flags to service_role;
grant all on table public.ai_prompt_versions to service_role;

insert into public.feature_flags (key, label, description, enabled)
values
  ('ai_parse_expense', 'Nhập chi tự nhiên', 'Bật/tắt LLM parser cho khoản chi tự nhiên.', true),
  ('ai_ocr_receipt', 'OCR hoá đơn', 'Bật/tắt vision OCR để đọc hoá đơn/biên lai.', true),
  ('ai_insight', 'Insight chi tiêu', 'Bật/tắt nhận xét chi tiêu bằng AI.', true)
on conflict (key) do nothing;

insert into public.app_config (key, category, value)
values
  ('ai_provider', 'ai', '{"active":"gemini","fallback":"deepseek","gemini_model":"gemini-2.0-flash","deepseek_model":"deepseek-v4-flash"}'::jsonb),
  ('ai_quota', 'ai', '{"parse_free":15,"ocr_free":3,"insight_free":3}'::jsonb)
on conflict (key) do nothing;

insert into public.ai_prompt_versions (prompt_key, version, title, prompt, active)
values
  (
    'parse_expense',
    1,
    'Default parse expense',
    $prompt$Bạn là trợ lý bóc tách khoản chi tiêu nhóm từ câu tiếng Việt.
Danh sách thành viên trong nhóm (chỉ được chọn tên trong đây): {{memberNames}}.
Phân tích câu sau và trả về JSON đúng schema:
- title: tiêu đề ngắn gọn của khoản chi (không kèm số tiền/tên người).
- amount: số tiền QUY ĐỔI RA VND, số nguyên. "k"=nghìn, "tr"/"triệu"=triệu. Không bóc được thì 0.
- payerName: tên người TRẢ (phải khớp đúng 1 tên trong danh sách) hoặc null nếu không rõ.
- participantNames: danh sách tên người CÙNG CHIA (khớp danh sách). Không nêu rõ thì lấy tất cả thành viên.
- splitMode: "equal" trừ khi câu nói rõ chia theo phần/phần trăm/số tay/theo món.
Câu: "{{text}}"$prompt$,
    true
  ),
  (
    'ocr_receipt',
    1,
    'Default receipt OCR',
    $prompt$Đây là ảnh hoá đơn / biên lai mua hàng (thường tiếng Việt).
Trích DANH SÁCH TỪNG MÓN: mỗi món gồm tên (title) và GIÁ THÀNH TIỀN của dòng đó (amount, VND, số nguyên).
Nếu món có số lượng > 1, amount là thành tiền cả dòng (đơn giá × số lượng).
BỎ QUA các dòng tổng cộng/tạm tính/tiền khách đưa/tiền thối/điểm tích luỹ.
GIỮ các dòng phụ phí, thuế, phí dịch vụ nếu chúng là khoản tính tiền riêng.
Không đọc được giá của dòng nào thì bỏ dòng đó. Trả JSON đúng schema { items: [...] }.$prompt$,
    true
  ),
  (
    'insight',
    1,
    'Default spending insight',
    $prompt$Bạn là cố vấn chi tiêu thân thiện, nói tiếng Việt gọn gàng, tích cực, KHÔNG phán xét.
Dưới đây là SỐ LIỆU ĐÃ TÍNH SẴN (đơn vị VND) của nhóm chia tiền / bảng tổng quan.
Viết nhận xét: 1 câu "headline" tổng quát + 3 đến 5 gạch đầu dòng "points" hữu ích.
Gợi ý nội dung: nhóm/bạn chi nhiều cho LOẠI gì (tự suy luận từ tên khoản: ăn uống, đi lại, mua sắm, giải trí, hoá đơn...), ai chi nhiều nhất, xu hướng tháng này so tháng trước, vị thế nợ/được nhận của người dùng, gợi ý quyết toán nếu còn nợ.
TUYỆT ĐỐI không bịa số ngoài dữ liệu. Tiền viết gọn kiểu 450k, 1,2tr. Mỗi point ngắn (≤ 22 từ).
DỮ LIỆU JSON:
{{stats}}$prompt$,
    true
  )
on conflict (prompt_key, version) do nothing;
