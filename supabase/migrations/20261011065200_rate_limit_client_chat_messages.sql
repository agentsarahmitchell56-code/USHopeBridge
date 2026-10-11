-- Throttle client chat message RPCs after validating the conversation token.
-- The limiter key is a one-way digest derived from the unguessable conversation token.
create or replace function public.send_chat_message(
  p_conversation_id uuid,
  p_chat_token uuid,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  new_message_id uuid;
  rate_key text;
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.chat_token = p_chat_token
  ) then
    raise exception 'Invalid chat session' using errcode = '42501';
  end if;

  if p_message is null or length(trim(p_message)) < 1 or length(trim(p_message)) > 5000 then
    raise exception 'Message must contain between 1 and 5000 characters' using errcode = '22023';
  end if;

  rate_key := md5('chat-message:' || p_conversation_id::text || ':' || p_chat_token::text)
    || md5('chat-message-second:' || p_conversation_id::text || ':' || p_chat_token::text);
  if not public.consume_upload_rate_limit(rate_key, 120, 3600) then
    raise exception 'Too many messages in this chat. Please wait before sending more.' using errcode = 'P0001';
  end if;

  insert into public.messages (conversation_id, sender_type, sender_id, message)
  values (p_conversation_id, 'client', null, trim(p_message))
  returning id into new_message_id;
  return new_message_id;
end;
$function$;

create or replace function public.send_chat_image(
  p_conversation_id uuid,
  p_chat_token uuid,
  p_image_path text,
  p_image_type text,
  p_message text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  new_message_id uuid;
  rate_key text;
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.chat_token = p_chat_token
  ) then
    raise exception 'Invalid chat session' using errcode = '42501';
  end if;
  if p_image_path is null or p_image_path !~ '^chat/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'Invalid image path' using errcode = '22023';
  end if;
  if p_image_type not in ('image/jpeg','image/png','image/webp') then
    raise exception 'Invalid image type' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_message,''))) > 5000 then
    raise exception 'Message is too long' using errcode = '22023';
  end if;

  rate_key := md5('chat-message:' || p_conversation_id::text || ':' || p_chat_token::text)
    || md5('chat-message-second:' || p_conversation_id::text || ':' || p_chat_token::text);
  if not public.consume_upload_rate_limit(rate_key, 120, 3600) then
    raise exception 'Too many messages in this chat. Please wait before sending more.' using errcode = 'P0001';
  end if;

  insert into public.messages(conversation_id,sender_type,sender_id,message,image_path,image_type)
  values(p_conversation_id,'client',null,trim(coalesce(p_message,'')),p_image_path,p_image_type)
  returning id into new_message_id;
  return new_message_id;
end;
$function$;

revoke all on function public.send_chat_message(uuid, uuid, text) from public;
grant execute on function public.send_chat_message(uuid, uuid, text) to anon, authenticated;
revoke all on function public.send_chat_image(uuid, uuid, text, text, text) from public;
grant execute on function public.send_chat_image(uuid, uuid, text, text, text) to anon, authenticated;
