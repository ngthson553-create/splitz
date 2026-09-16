-- Splitz — Slice 1: trigger optimistic concurrency + tiện ích.
-- touch_row: mỗi UPDATE tự set updated_at = now() và version = version + 1.
-- Frontend gửi kèm version đang cầm khi sửa → so khớp (where version = $cũ);
-- nếu 0 row bị ảnh hưởng = có người vừa sửa → báo "tải lại", không ghi đè mù.

create or replace function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.version    := old.version + 1;
  return new;
end;
$$;

-- profiles có updated_at nhưng không có version → trigger riêng.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Bảng có version (dữ liệu nhóm, cần chống xung đột).
create trigger trg_groups_touch        before update on public.groups        for each row execute function public.touch_row();
create trigger trg_group_members_touch before update on public.group_members for each row execute function public.touch_row();
create trigger trg_expenses_touch      before update on public.expenses      for each row execute function public.touch_row();
create trigger trg_settlements_touch   before update on public.settlements   for each row execute function public.touch_row();

-- Bảng chỉ cần updated_at.
create trigger trg_profiles_touch      before update on public.profiles      for each row execute function public.touch_updated_at();
create trigger trg_teams_touch         before update on public.teams         for each row execute function public.touch_updated_at();
create trigger trg_subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();
create trigger trg_ai_usage_touch      before update on public.ai_usage      for each row execute function public.touch_updated_at();
