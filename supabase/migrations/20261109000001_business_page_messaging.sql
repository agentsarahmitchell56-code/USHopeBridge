-- Tenant-safe business messaging: attachments and read tracking.
-- This migration is committed for review only; do not apply until approved.

alter table public.business_page_conversations
  add column if not exists customer_last_read_at timestamptz,
  add column if not exists business_last_read_at timestamptz;

alter table public.business_page_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_type text;

alter table public.business_page_messages
  drop constraint if exists business_page_messages_body_check;
alter table public.business_page_messages
  add constraint business_page_messages_body_check check (
    (char_length(trim(body)) between 1 and 4000)
    or (attachment_path is not null and char_length(trim(body)) = 0)
  );

alter table public.business_page_messages
  add constraint business_page_messages_attachment_type_check
  check (
    (attachment_path is null and attachment_type is null)
    or
    (attachment_path is not null and attachment_type in (
      'image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'
    ))
  );

create index if not exists business_page_conversations_page_unread_idx
  on public.business_page_conversations (page_id, business_last_read_at, updated_at desc);

create index if not exists business_page_messages_conversation_read_idx
  on public.business_page_messages (conversation_id, created_at desc);

-- Keep both messaging tables inaccessible to browser roles. All access is
-- mediated by authenticated server routes using the service role.
alter table public.business_page_conversations enable row level security;
alter table public.business_page_messages enable row level security;

revoke all on table public.business_page_conversations from public, anon, authenticated;
revoke all on table public.business_page_messages from public, anon, authenticated;
grant select, insert, update, delete on table public.business_page_conversations to service_role;
grant select, insert, update, delete on table public.business_page_messages to service_role;
