-- Splitz Console Admin - fix redeem code generator for Postgres environments
-- where only gen_random_uuid() is available.

create or replace function public.generate_admin_redeem_code(p_prefix text default 'SPLITZ')
returns text
language plpgsql
set search_path = public
volatile
as $$
declare
  v_prefix text := upper(regexp_replace(coalesce(nullif(trim(p_prefix), ''), 'SPLITZ'), '[^a-zA-Z0-9]+', '', 'g'));
  v_code text;
begin
  if length(v_prefix) = 0 then
    v_prefix := 'SPLITZ';
  end if;
  v_prefix := left(v_prefix, 16);

  loop
    v_code := v_prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.redemption_codes rc where rc.code = v_code);
  end loop;

  return v_code;
end;
$$;
