-- HOPEBRIDGE secure chat video and staff attachment support.
-- Review and apply separately; this file is not executed by the application.
alter table public.messages
  add column if not exists video_path text,
  add column if not exists video_type text;

alter table public.messages drop constraint if exists messages_message_check;
alter table public.messages add constraint messages_message_check check (
  (length(trim(message)) between 1 and 5000)
  or ((image_path is not null or video_path is not null) and length(trim(message)) = 0)
);

drop function if exists public.get_chat_messages(uuid, uuid);
create function public.get_chat_messages(p_conversation_id uuid, p_chat_token uuid)
returns table (
  id uuid, conversation_id uuid, sender_type text, sender_id uuid,
  message text, created_at timestamptz, image_path text, image_type text,
  video_path text, video_type text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.chat_token = p_chat_token
  ) then
    raise exception 'Invalid chat session';
  end if;
  return query
    select m.id, m.conversation_id, m.sender_type, m.sender_id, m.message,
           m.created_at, m.image_path, m.image_type, m.video_path, m.video_type
    from public.messages m
    where m.conversation_id = p_conversation_id
    order by m.created_at asc;
end;
$$;
revoke all on function public.get_chat_messages(uuid, uuid) from public;
grant execute on function public.get_chat_messages(uuid, uuid) to anon, authenticated;

create or replace function public.send_chat_video(
  p_conversation_id uuid, p_chat_token uuid, p_video_path text,
  p_video_type text, p_message text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  new_id uuid;
begin
  if not exists (select 1 from public.conversations c where c.id=p_conversation_id and c.chat_token=p_chat_token) then
    raise exception 'Invalid chat session';
  end if;
  if p_video_path !~ '^chat/[0-9a-fA-F-]{36}\.(mp4|webm|mov)$'
     or p_video_type not in ('video/mp4','video/webm','video/quicktime') then
    raise exception 'Invalid video attachment';
  end if;
  if length(trim(coalesce(p_message,''))) > 5000 then raise exception 'Message is too long'; end if;
  if not public.consume_upload_rate_limit(md5('chat-message:' || p_conversation_id::text || ':' || p_chat_token::text) || md5('chat-message-second:' || p_conversation_id::text || ':' || p_chat_token::text), 100, 3600) then
    raise exception 'Message rate limit exceeded';
  end if;
  insert into public.messages(conversation_id,sender_type,sender_id,message,video_path,video_type)
  values(p_conversation_id,'client',null,coalesce(p_message,''),p_video_path,p_video_type)
  returning id into new_id;
  update public.conversations set updated_at=now() where id=p_conversation_id;
  return new_id;
end;
$$;

create or replace function public.send_staff_chat_attachment(
  p_conversation_id uuid, p_message text default '',
  p_image_path text default null, p_image_type text default null,
  p_video_path text default null, p_video_type text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor uuid := auth.uid();
  new_id uuid;
begin
  if actor is null or not exists(select 1 from public.profiles p where p.id=actor and p.role in ('admin','agent')) then
    raise exception 'Staff access required';
  end if;
  if not exists(select 1 from public.conversations c where c.id=p_conversation_id) then
    raise exception 'Conversation not found';
  end if;
  if length(trim(coalesce(p_message,''))) > 5000 then raise exception 'Message is too long'; end if;
  if (p_image_path is null) = (p_video_path is null) then raise exception 'Choose exactly one attachment'; end if;
  if p_image_path is not null and (
    p_image_path !~ '^chat/[0-9a-fA-F-]{36}\.(jpg|png|webp)$'
    or p_image_type not in ('image/jpeg','image/png','image/webp')
  ) then raise exception 'Invalid image attachment'; end if;
  if p_video_path is not null and (
    p_video_path !~ '^chat/[0-9a-fA-F-]{36}\.(mp4|webm|mov)$'
    or p_video_type not in ('video/mp4','video/webm','video/quicktime')
  ) then raise exception 'Invalid video attachment'; end if;
  insert into public.messages(conversation_id,sender_type,sender_id,message,image_path,image_type,video_path,video_type)
  values(p_conversation_id,'agent',actor,coalesce(p_message,''),p_image_path,p_image_type,p_video_path,p_video_type)
  returning id into new_id;
  update public.conversations set updated_at=now() where id=p_conversation_id;
  return new_id;
end;
$$;

revoke all on function public.send_chat_video(uuid,uuid,text,text,text) from public;
grant execute on function public.send_chat_video(uuid,uuid,text,text,text) to anon, authenticated;
revoke all on function public.send_staff_chat_attachment(uuid,text,text,text,text,text) from public, anon;
grant execute on function public.send_staff_chat_attachment(uuid,text,text,text,text,text) to authenticated;
