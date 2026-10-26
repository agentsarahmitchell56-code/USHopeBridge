-- Allow customers to send an image without adding a text caption.
-- The image path remains required by send_chat_image() for image messages.
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_check
  CHECK (
    (length(trim(message)) >= 1 AND length(trim(message)) <= 5000)
    OR (image_path IS NOT NULL AND length(trim(message)) = 0)
  );
