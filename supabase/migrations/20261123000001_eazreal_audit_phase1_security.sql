-- EAZREAL Audit #47 — Phase 1 database security
-- New migration only. Apply to a Supabase development branch first.

-- ---------------------------------------------------------------------------
-- H1: Social message UPDATE must validate both OLD and NEW conversation access.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "senders update own social messages"
ON public.social_messages;

CREATE POLICY "senders update own social messages"
ON public.social_messages
FOR UPDATE
TO authenticated
USING (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.social_conversations AS c
    WHERE c.id = social_messages.conversation_id
      AND (
        c.user_one = (SELECT auth.uid())
        OR c.user_two = (SELECT auth.uid())
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.social_user_blocks AS b
        WHERE
          (b.blocker_id = c.user_one AND b.blocked_id = c.user_two)
          OR
          (b.blocker_id = c.user_two AND b.blocked_id = c.user_one)
      )
  )
)
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.social_conversations AS c
    WHERE c.id = social_messages.conversation_id
      AND (
        c.user_one = (SELECT auth.uid())
        OR c.user_two = (SELECT auth.uid())
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.social_user_blocks AS b
        WHERE
          (b.blocker_id = c.user_one AND b.blocked_id = c.user_two)
          OR
          (b.blocker_id = c.user_two AND b.blocked_id = c.user_one)
      )
  )
);

-- Authenticated clients may edit message content/media only. Read receipts are
-- changed by the SECURITY DEFINER mark_social_messages_read() function.
REVOKE UPDATE ON TABLE public.social_messages FROM authenticated;
GRANT UPDATE (body, media_path, media_type)
ON TABLE public.social_messages TO authenticated;

-- Defense in depth: reject identity-field changes from authenticated sessions,
-- including if broader UPDATE grants are introduced later.
CREATE OR REPLACE FUNCTION public.prevent_social_message_identity_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
    OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Social message identity fields cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_social_message_identity
ON public.social_messages;

CREATE TRIGGER protect_social_message_identity
BEFORE UPDATE OF conversation_id, sender_id, created_at
ON public.social_messages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_social_message_identity_changes();

-- ---------------------------------------------------------------------------
-- H2: Explicit function EXECUTE grants and fixed search paths.
-- The status lookup is now called by a rate-limited server route using
-- service_role; direct anonymous/authenticated RPC execution is removed.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.get_chat_messages(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_application_status(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_chat_image(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_chat_message(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.send_chat_video(uuid, uuid, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_staff_role(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_social_messages_read(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_staff_chat_attachment(uuid, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_staff_chat_message(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_chat_messages(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_application_status(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.send_chat_image(uuid, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_chat_video(uuid, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_social_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_staff_chat_attachment(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_staff_chat_message(uuid, text) TO authenticated;

ALTER FUNCTION public.get_chat_messages(uuid, uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.lookup_application_status(text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.send_chat_image(uuid, uuid, text, text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.send_chat_message(uuid, uuid, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.send_chat_video(uuid, uuid, text, text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.admin_set_staff_role(uuid, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_staff() SET search_path = pg_catalog, public;
ALTER FUNCTION public.mark_social_messages_read(uuid) SET search_path = pg_catalog, public;
ALTER FUNCTION public.send_staff_chat_attachment(uuid, text, text, text, text, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.send_staff_chat_message(uuid, text) SET search_path = pg_catalog, public;

-- ---------------------------------------------------------------------------
-- H2: Atomic, privacy-preserving application status lookup rate limits.
-- Store keyed digests only; no raw IP, email, or application reference.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.application_status_rate_limits (
  key_type text NOT NULL CHECK (key_type IN ('ip', 'lookup')),
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  PRIMARY KEY (key_type, key_hash)
);

ALTER TABLE public.application_status_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS application_status_rate_limits_window_idx
  ON public.application_status_rate_limits (window_started_at);

REVOKE ALL PRIVILEGES ON TABLE public.application_status_rate_limits
FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.application_status_rate_limits IS
  'Server-only application status lookup throttling. Stores keyed hashes, never raw IP addresses, emails, or application references.';

CREATE OR REPLACE FUNCTION public.consume_application_status_rate_limit(
  p_ip_hash text,
  p_lookup_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_ip_attempts integer;
  v_lookup_attempts integer;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{64}$'
     OR p_lookup_hash IS NULL OR p_lookup_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid rate-limit key' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.application_status_rate_limits AS current_limit
    (key_type, key_hash, window_started_at, attempt_count)
  VALUES ('ip', p_ip_hash, v_now, 1)
  ON CONFLICT (key_type, key_hash) DO UPDATE
    SET window_started_at = CASE
          WHEN current_limit.window_started_at <= v_now - interval '15 minutes'
            THEN v_now ELSE current_limit.window_started_at END,
        attempt_count = CASE
          WHEN current_limit.window_started_at <= v_now - interval '15 minutes'
            THEN 1 ELSE current_limit.attempt_count + 1 END
  RETURNING attempt_count INTO v_ip_attempts;

  INSERT INTO public.application_status_rate_limits AS current_limit
    (key_type, key_hash, window_started_at, attempt_count)
  VALUES ('lookup', p_lookup_hash, v_now, 1)
  ON CONFLICT (key_type, key_hash) DO UPDATE
    SET window_started_at = CASE
          WHEN current_limit.window_started_at <= v_now - interval '15 minutes'
            THEN v_now ELSE current_limit.window_started_at END,
        attempt_count = CASE
          WHEN current_limit.window_started_at <= v_now - interval '15 minutes'
            THEN 1 ELSE current_limit.attempt_count + 1 END
  RETURNING attempt_count INTO v_lookup_attempts;

  -- 5 attempts per IP and 3 attempts per normalized reference/email pair
  -- in each 15-minute window. Increment both counters even when one is over.
  -- Opportunistic expiry cleanup keeps this hash-only table bounded without
  -- running a full-table delete on every request.
  IF random() < 0.01 THEN
    DELETE FROM public.application_status_rate_limits
    WHERE window_started_at < v_now - interval '1 day';
  END IF;

  RETURN v_ip_attempts <= 5 AND v_lookup_attempts <= 3;
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_application_status_rate_limit(text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_application_status_rate_limit(text, text)
TO service_role;

-- ---------------------------------------------------------------------------
-- M1: Remove non-CRUD table privileges from client roles across public schema.
-- Existing SELECT/INSERT/UPDATE/DELETE grants and RLS policies are preserved.
-- ---------------------------------------------------------------------------

REVOKE TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- M2: Explicitly document and enforce server-only application tables.
-- ---------------------------------------------------------------------------

REVOKE ALL PRIVILEGES
ON TABLE
  public.business_page_conversations,
  public.business_page_messages,
  public.push_subscriptions,
  public.upload_rate_limits
FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.business_page_conversations IS
  'Persistent customer conversation records. Server-only: access through authorized server-side endpoints using service-role credentials. Retain history unless an authorized retention/deletion policy is introduced.';

COMMENT ON TABLE public.business_page_messages IS
  'Persistent message history for business conversations. Never expose directly to anon/authenticated clients; access through token-verified server endpoints. Server-only table.';

COMMENT ON TABLE public.push_subscriptions IS
  'Server-only push notification subscription records. Access only through authorized server-side modules.';

COMMENT ON TABLE public.upload_rate_limits IS
  'Server-only upload rate-limit records. Access only through authorized server-side modules.';
