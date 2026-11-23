-- Phase 1 social message RLS regression test.
-- Run only against a disposable Supabase development/preview database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase1_social_messages_rls.sql
-- The entire test is rolled back; three temporary auth users are created inside it.

BEGIN;

CREATE TEMP TABLE phase1_fixture_ids (
  alice uuid NOT NULL,
  bob uuid NOT NULL,
  charlie uuid NOT NULL,
  alice_bob_conversation uuid NOT NULL,
  bob_charlie_conversation uuid NOT NULL,
  alice_message uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO phase1_fixture_ids VALUES (
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
);
GRANT SELECT ON phase1_fixture_ids TO authenticated;

DO $setup$
DECLARE
  f phase1_fixture_ids%ROWTYPE;
BEGIN
  SELECT * INTO f FROM phase1_fixture_ids;

  INSERT INTO auth.users
    (id, aud, role, email, encrypted_password, email_confirmed_at,
     raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES
    (f.alice, 'authenticated', 'authenticated',
     'phase1-alice-' || f.alice || '@example.invalid', '', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"phase1_alice"}'::jsonb, now(), now()),
    (f.bob, 'authenticated', 'authenticated',
     'phase1-bob-' || f.bob || '@example.invalid', '', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"phase1_bob"}'::jsonb, now(), now()),
    (f.charlie, 'authenticated', 'authenticated',
     'phase1-charlie-' || f.charlie || '@example.invalid', '', now(),
     '{"provider":"email","providers":["email"]}'::jsonb,
     '{"username":"phase1_charlie"}'::jsonb, now(), now());

  INSERT INTO public.social_conversations (id, user_one, user_two)
  VALUES
    (f.alice_bob_conversation, LEAST(f.alice, f.bob), GREATEST(f.alice, f.bob)),
    (f.bob_charlie_conversation, LEAST(f.bob, f.charlie), GREATEST(f.bob, f.charlie));

  INSERT INTO public.social_messages (id, conversation_id, sender_id, body)
  VALUES (f.alice_message, f.alice_bob_conversation, f.alice, 'Original Alice message');
END;
$setup$;

-- Alice is a participant and can edit her own message body.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT alice::text FROM phase1_fixture_ids), true);
DO $alice_edit$
DECLARE
  f phase1_fixture_ids%ROWTYPE;
  affected integer;
BEGIN
  SELECT * INTO f FROM phase1_fixture_ids;
  UPDATE public.social_messages
    SET body = 'Alice edited her own message'
    WHERE id = f.alice_message;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'FAIL: sender could not edit own message (rows=%)', affected;
  END IF;
END;
$alice_edit$;

-- Alice cannot move her message into Bob-Charlie's conversation.
DO $move_message$
DECLARE
  f phase1_fixture_ids%ROWTYPE;
  denied boolean := false;
BEGIN
  SELECT * INTO f FROM phase1_fixture_ids;
  BEGIN
    UPDATE public.social_messages
      SET conversation_id = f.bob_charlie_conversation
      WHERE id = f.alice_message;
  EXCEPTION WHEN insufficient_privilege THEN
    denied := true;
  END;
  IF NOT denied THEN
    RAISE EXCEPTION 'FAIL: client was not denied changing conversation_id';
  END IF;
END;
$move_message$;

-- Charlie is not a participant in Alice-Bob and cannot update Alice's message.
SELECT set_config('request.jwt.claim.sub', (SELECT charlie::text FROM phase1_fixture_ids), true);
DO $nonparticipant$
DECLARE
  f phase1_fixture_ids%ROWTYPE;
  affected integer;
BEGIN
  SELECT * INTO f FROM phase1_fixture_ids;
  UPDATE public.social_messages
    SET body = 'Unauthorized edit by Charlie'
    WHERE id = f.alice_message;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'FAIL: non-participant updated message (rows=%)', affected;
  END IF;
END;
$nonparticipant$;

-- A block in either direction disables further message edits.
RESET ROLE;
DO $block_fixture$
DECLARE
  f phase1_fixture_ids%ROWTYPE;
BEGIN
  SELECT * INTO f FROM phase1_fixture_ids;
  INSERT INTO public.social_user_blocks (blocker_id, blocked_id)
  VALUES (f.bob, f.alice);
END;
$block_fixture$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT alice::text FROM phase1_fixture_ids), true);
DO $blocked_edit$
DECLARE
  f phase1_fixture_ids%ROWTYPE;
  affected integer;
BEGIN
  SELECT * INTO f FROM phase1_fixture_ids;
  UPDATE public.social_messages
    SET body = 'Edit after block'
    WHERE id = f.alice_message;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN
    RAISE EXCEPTION 'FAIL: blocked conversation still allowed message update';
  END IF;
END;
$blocked_edit$;

-- The existing read-receipt RPC still works for the other participant.
SELECT set_config('request.jwt.claim.sub', (SELECT bob::text FROM phase1_fixture_ids), true);
DO $read_receipt$
DECLARE
  f phase1_fixture_ids%ROWTYPE;
  v_read_at timestamptz;
BEGIN
  SELECT * INTO f FROM phase1_fixture_ids;
  DELETE FROM public.social_user_blocks
    WHERE blocker_id = f.bob AND blocked_id = f.alice;
  PERFORM public.mark_social_messages_read(f.alice_bob_conversation);
  SELECT read_at INTO v_read_at
    FROM public.social_messages WHERE id = f.alice_message;
  IF v_read_at IS NULL THEN
    RAISE EXCEPTION 'FAIL: mark_social_messages_read did not set read_at';
  END IF;
END;
$read_receipt$;

ROLLBACK;
