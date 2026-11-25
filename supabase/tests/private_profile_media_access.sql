-- Run only on a disposable Supabase database. Verifies private profile photo access.
BEGIN;
CREATE TEMP TABLE pm_fixture(owner_id uuid, stranger_id uuid, follower_id uuid, blocked_id uuid, media_path text) ON COMMIT DROP;
INSERT INTO pm_fixture VALUES(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null);
UPDATE pm_fixture SET media_path='profiles/'||owner_id::text||'/private-avatar.jpg';
GRANT SELECT ON pm_fixture TO authenticated;
DO $$
DECLARE f pm_fixture%ROWTYPE;
BEGIN
 SELECT * INTO f FROM pm_fixture;
 INSERT INTO auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 VALUES
 (f.owner_id,'authenticated','authenticated','pm-o-'||f.owner_id||'@example.invalid','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
 (f.stranger_id,'authenticated','authenticated','pm-s-'||f.stranger_id||'@example.invalid','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
 (f.follower_id,'authenticated','authenticated','pm-f-'||f.follower_id||'@example.invalid','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now()),
 (f.blocked_id,'authenticated','authenticated','pm-b-'||f.blocked_id||'@example.invalid','',now(),'{"provider":"email","providers":["email"]}','{}',now(),now());
 INSERT INTO public.user_profiles(id,username,display_name,is_private,avatar_path) VALUES
 (f.owner_id,'pm_o_'||left(f.owner_id::text,8),'Owner',true,f.media_path),
 (f.stranger_id,'pm_s_'||left(f.stranger_id::text,8),'Stranger',false,null),
 (f.follower_id,'pm_f_'||left(f.follower_id::text,8),'Follower',false,null),
 (f.blocked_id,'pm_b_'||left(f.blocked_id::text,8),'Blocked',false,null);
 INSERT INTO public.follows(follower_id,following_id,status) VALUES(f.follower_id,f.owner_id,'accepted');
 INSERT INTO public.social_user_blocks(blocker_id,blocked_id) VALUES(f.owner_id,f.blocked_id);
 INSERT INTO storage.objects(bucket_id,name,owner) VALUES('social-media',f.media_path,f.owner_id);
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT owner_id::text FROM pm_fixture),true);
DO $$ DECLARE f pm_fixture%ROWTYPE; n int; BEGIN SELECT * INTO f FROM pm_fixture; SELECT count(*) INTO n FROM storage.objects WHERE name=f.media_path; IF n<>1 THEN RAISE EXCEPTION 'owner read failed'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT stranger_id::text FROM pm_fixture),true);
DO $$ DECLARE f pm_fixture%ROWTYPE; n int; BEGIN SELECT * INTO f FROM pm_fixture; SELECT count(*) INTO n FROM storage.objects WHERE name=f.media_path; IF n<>0 THEN RAISE EXCEPTION 'stranger read allowed'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT follower_id::text FROM pm_fixture),true);
DO $$ DECLARE f pm_fixture%ROWTYPE; n int; BEGIN SELECT * INTO f FROM pm_fixture; SELECT count(*) INTO n FROM storage.objects WHERE name=f.media_path; IF n<>1 THEN RAISE EXCEPTION 'accepted follower read failed'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT blocked_id::text FROM pm_fixture),true);
DO $$ DECLARE f pm_fixture%ROWTYPE; n int; BEGIN SELECT * INTO f FROM pm_fixture; SELECT count(*) INTO n FROM storage.objects WHERE name=f.media_path; IF n<>0 THEN RAISE EXCEPTION 'blocked user read allowed'; END IF; END $$;
ROLLBACK;
