-- Fix chat image attachment path validation.
-- /api/uploads stores chat/<UUID>.<extension>; [.] matches the literal dot.
CREATE OR REPLACE FUNCTION public.send_chat_image(
  p_conversation_id uuid,
  p_chat_token uuid,
  p_image_path text,
  p_image_type text,
  p_message text DEFAULT ''::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  new_message_id uuid;
  rate_key text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = p_conversation_id AND c.chat_token = p_chat_token
  ) THEN
    RAISE EXCEPTION 'Invalid chat session' USING errcode = '42501';
  END IF;

  IF p_image_path IS NULL
     OR p_image_path !~ '^chat/[0-9a-f-]{36}[.](jpg|png|webp)$' THEN
    RAISE EXCEPTION 'Invalid image path' USING errcode = '22023';
  END IF;
  IF p_image_type NOT IN ('image/jpeg', 'image/png', 'image/webp') THEN
    RAISE EXCEPTION 'Invalid image type' USING errcode = '22023';
  END IF;
  IF length(trim(coalesce(p_message, ''))) > 5000 THEN
    RAISE EXCEPTION 'Message is too long' USING errcode = '22023';
  END IF;

  rate_key := md5('chat-message:' || p_conversation_id::text || ':' || p_chat_token::text)
    || md5('chat-message-second:' || p_conversation_id::text || ':' || p_chat_token::text);
  IF NOT public.consume_upload_rate_limit(rate_key, 100, 3600) THEN
    RAISE EXCEPTION 'Too many messages in this chat. Please wait before sending more.' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.messages(conversation_id, sender_type, sender_id, message, image_path, image_type)
  VALUES (p_conversation_id, 'client', null, trim(coalesce(p_message, '')), p_image_path, p_image_type)
  RETURNING id INTO new_message_id;

  UPDATE public.conversations SET updated_at = now() WHERE id = p_conversation_id;
  RETURN new_message_id;
END;
$function$;
