-- Phase 1 function and table privilege regression checks.
-- Run after the Phase 1 migration on a disposable Supabase development database.
-- This script is read-only and rolls back its transaction.

BEGIN;

DO $privileges$
DECLARE
  v_table text;
  v_function text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'public.business_page_conversations',
    'public.business_page_messages',
    'public.push_subscriptions',
    'public.upload_rate_limits',
    'public.application_status_rate_limits'
  ] LOOP
    IF has_table_privilege('anon', v_table, 'SELECT')
      OR has_table_privilege('anon', v_table, 'INSERT')
      OR has_table_privilege('anon', v_table, 'UPDATE')
      OR has_table_privilege('anon', v_table, 'DELETE')
      OR has_table_privilege('authenticated', v_table, 'SELECT')
      OR has_table_privilege('authenticated', v_table, 'INSERT')
      OR has_table_privilege('authenticated', v_table, 'UPDATE')
      OR has_table_privilege('authenticated', v_table, 'DELETE') THEN
      RAISE EXCEPTION 'FAIL: client role has CRUD privilege on server-only table %', v_table;
    END IF;
  END LOOP;

  FOREACH v_function IN ARRAY ARRAY[
    'public.lookup_application_status(text,text)',
    'public.admin_set_staff_role(uuid,text)',
    'public.is_staff()',
    'public.mark_social_messages_read(uuid)',
    'public.send_staff_chat_attachment(uuid,text,text,text,text,text)',
    'public.send_staff_chat_message(uuid,text)',
    'public.consume_application_status_rate_limit(text,text)'
  ] LOOP
    IF has_function_privilege('anon', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL: anon can execute restricted function %', v_function;
    END IF;
  END LOOP;

  IF NOT has_function_privilege('anon', 'public.get_chat_messages(uuid,uuid)', 'EXECUTE')
    OR NOT has_function_privilege('anon', 'public.send_chat_message(uuid,uuid,text)', 'EXECUTE')
    OR NOT has_function_privilege('anon', 'public.send_chat_image(uuid,uuid,text,text,text)', 'EXECUTE')
    OR NOT has_function_privilege('anon', 'public.send_chat_video(uuid,uuid,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: required anonymous customer chat RPC grant is missing';
  END IF;

  IF has_table_privilege('anon', 'public.social_messages', 'TRUNCATE')
    OR has_table_privilege('authenticated', 'public.social_messages', 'TRUNCATE') THEN
    RAISE EXCEPTION 'FAIL: client role retains TRUNCATE on social_messages';
  END IF;
END;
$privileges$;

ROLLBACK;
