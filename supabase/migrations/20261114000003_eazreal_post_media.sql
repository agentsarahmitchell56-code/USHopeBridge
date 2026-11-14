-- EAZREAL public community media
alter table public.eazreal_posts
  add column if not exists media_path text,
  add column if not exists media_url text,
  add column if not exists media_type text;

alter table public.eazreal_posts drop constraint if exists eazreal_posts_body_check;
alter table public.eazreal_posts drop constraint if exists eazreal_posts_body_or_media_check;
alter table public.eazreal_posts
  add constraint eazreal_posts_body_or_media_check
  check (
    (char_length(trim(body)) between 1 and 5000)
    or (char_length(trim(body)) = 0 and media_path is not null and media_url is not null and media_type in ('image','video'))
  );

create index if not exists eazreal_posts_media_idx
  on public.eazreal_posts (created_at desc) where media_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('eazreal-media','eazreal-media',true,26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "EAZREAL members upload own media" on storage.objects;
create policy "EAZREAL members upload own media"
on storage.objects for insert to authenticated
with check (bucket_id = 'eazreal-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "EAZREAL members delete own media" on storage.objects;
create policy "EAZREAL members delete own media"
on storage.objects for delete to authenticated
using (bucket_id = 'eazreal-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
