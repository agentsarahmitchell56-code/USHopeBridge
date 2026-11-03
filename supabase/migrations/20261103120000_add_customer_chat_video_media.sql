-- Extend customer support chat attachments to include supported video formats.
-- Existing image RPC remains unchanged for backward compatibility.
create or replace function public.send_chat_media(
  p_conversation_id uuid,
  p_chat_token uuid,
  p_media_path text,
  p_media_type text,
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
  valid_media boolean;
begin
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.chat_token = p_chat_token
  ) then
    raise exception 'Invalid chat session' using errcode = '42501';
  end if;

  valid_media :=
    (p_media_type = 'image/jpeg' and p_media_path ~ '^chat/[0-9a-f-]{36}[.]jpg$') or
    (p_media_type = 'image/png' and p_media_path ~ '^chat/[0-9a-f-]{36}[.]png$') or
    (p_media_type = 'image/webp' and p_media_path ~ '^chat/[0-9a-f-]{36}[.]webp$') or
    (p_media_type = 'video/mp4' and p_media_path ~ '^chat/[0-9a-f-]{36}[.]mp4$') or
    (p_media_type = 'video/webm' and p_media_path ~ '^chat/[0-9a-f-]{36}[.]webm$') or
    (p_media_type = 'video/quicktime' and p_media_path ~ '^chat/[0-9a-f-]{36}[.]mov$');

  if not coalesce(valid_media, false) then
    raise exception 'Invalid chat attachment' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_message, ''))) > 5000 then
    raise exception 'Message is too long' using errcode = '22023';
  end if;

  rate_key := md5('chat-message:' || p_conversation_id::text || ':' || p_chat_token::text)
    || md5('chat-message-second:' || p_conversation_id::text || ':' || p_chat_token::text);
  if not public.consume_upload_rate_limit(rate_key, 100, 3600) then
    raise exception 'Too many messages in this chat. Please wait before sending more.' using errcode = 'P0001';
  end if;

  insert into public.messages(conversation_id, sender_type, sender_id, message, image_path, image_type)
  values(p_conversation_id, 'client', null, trim(coalesce(p_message, '')), p_media_path, p_media_type)
  returning id into new_message_id;

  update public.conversations set updated_at = now() where id = p_conversation_id;
  return new_message_id;
end;
$function$;

revoke all on function public.send_chat_media(uuid, uuid, text, text, text) from public;
grant execute on function public.send_chat_media(uuid, uuid, text, text, text) to anon, authenticated;
