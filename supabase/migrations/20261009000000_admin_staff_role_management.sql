-- HOPEBRIDGE: secure administrator-only staff role management.
-- Apply this migration in the Supabase SQL editor or through your migration workflow.
create or replace function public.admin_set_staff_role(target_user_id uuid, new_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if new_role not in ('admin', 'agent') then
    raise exception 'Invalid staff role' using errcode = '22023';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Self role changes are not allowed' using errcode = '42501';
  end if;

  update public.profiles set role = new_role where id = target_user_id;
  if not found then
    raise exception 'Staff profile not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object('success', true, 'user_id', target_user_id, 'role', new_role);
end;
$$;

revoke all on function public.admin_set_staff_role(uuid, text) from public;
grant execute on function public.admin_set_staff_role(uuid, text) to authenticated;
