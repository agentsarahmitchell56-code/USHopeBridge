-- Restore secure participant-scoped access for EAZREAL direct messaging.
-- RLS remains enabled; users can only access their own conversations and notifications.
alter table public.social_conversations enable row level security;
alter table public.social_messages enable row level security;
alter table public.social_notifications enable row level security;

drop policy if exists "participants read own conversations" on public.social_conversations;
create policy "participants read own conversations"
on public.social_conversations for select to authenticated
using (auth.uid() = user_one or auth.uid() = user_two);

drop policy if exists "participants create own conversations" on public.social_conversations;
create policy "participants create own conversations"
on public.social_conversations for insert to authenticated
with check (
  auth.uid() = user_one or auth.uid() = user_two
);

drop policy if exists "participants update own conversations" on public.social_conversations;
create policy "participants update own conversations"
on public.social_conversations for update to authenticated
using (auth.uid() = user_one or auth.uid() = user_two)
with check (auth.uid() = user_one or auth.uid() = user_two);

drop policy if exists "participants delete own conversations" on public.social_conversations;
create policy "participants delete own conversations"
on public.social_conversations for delete to authenticated
using (auth.uid() = user_one or auth.uid() = user_two);

drop policy if exists "participants read conversation messages" on public.social_messages;
create policy "participants read conversation messages"
on public.social_messages for select to authenticated
using (
  exists (
    select 1 from public.social_conversations c
    where c.id = social_messages.conversation_id
      and auth.uid() in (c.user_one, c.user_two)
  )
);

drop policy if exists "participants send own messages" on public.social_messages;
create policy "participants send own messages"
on public.social_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.social_conversations c
    where c.id = social_messages.conversation_id
      and auth.uid() in (c.user_one, c.user_two)
  )
);

drop policy if exists "senders update own messages" on public.social_messages;
create policy "senders update own messages"
on public.social_messages for update to authenticated
using (sender_id = auth.uid())
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.social_conversations c
    where c.id = social_messages.conversation_id
      and auth.uid() in (c.user_one, c.user_two)
  )
);

drop policy if exists "senders delete own messages" on public.social_messages;
create policy "senders delete own messages"
on public.social_messages for delete to authenticated
using (sender_id = auth.uid());

drop policy if exists "users read own social notifications" on public.social_notifications;
create policy "users read own social notifications"
on public.social_notifications for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists "users receive social notifications" on public.social_notifications;
create policy "users receive social notifications"
on public.social_notifications for insert to authenticated
with check (actor_id = auth.uid() and recipient_id <> auth.uid());

drop policy if exists "users mark own social notifications read" on public.social_notifications;
create policy "users mark own social notifications read"
on public.social_notifications for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop policy if exists "users delete own social notifications" on public.social_notifications;
create policy "users delete own social notifications"
on public.social_notifications for delete to authenticated
using (recipient_id = auth.uid());

revoke all on public.social_conversations from anon;
revoke all on public.social_messages from anon;
revoke all on public.social_notifications from anon;
grant select, insert, update, delete on public.social_conversations to authenticated;
grant select, insert, update, delete on public.social_messages to authenticated;
grant select, insert, update, delete on public.social_notifications to authenticated;
