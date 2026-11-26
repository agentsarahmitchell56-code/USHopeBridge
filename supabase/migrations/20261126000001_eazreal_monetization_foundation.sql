-- EAZREAL monetization foundation (schema only).
-- This migration deliberately does NOT enable payment collection or grant browser access.
-- Apply only after review in a disposable database and explicit production approval.

create table if not exists public.eazreal_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  description text not null default '',
  currency text not null default 'NGN' check (currency = 'NGN'),
  amount_kobo bigint not null default 0 check (amount_kobo >= 0),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  trial_days integer not null default 14 check (trial_days between 0 and 60),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.eazreal_business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_page_id uuid not null references public.business_pages(id) on delete cascade,
  plan_id uuid not null references public.eazreal_subscription_plans(id) on delete restrict,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  provider text check (provider in ('paystack', 'flutterwave')),
  provider_customer_ref text,
  provider_subscription_ref text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_page_id)
);

create index if not exists eazreal_business_subscriptions_status_period_idx
  on public.eazreal_business_subscriptions (status, current_period_ends_at);

create index if not exists eazreal_business_subscriptions_plan_idx
  on public.eazreal_business_subscriptions (plan_id);

create table if not exists public.eazreal_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.eazreal_business_subscriptions(id) on delete restrict,
  provider text not null check (provider in ('paystack', 'flutterwave')),
  provider_reference text not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'pending'
    check (status in ('pending', 'successful', 'failed', 'refunded')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);

create index if not exists eazreal_payment_transactions_subscription_idx
  on public.eazreal_payment_transactions (subscription_id, created_at desc);

create table if not exists public.eazreal_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('paystack', 'flutterwave')),
  provider_event_id text not null,
  event_type text not null,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

-- No client-side role can create, alter, or mark a subscription/payment as paid.
-- Server routes will use a server-only service-role client after webhook verification.
alter table public.eazreal_subscription_plans enable row level security;
alter table public.eazreal_business_subscriptions enable row level security;
alter table public.eazreal_payment_transactions enable row level security;
alter table public.eazreal_payment_webhook_events enable row level security;

revoke all on table public.eazreal_subscription_plans from public, anon, authenticated;
revoke all on table public.eazreal_business_subscriptions from public, anon, authenticated;
revoke all on table public.eazreal_payment_transactions from public, anon, authenticated;
revoke all on table public.eazreal_payment_webhook_events from public, anon, authenticated;

grant select, insert, update, delete on table public.eazreal_subscription_plans to service_role;
grant select, insert, update, delete on table public.eazreal_business_subscriptions to service_role;
grant select, insert, update, delete on table public.eazreal_payment_transactions to service_role;
grant select, insert, update, delete on table public.eazreal_payment_webhook_events to service_role;

-- Proposed introductory prices are intentionally seeded as INACTIVE. They are
-- configuration proposals, not approved offers. No plan can be purchased until
-- the owner confirms pricing and a verified provider integration is released.
insert into public.eazreal_subscription_plans
  (code, name, description, currency, amount_kobo, billing_interval, trial_days, features, is_active, sort_order)
values
  ('starter', 'Business Starter', 'Core tools for a small business presence.', 'NGN', 500000, 'month', 14,
   '["Public business profile","Customer messaging","Basic post publishing","Basic page insights"]'::jsonb, false, 1),
  ('pro', 'Business Pro', 'More tools for businesses growing their audience.', 'NGN', 1200000, 'month', 14,
   '["Everything in Starter","Advanced page insights","Scheduled post tools","Priority workspace support"]'::jsonb, false, 2),
  ('premium', 'Business Premium', 'Expanded tools for established businesses.', 'NGN', 2500000, 'month', 14,
   '["Everything in Pro","Team workspace tools","Enhanced business reporting","Premium visibility tools when released"]'::jsonb, false, 3)
on conflict (code) do nothing;
