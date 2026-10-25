-- Keep business conversations and their messages available as durable history.
-- No automatic deletion/expiry is configured. Guest access remains token-verified
-- through server endpoints; public clients must never query these tables directly.

create index if not exists business_page_conversations_page_updated_idx
  on public.business_page_conversations (page_id, updated_at desc);

create index if not exists business_page_messages_conversation_created_idx
  on public.business_page_messages (conversation_id, created_at asc);

create or replace function public.touch_business_page_conversation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.business_page_conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists business_page_messages_touch_conversation
  on public.business_page_messages;

create trigger business_page_messages_touch_conversation
after insert on public.business_page_messages
for each row execute function public.touch_business_page_conversation();

comment on table public.business_page_conversations is
  'Persistent customer conversation records. Retain history unless an authorized retention/deletion policy is introduced.';
comment on table public.business_page_messages is
  'Persistent message history for business conversations. Never expose directly to anon/authenticated clients; access through token-verified server endpoints.';
