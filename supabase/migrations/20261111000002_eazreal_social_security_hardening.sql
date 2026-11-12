-- EAZREAL social-network security hardening
-- Apply only after reviewing the base social-network migration and testing in staging.
-- This migration does not touch HOPEBRIDGE application or support tables.

-- Protect immutable member identity columns at the database privilege layer.
revoke update on table public.eazreal_members from authenticated;
grant update (display_name, bio, avatar_url) on table public.eazreal_members to authenticated;

-- A recipient may only accept or decline the existing pending request.
-- Participant IDs cannot be rewritten, and terminal requests cannot be changed.
create or replace function public.eazreal_guard_friend_request_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $$
begin
  if auth.uid() is null
     or auth.uid() <> old.recipient_id
     or old.status <> 'pending'
     or new.requester_id is distinct from old.requester_id
     or new.recipient_id is distinct from old.recipient_id
     or new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
     or new.status not in ('accepted', 'declined') then
    raise exception 'Friend request update is not permitted'
      using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.eazreal_guard_friend_request_update() from public, anon, authenticated;
drop trigger if exists eazreal_guard_friend_request_update on public.eazreal_friend_requests;
create trigger eazreal_guard_friend_request_update
before update on public.eazreal_friend_requests
for each row execute function public.eazreal_guard_friend_request_update();

-- A conversation remains visible only while its two members are accepted friends.
drop policy if exists "Friends can view their DM conversations" on public.eazreal_dm_conversations;
create policy "Friends can view their DM conversations"
on public.eazreal_dm_conversations for select to authenticated
using (
  (select auth.uid()) in (member_one, member_two)
  and exists (
    select 1
    from public.eazreal_friend_requests fr
    where fr.status = 'accepted'
      and (
        (fr.requester_id = member_one and fr.recipient_id = member_two)
        or (fr.requester_id = member_two and fr.recipient_id = member_one)
      )
  )
);

-- Message reads and sends both require current accepted-friend status.
drop policy if exists "Friends can view messages in their conversation" on public.eazreal_dm_messages;
create policy "Friends can view messages in their conversation"
on public.eazreal_dm_messages for select to authenticated
using (
  exists (
    select 1
    from public.eazreal_dm_conversations c
    where c.id = conversation_id
      and (select auth.uid()) in (c.member_one, c.member_two)
      and exists (
        select 1
        from public.eazreal_friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.requester_id = c.member_one and fr.recipient_id = c.member_two)
            or (fr.requester_id = c.member_two and fr.recipient_id = c.member_one)
          )
      )
  )
);

drop policy if exists "Participants can send their own messages" on public.eazreal_dm_messages;
create policy "Participants can send their own messages"
on public.eazreal_dm_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.eazreal_dm_conversations c
    where c.id = conversation_id
      and (select auth.uid()) in (c.member_one, c.member_two)
      and exists (
        select 1
        from public.eazreal_friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.requester_id = c.member_one and fr.recipient_id = c.member_two)
            or (fr.requester_id = c.member_two and fr.recipient_id = c.member_one)
          )
      )
  )
);

-- Authenticated users should not be able to rewrite conversation membership.
revoke update, delete on table public.eazreal_dm_conversations from authenticated;
revoke update, delete on table public.eazreal_dm_messages from authenticated;
