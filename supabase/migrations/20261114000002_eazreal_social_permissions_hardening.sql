-- EAZREAL social permissions hardening
-- Prevent users from rewriting immutable member identity and friend-request participants.
revoke update on public.eazreal_members from authenticated;
grant update (display_name, bio) on public.eazreal_members to authenticated;

revoke update on public.eazreal_friend_requests from authenticated;
grant update (status) on public.eazreal_friend_requests to authenticated;

create or replace function public.eazreal_guard_friend_request_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.recipient_id is distinct from old.recipient_id then
    raise exception 'Friend request participants cannot be changed';
  end if;

  if old.status <> 'pending' or new.status not in ('accepted', 'declined') then
    raise exception 'Only pending friend requests can be accepted or declined';
  end if;

  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.eazreal_guard_friend_request_update() from public, anon, authenticated;

drop trigger if exists eazreal_friend_request_guard_update on public.eazreal_friend_requests;
create trigger eazreal_friend_request_guard_update
before update on public.eazreal_friend_requests
for each row execute function public.eazreal_guard_friend_request_update();

create or replace function public.eazreal_touch_member_profile()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.eazreal_touch_member_profile() from public, anon, authenticated;

drop trigger if exists eazreal_member_profile_touch on public.eazreal_members;
create trigger eazreal_member_profile_touch
before update on public.eazreal_members
for each row execute function public.eazreal_touch_member_profile();
