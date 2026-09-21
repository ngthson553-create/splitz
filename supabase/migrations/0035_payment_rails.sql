-- Splitz — payment rails theo thị trường (issue #11).
-- VietQR (VN) dùng tiếp 3 cột bank_* sẵn có; các chuẩn khác (SEPA/UPI/
-- PromptPay/Pix/handle) lưu gọn trong 2 cột mới — nullable nên bản cũ
-- không cần migrate dữ liệu.

alter table public.group_members
  add column if not exists payment_rail text,
  add column if not exists payment_data jsonb;

alter table public.profiles
  add column if not exists payment_rail text,
  add column if not exists payment_data jsonb;

comment on column public.group_members.payment_rail is
  'Phương thức nhận tiền ngoài VietQR: sepa | upi | promptpay | pix | handle';
comment on column public.group_members.payment_data is
  'Dữ liệu rail: iban/bic, vpa, proxyType/proxyValue, pixKey/city, label/value';
comment on column public.profiles.payment_rail is
  'Phương thức nhận tiền ngoài VietQR của chính user (onboarding/cài đặt)';
comment on column public.profiles.payment_data is
  'Dữ liệu rail tương ứng payment_rail';

-- RLS: cột mới hưởng theo policy sẵn có của bảng (update theo member) —
-- không cần policy thêm.
