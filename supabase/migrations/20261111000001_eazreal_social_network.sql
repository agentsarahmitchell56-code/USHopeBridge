-- EAZREAL social network foundation
-- Member identities, follows, friend requests, posts and likes.
-- Apply this migration to the linked Supabase project before enabling /community.

create table if not exists public.eazreal_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member_id text not null unique default ('EZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  handle text not null unique,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.eazreal_create_member()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_name text;
  v_base text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'New member'
  );
  v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if char_length(v_base) < 2 then v_base := 'member'; end if;
  if char_length(v_name) < 2 then v_name := 'New member'; end if;

  insert into public.eazreal_members (user_id, handle, display_name)
  values (
    new.id,
    left(v_base, 40) || '-' || lower(substr(replace(new.id::text, '-', ''), 1, 5)),
    left(v_name, 80)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$;

revoke all on function public.eazreal_create_member() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_eazreal_member on auth.users;
create trigger on_auth_user_created_eazreal_member
after insert on auth.users
for each row execute function public.eazreal_create_member();

insert into public.eazreal_members (user_id, handle, display_name)
select u.id,
       left(
         coalesce(
           nullif(trim(both '-' from regexp_replace(lower(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1), 'member')), '[^a-z0-9]+', '-', 'g')), ''),
           'member'
         ),
         40
       ) || '-' || lower(substr(replace(u.id::text, '-', ''), 1, 5)),
       left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), nullif(trim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1), 'New member'), 80)
from auth.users u
on conflict (user_id) do nothing;

create table if not exists public.eazreal_follows (
  follower_id uuid not null references public.eazreal_members(user_id) on delete cascade,
  following_id uuid not null references public.eazreal_members(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint eazreal_follows_no_self check (follower_id <> following_id)
);

create table if not exists public.eazreal_friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.eazreal_members(user_id) on delete cascade,
  recipient_id uuid not null references public.eazreal_members(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eazreal_friend_requests_no_self check (requester_id <> recipient_id),
  constraint eazreal_friend_requests_pair_unique unique (requester_id, recipient_id)
);

create table if not exists public.eazreal_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.eazreal_members(user_id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eazreal_post_likes (
  post_id uuid not null references public.eazreal_posts(id) on delete cascade,
  user_id uuid not null references public.eazreal_members(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists eazreal_members_display_name_idx on public.eazreal_members (lower(display_name));
create index if not exists eazreal_follows_following_idx on public.eazreal_follows (following_id, created_at desc);
create index if not exists eazreal_friend_requests_recipient_idx on public.eazreal_friend_requests (recipient_id, status, created_at desc);
create index if not exists eazreal_posts_created_idx on public.eazreal_posts (created_at desc);
create index if not exists eazreal_posts_author_idx on public.eazreal_posts (author_id, created_at desc);
create index if not exists eazreal_post_likes_user_idx on public.eazreal_post_likes (user_id, created_at desc);

alter table public.eazreal_members enable row level security;
alter table public.eazreal_follows enable row level security;
alter table public.eazreal_friend_requests enable row level security;
alter table public.eazreal_posts enable row level security;
alter table public.eazreal_post_likes enable row level security;

drop policy if exists "Authenticated members can view member profiles" on public.eazreal_members;
create policy "Authenticated members can view member profiles"
on public.eazreal_members for select to authenticated using (true);
drop policy if exists "Members can update their own profile" on public.eazreal_members;
create policy "Members can update their own profile"
on public.eazreal_members for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Members can view follow relationships" on public.eazreal_follows;
create policy "Members can view follow relationships"
on public.eazreal_follows for select to authenticated using (true);
drop policy if exists "Members can follow other members" on public.eazreal_follows;
create policy "Members can follow other members"
on public.eazreal_follows for insert to authenticated
with check (follower_id = (select auth.uid()) and follower_id <> following_id);
drop policy if exists "Members can unfollow accounts" on public.eazreal_follows;
create policy "Members can unfollow accounts"
on public.eazreal_follows for delete to authenticated
using (follower_id = (select auth.uid()));

drop policy if exists "Participants can view friend requests" on public.eazreal_friend_requests;
create policy "Participants can view friend requests"
on public.eazreal_friend_requests for select to authenticated
using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()));
drop policy if exists "Members can send friend requests" on public.eazreal_friend_requests;
create policy "Members can send friend requests"
on public.eazreal_friend_requests for insert to authenticated
with check (requester_id = (select auth.uid()) and requester_id <> recipient_id and status = 'pending');
drop policy if exists "Recipients can respond to friend requests" on public.eazreal_friend_requests;
create policy "Recipients can respond to friend requests"
on public.eazreal_friend_requests for update to authenticated
using (recipient_id = (select auth.uid()) and status = 'pending')
with check (recipient_id = (select auth.uid()) and status in ('accepted', 'declined'));
drop policy if exists "Requesters can cancel pending requests" on public.eazreal_friend_requests;
create policy "Requesters can cancel pending requests"
on public.eazreal_friend_requests for delete to authenticated
using (requester_id = (select auth.uid()) and status = 'pending');

drop policy if exists "Members can view community posts" on public.eazreal_posts;
create policy "Members can view community posts"
on public.eazreal_posts for select to authenticated using (true);
drop policy if exists "Members can publish their own posts" on public.eazreal_posts;
create policy "Members can publish their own posts"
on public.eazreal_posts for insert to authenticated
with check (author_id = (select auth.uid()));
drop policy if exists "Authors can edit their own posts" on public.eazreal_posts;
create policy "Authors can edit their own posts"
on public.eazreal_posts for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));
drop policy if exists "Authors can delete their own posts" on public.eazreal_posts;
create policy "Authors can delete their own posts"
on public.eazreal_posts for delete to authenticated
using (author_id = (select auth.uid()));

drop policy if exists "Members can view post likes" on public.eazreal_post_likes;
create policy "Members can view post likes"
on public.eazreal_post_likes for select to authenticated using (true);
drop policy if exists "Members can like posts as themselves" on public.eazreal_post_likes;
create policy "Members can like posts as themselves"
on public.eazreal_post_likes for insert to authenticated
with check (user_id = (select auth.uid()));
drop policy if exists "Members can remove their own likes" on public.eazreal_post_likes;
create policy "Members can remove their own likes"
on public.eazreal_post_likes for delete to authenticated
using (user_id = (select auth.uid()));

grant select, update on public.eazreal_members to authenticated;
grant select, insert, delete on public.eazreal_follows to authenticated;
grant select, insert, update, delete on public.eazreal_friend_requests to authenticated;
grant select, insert, update, delete on public.eazreal_posts to authenticated;
grant select, insert, delete on public.eazreal_post_likes to authenticated;

revoke all on public.eazreal_members, public.eazreal_follows, public.eazreal_friend_requests, public.eazreal_posts, public.eazreal_post_likes from anon;
