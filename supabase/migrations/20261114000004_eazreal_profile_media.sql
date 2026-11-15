-- EAZREAL member profile and cover photos
alter table public.eazreal_members
  add column if not exists cover_url text;

grant update (display_name, bio, avatar_url, cover_url)
on public.eazreal_members to authenticated;
