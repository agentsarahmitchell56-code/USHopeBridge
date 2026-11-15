-- Add richer social post interactions: reactions, threaded replies, and shares.
-- This migration is additive and preserves existing likes and comments.

create table if not exists public.social_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','care','haha','wow','sad','angry')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_post_reactions_post_user_key unique (post_id, user_id)
);

create index if not exists social_post_reactions_post_idx
  on public.social_post_reactions(post_id, created_at desc);
create index if not exists social_post_reactions_user_idx
  on public.social_post_reactions(user_id, created_at desc);

alter table public.social_post_reactions enable row level security;

create policy "reactions visible with readable posts"
  on public.social_post_reactions for select
  to anon, authenticated
  using (exists (
    select 1 from public.social_posts p where p.id = social_post_reactions.post_id
  ));

create policy "users add own post reactions"
  on public.social_post_reactions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.social_posts p where p.id = social_post_reactions.post_id)
  );

create policy "users update own post reactions"
  on public.social_post_reactions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users remove own post reactions"
  on public.social_post_reactions for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.social_post_reactions to anon, authenticated;
grant insert, update, delete on public.social_post_reactions to authenticated;

alter table public.social_post_comments
  add column if not exists parent_comment_id uuid;

create unique index if not exists social_post_comments_id_post_key
  on public.social_post_comments(id, post_id);

alter table public.social_post_comments
  add constraint social_post_comments_parent_same_post_fkey
  foreign key (parent_comment_id, post_id)
  references public.social_post_comments(id, post_id)
  on delete cascade;

create index if not exists social_post_comments_parent_idx
  on public.social_post_comments(parent_comment_id, post_id, created_at);

create table if not exists public.social_post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.social_posts(id) on delete cascade,
  sharer_id uuid not null references auth.users(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists social_post_shares_post_idx
  on public.social_post_shares(post_id, created_at desc);
create index if not exists social_post_shares_sharer_idx
  on public.social_post_shares(sharer_id, created_at desc);

alter table public.social_post_shares enable row level security;

create policy "shares visible with readable posts"
  on public.social_post_shares for select
  to authenticated
  using (exists (
    select 1 from public.social_posts p where p.id = social_post_shares.post_id
  ));

create policy "users share readable posts"
  on public.social_post_shares for insert
  to authenticated
  with check (
    sharer_id = (select auth.uid())
    and exists (select 1 from public.social_posts p where p.id = social_post_shares.post_id)
  );

create policy "users remove own shares"
  on public.social_post_shares for delete
  to authenticated
  using (sharer_id = (select auth.uid()));

grant select, insert, delete on public.social_post_shares to authenticated;
