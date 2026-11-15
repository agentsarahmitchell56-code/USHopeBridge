-- Improve EAZREAL chat read receipts and voice-message support.
-- Read state is updated only through a security-definer RPC that validates the caller
-- is a conversation participant. Existing message and storage data is preserved.

alter table public.social_messages
  drop constraint if exists social_messages_media_type_check;

alter table public.social_messages
  add constraint social_messages_media_type_check
  check (media_type is null or media_type in ('image','video','audio','file'));

create index if not exists social_messages_unread_by_conversation_idx
  on public.social_messages(conversation_id, sender_id, read_at)
  where read_at is null;

create or replace function public.mark_social_messages_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.social_conversations c
    where c.id = p_conversation_id
      and (c.user_one = v_uid or c.user_two = v_uid)
  ) then
    raise exception 'Conversation not found or access denied';
  end if;

  if exists (
    select 1 from public.social_conversations c
    join public.social_user_blocks b
      on (b.blocker_id = c.user_one and b.blocked_id = c.user_two)
      or (b.blocker_id = c.user_two and b.blocked_id = c.user_one)
    where c.id = p_conversation_id
  ) then
    raise exception 'Messaging is unavailable for this conversation';
  end if;

  update public.social_messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_uid
    and read_at is null;
end;
$$;

revoke all on function public.mark_social_messages_read(uuid) from public;
grant execute on function public.mark_social_messages_read(uuid) to authenticated;
