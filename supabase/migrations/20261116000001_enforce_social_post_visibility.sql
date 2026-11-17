-- Enforce post audience and private-profile visibility in the database.
-- The SECURITY DEFINER RPC returns only posts the current viewer may read.
create or replace function public.get_visible_social_posts(
  p_author_id uuid default null,
  p_limit integer default 40
)
returns table (
  id uuid,
  author_id uuid,
  body text,
  media_path text,
  media_type text,
  visibility text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id, p.author_id, p.body, p.media_path, p.media_type,
         coalesce(p.visibility, 'public')::text, p.created_at
  from public.social_posts p
  join public.user_profiles u on u.id = p.author_id
  where (p_author_id is null or p.author_id = p_author_id)
    and not exists (
      select 1 from public.social_user_blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.author_id)
         or (b.blocker_id = p.author_id and b.blocked_id = auth.uid())
    )
    and (
      p.author_id = auth.uid()
      or (
        coalesce(u.is_private, false) = false
        and coalesce(p.visibility, 'public') = 'public'
      )
      or (
        coalesce(p.visibility, 'public') = 'friends'
        and exists (
          select 1 from public.friendships f
          where f.status = 'accepted'
            and ((f.requester_id = auth.uid() and f.addressee_id = p.author_id)
              or (f.requester_id = p.author_id and f.addressee_id = auth.uid()))
        )
      )
      or (
        coalesce(u.is_private, false) = true
        and coalesce(p.visibility, 'public') = 'public'
        and exists (
          select 1 from public.follows fl
          where fl.follower_id = auth.uid()
            and fl.following_id = p.author_id
            and fl.status = 'accepted'
        )
      )
    )
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 40), 1), 100);
$$;

revoke all on function public.get_visible_social_posts(uuid, integer) from public;
grant execute on function public.get_visible_social_posts(uuid, integer) to anon, authenticated;
