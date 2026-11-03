create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  staff_user_id uuid references auth.users(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_subscriptions_owner_check
    check (
      (staff_user_id is not null and conversation_id is null)
      or
      (staff_user_id is null and conversation_id is not null)
    )
);

create index if not exists push_subscriptions_staff_user_id_idx
  on public.push_subscriptions (staff_user_id)
  where staff_user_id is not null;

create index if not exists push_subscriptions_conversation_id_idx
  on public.push_subscriptions (conversation_id)
  where conversation_id is not null;

alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from anon, authenticated;
grant all on table public.push_subscriptions to service_role;
