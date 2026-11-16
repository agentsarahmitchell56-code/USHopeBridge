-- Allow logged-out visitors to load attachments on public posts from public profiles.
-- Message attachments and friends-only/private post media remain restricted.
create policy "guests read public social post media"
on storage.objects
for select
to anon
using (
  bucket_id = 'social-media'
  and (storage.foldername(name))[1] = 'posts'
  and exists (
    select 1
    from public.social_posts p
    join public.user_profiles up on up.id = p.author_id
    where p.media_path = objects.name
      and p.visibility = 'public'
      and coalesce(up.is_private, false) = false
  )
);
