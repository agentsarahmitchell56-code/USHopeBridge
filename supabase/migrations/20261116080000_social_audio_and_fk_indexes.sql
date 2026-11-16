-- EAZREAL social media audio support and missing foreign-key indexes.
-- Idempotent so it can safely be applied to an environment where the bucket
-- allowlist was already updated manually.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif',
  'video/mp4','video/webm',
  'audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav'
]
where id = 'social-media';

create index if not exists social_group_members_user_idx
  on public.social_group_members(user_id);
create index if not exists social_group_posts_author_idx
  on public.social_group_posts(author_id);
create index if not exists social_groups_created_by_idx
  on public.social_groups(created_by);
create index if not exists social_post_comments_parent_post_idx
  on public.social_post_comments(parent_comment_id, post_id)
  where parent_comment_id is not null;
create index if not exists social_reports_reporter_idx
  on public.social_reports(reporter_id);
create index if not exists social_stories_author_idx
  on public.social_stories(author_id);
create index if not exists social_story_views_viewer_idx
  on public.social_story_views(viewer_id);
create index if not exists social_user_blocks_blocked_idx
  on public.social_user_blocks(blocked_id);