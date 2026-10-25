-- Business pages and customer communication workspace.
create extension if not exists pgcrypto;

create table if not exists public.business_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  category text not null default 'Local business' check (char_length(category) <= 60),
  description text not null default '' check (char_length(description) <= 1000),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  website_url text not null default '' check (char_length(website_url) <= 500),
  avatar_url text,
  cover_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_page_posts (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.business_pages(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.business_page_conversations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.business_pages(id) on delete cascade,
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 100),
  customer_email text not null check (char_length(trim(customer_email)) between 3 and 254),
  access_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_page_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.business_page_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer','business')),
  sender_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.business_pages enable row level security;
alter table public.business_page_posts enable row level security;
alter table public.business_page_conversations enable row level security;
alter table public.business_page_messages enable row level security;

drop policy if exists "Public can view published business pages" on public.business_pages;
create policy "Public can view published business pages" on public.business_pages for select to anon, authenticated using (published = true or owner_id = auth.uid());
drop policy if exists "Owners manage their business pages" on public.business_pages;
create policy "Owners manage their business pages" on public.business_pages for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "Public can read posts on published pages" on public.business_page_posts;
create policy "Public can read posts on published pages" on public.business_page_posts for select to anon, authenticated using (exists (select 1 from public.business_pages p where p.id = page_id and (p.published = true or p.owner_id = auth.uid())));
drop policy if exists "Owners manage their page posts" on public.business_page_posts;
create policy "Owners manage their page posts" on public.business_page_posts for all to authenticated using (author_id = auth.uid() and exists (select 1 from public.business_pages p where p.id = page_id and p.owner_id = auth.uid())) with check (author_id = auth.uid() and exists (select 1 from public.business_pages p where p.id = page_id and p.owner_id = auth.uid()));

-- Conversations and messages are deliberately not directly readable/writable from public clients.
-- Customer-facing messaging must go through token-verifying server/RPC endpoints before release.
revoke all on public.business_page_conversations from anon, authenticated;
revoke all on public.business_page_messages from anon, authenticated;
grant select, insert, update, delete on public.business_pages to authenticated;
grant select, insert, update, delete on public.business_page_posts to authenticated;
grant select on public.business_pages, public.business_page_posts to anon;
