-- EAZREAL post comments
-- Safe additive migration: creates only the social-network comments table.
create table if not exists public.eazreal_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.eazreal_posts(id) on delete cascade,
  author_id uuid not null references public.eazreal_members(user_id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists eazreal_post_comments_post_created_idx
  on public.eazreal_post_comments (post_id, created_at asc);
create index if not exists eazreal_post_comments_author_idx
  on public.eazreal_post_comments (author_id, created_at desc);

alter table public.eazreal_post_comments enable row level security;

drop policy if exists "Members can view post comments" on public.eazreal_post_comments;
create policy "Members can view post comments"
on public.eazreal_post_comments for select to authenticated
using (true);

drop policy if exists "Members can comment as themselves" on public.eazreal_post_comments;
create policy "Members can comment as themselves"
on public.eazreal_post_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.eazreal_posts p where p.id = post_id)
);

drop policy if exists "Authors can delete their own comments" on public.eazreal_post_comments;
create policy "Authors can delete their own comments"
on public.eazreal_post_comments for delete to authenticated
using (author_id = (select auth.uid()));

grant select, insert, delete on public.eazreal_post_comments to authenticated;
revoke all on public.eazreal_post_comments from anon;
