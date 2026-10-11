-- HOPEBRIDGE security hardening.
-- 1) Public applicants may insert only fields collected by the public application form.
-- Staff-managed/payment fields, status, IDs, and timestamps remain database-controlled.
revoke insert on table public.applications from public, anon, authenticated;
-- Public application submissions will go through the rate-limited server endpoint.
-- service_role retains its privileged access; public client roles receive no INSERT grant.

-- Prevent authenticated users from changing their own role or creation timestamp.
revoke update on table public.profiles from public, anon, authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;

-- Public chat creation only needs the fields the client form supplies. The
-- application link and timestamps must remain server/staff controlled.
revoke insert on table public.conversations from public, anon, authenticated;
grant insert (id, client_name, client_email, chat_token)
  on table public.conversations to anon, authenticated;

-- Client messages go through token-checking SECURITY DEFINER RPCs; staff
-- messages use the authenticated INSERT policy and only need these columns.
revoke insert on table public.messages from public, anon, authenticated;
grant insert (conversation_id, sender_type, sender_id, message, image_path, image_type)
  on table public.messages to authenticated;

-- 2) Durable upload limits. Store only a keyed digest of the requester identifier,
-- never the raw IP address. The table is inaccessible to client roles.
create table if not exists public.upload_rate_limits (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.upload_rate_limits enable row level security;
revoke all on table public.upload_rate_limits from public, anon, authenticated;

create or replace function public.consume_upload_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  is_allowed boolean;
  current_time_value timestamptz := clock_timestamp();
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_limit is null or p_limit < 1 or p_limit > 100
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into public.upload_rate_limits as limits (key_hash, window_started_at, request_count)
  values (p_key_hash, current_time_value, 1)
  on conflict (key_hash) do update
  set window_started_at = case
        when limits.window_started_at <= current_time_value - make_interval(secs => p_window_seconds)
        then current_time_value
        else limits.window_started_at
      end,
      request_count = case
        when limits.window_started_at <= current_time_value - make_interval(secs => p_window_seconds)
        then 1
        else limits.request_count + 1
      end
  returning request_count <= p_limit into is_allowed;

  -- Opportunistically remove old keys to keep this small table bounded over time.
  if mod(hashtext(p_key_hash), 100) = 0 then
    delete from public.upload_rate_limits
    where window_started_at < current_time_value - interval '7 days';
  end if;

  return is_allowed;
end;
$$;

revoke all on function public.consume_upload_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_upload_rate_limit(text, integer, integer) to service_role;

-- 3) Keep the admin-only role-management function on a fixed, safe search path.
alter function public.admin_set_staff_role(uuid, text) set search_path = pg_catalog, public;
revoke all on function public.admin_set_staff_role(uuid, text) from public, anon;
grant execute on function public.admin_set_staff_role(uuid, text) to authenticated;
