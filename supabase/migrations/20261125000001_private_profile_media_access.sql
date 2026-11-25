-- EAZREAL privacy audit: enforce private-account access on social profile media.
-- Replace the combined authenticated read policy with narrowly scoped policies.
-- Public profile discovery remains unchanged; only private media access is tightened.

DROP POLICY IF EXISTS "social media owners and participants read files"
ON storage.objects;

CREATE POLICY "members read accessible social profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-media'
  AND (storage.foldername(name))[1] = 'profiles'
  AND EXISTS (
    SELECT 1
    FROM public.user_profiles AS up
    WHERE up.id::text = (storage.foldername(objects.name))[2]
      AND (objects.name = up.avatar_path OR objects.name = up.cover_path)
      AND (
        up.id = (SELECT auth.uid())
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public.social_user_blocks AS b
            WHERE
              (b.blocker_id = up.id AND b.blocked_id = (SELECT auth.uid()))
              OR
              (b.blocked_id = up.id AND b.blocker_id = (SELECT auth.uid()))
          )
          AND (
            COALESCE(up.is_private, false) = false
            OR EXISTS (
              SELECT 1
              FROM public.follows AS f
              WHERE f.follower_id = (SELECT auth.uid())
                AND f.following_id = up.id
                AND f.status = 'accepted'
            )
            OR EXISTS (
              SELECT 1
              FROM public.friendships AS f
              WHERE f.status = 'accepted'
                AND (
                  (f.requester_id = up.id AND f.addressee_id = (SELECT auth.uid()))
                  OR
                  (f.addressee_id = up.id AND f.requester_id = (SELECT auth.uid()))
                )
            )
          )
        )
      )
  )
);

CREATE POLICY "members read accessible social post media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-media'
  AND (storage.foldername(name))[1] = 'posts'
  AND EXISTS (
    SELECT 1
    FROM public.social_posts AS p
    WHERE p.media_path = objects.name
      AND (
        p.author_id = (SELECT auth.uid())
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public.social_user_blocks AS b
            WHERE
              (b.blocker_id = p.author_id AND b.blocked_id = (SELECT auth.uid()))
              OR
              (b.blocked_id = p.author_id AND b.blocker_id = (SELECT auth.uid()))
          )
          AND p.visibility = 'public'
          AND (
            COALESCE((
              SELECT up.is_private
              FROM public.user_profiles AS up
              WHERE up.id = p.author_id
            ), false) = false
            OR EXISTS (
              SELECT 1
              FROM public.follows AS f
              WHERE f.follower_id = (SELECT auth.uid())
                AND f.following_id = p.author_id
                AND f.status = 'accepted'
            )
            OR EXISTS (
              SELECT 1
              FROM public.friendships AS f
              WHERE f.status = 'accepted'
                AND (
                  (f.requester_id = p.author_id AND f.addressee_id = (SELECT auth.uid()))
                  OR
                  (f.addressee_id = p.author_id AND f.requester_id = (SELECT auth.uid()))
                )
            )
          )
        )
        OR (
          NOT EXISTS (
            SELECT 1
            FROM public.social_user_blocks AS b
            WHERE
              (b.blocker_id = p.author_id AND b.blocked_id = (SELECT auth.uid()))
              OR
              (b.blocked_id = p.author_id AND b.blocker_id = (SELECT auth.uid()))
          )
          AND p.visibility = 'friends'
          AND EXISTS (
            SELECT 1
            FROM public.friendships AS f
            WHERE f.status = 'accepted'
              AND (
                (f.requester_id = p.author_id AND f.addressee_id = (SELECT auth.uid()))
                OR
                (f.addressee_id = p.author_id AND f.requester_id = (SELECT auth.uid()))
              )
          )
        )
      )
  )
);

CREATE POLICY "conversation participants read social message media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-media'
  AND (storage.foldername(name))[1] = 'messages'
  AND EXISTS (
    SELECT 1
    FROM public.social_conversations AS c
    WHERE c.id::text = (storage.foldername(objects.name))[2]
      AND (
        (SELECT auth.uid()) = c.user_one
        OR (SELECT auth.uid()) = c.user_two
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

COMMENT ON POLICY "members read accessible social profile photos" ON storage.objects IS
  'Profile media is readable by its owner, or by users permitted by public/private profile visibility, accepted follows/friendships, and block rules.';
