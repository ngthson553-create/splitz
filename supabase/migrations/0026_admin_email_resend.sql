-- Splitz Console Admin - Phase 7 Email / Resend console.
-- Email logs/templates are read and written through guarded Edge Functions only.

create table public.email_templates (
  key         text primary key,
  name        text not null,
  category    text not null check (category in ('auth','reminder','system','release')),
  subject     text not null,
  html        text not null check (length(trim(html)) > 0),
  text_body   text,
  description text not null default '',
  active      boolean not null default true,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (length(trim(key)) > 0)
);

create table public.email_delivery_logs (
  id                  uuid primary key default gen_random_uuid(),
  provider            text not null default 'resend',
  template_key        text references public.email_templates (key) on delete set null,
  to_email            text not null,
  from_email          text,
  subject             text not null,
  status              text not null check (status in ('queued','sent','failed','skipped')),
  provider_message_id text,
  payload_summary     jsonb not null default '{}'::jsonb,
  error_message       text,
  sent_by             uuid references public.profiles (id) on delete set null,
  sent_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index email_templates_category_idx on public.email_templates (category, active, updated_at desc);
create index email_delivery_logs_created_idx on public.email_delivery_logs (created_at desc);
create index email_delivery_logs_status_idx on public.email_delivery_logs (status, created_at desc);
create index email_delivery_logs_template_idx on public.email_delivery_logs (template_key, created_at desc);

alter table public.email_templates enable row level security;
alter table public.email_delivery_logs enable row level security;

revoke all on table public.email_templates from anon, authenticated;
revoke all on table public.email_delivery_logs from anon, authenticated;

grant all on table public.email_templates to service_role;
grant all on table public.email_delivery_logs to service_role;

insert into public.email_templates (key, name, category, subject, description, html, text_body)
values
  (
    'system_test',
    'System test email',
    'system',
    'Test Splitz Email',
    'Email kiem tra Resend production tu Console Admin.',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:auto;background:#ffffff;color:#0f172a">
  <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:24px 28px;border-radius:18px 18px 0 0;color:#ffffff">
    <div style="font-size:22px;font-weight:800">Splitz</div>
    <div style="font-size:13px;opacity:.9;margin-top:4px">Resend health check</div>
  </div>
  <div style="border:1px solid #e5edff;border-top:0;padding:28px;border-radius:0 0 18px 18px">
    <h1 style="margin:0 0 10px;font-size:20px;color:#0f172a">Email test thanh cong</h1>
    <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 18px">{{message}}</p>
    <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:0">Gui luc {{sentAt}} tu Splitz Console.</p>
  </div>
</div>$html$,
    'Splitz Resend health check. {{message}}'
  ),
  (
    'premium_reminder',
    'Premium reminder',
    'reminder',
    'Goi Splitz Premium cua ban sap het han',
    'Template nhac gia han Premium cho send-reminders.',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:auto;background:#ffffff;color:#0f172a">
  <div style="background:#eff6ff;padding:24px 28px;border-radius:18px 18px 0 0">
    <div style="font-size:22px;font-weight:800;color:#1d4ed8">Splitz</div>
  </div>
  <div style="border:1px solid #e5edff;border-top:0;padding:28px;border-radius:0 0 18px 18px">
    <h1 style="margin:0 0 10px;font-size:20px;color:#0f172a">Sap den han gia han</h1>
    <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 18px">Chao {{name}}, goi Premium cua ban se het han vao <b>{{periodEnd}}</b>.</p>
    <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 20px">Gia han de khong bi gian doan gioi han nhom va cac tinh nang Premium.</p>
    <a href="{{appUrl}}/settings" style="display:inline-block;background:#2563eb;color:#ffffff;padding:11px 18px;border-radius:12px;text-decoration:none;font-weight:700">Gia han ngay</a>
  </div>
</div>$html$,
    'Goi Premium cua ban se het han vao {{periodEnd}}.'
  ),
  (
    'release_note',
    'Release note',
    'release',
    'Splitz co cap nhat moi',
    'Template email thong bao cap nhat phien ban, dung sau khi Release Notes console san sang.',
    $html$<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:auto;background:#ffffff;color:#0f172a">
  <div style="background:linear-gradient(135deg,#2563eb,#0ea5e9);padding:24px 28px;border-radius:18px 18px 0 0;color:#ffffff">
    <div style="font-size:22px;font-weight:800">Splitz</div>
    <div style="font-size:13px;opacity:.9;margin-top:4px">Cap nhat san pham</div>
  </div>
  <div style="border:1px solid #e5edff;border-top:0;padding:28px;border-radius:0 0 18px 18px">
    <h1 style="margin:0 0 10px;font-size:20px;color:#0f172a">Co gi moi trong Splitz</h1>
    <p style="font-size:14px;line-height:1.7;color:#475569;margin:0 0 18px">{{message}}</p>
    <a href="{{appUrl}}/notifications" style="display:inline-block;background:#2563eb;color:#ffffff;padding:11px 18px;border-radius:12px;text-decoration:none;font-weight:700">Xem thong bao</a>
  </div>
</div>$html$,
    '{{message}}'
  )
on conflict (key) do update set
  name = excluded.name,
  category = excluded.category,
  subject = excluded.subject,
  description = excluded.description,
  html = excluded.html,
  text_body = excluded.text_body,
  updated_at = now();
