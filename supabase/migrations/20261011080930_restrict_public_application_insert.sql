-- Apply only after the rate-limited /api/applications endpoint is deployed and verified.
-- Public browser clients must not bypass server-side validation and rate limiting.
revoke insert on table public.applications from public, anon, authenticated;
grant insert on table public.applications to service_role;

-- Public chat creation must use the rate-limited server endpoint.
revoke insert on table public.conversations from public, anon, authenticated;
grant insert on table public.conversations to service_role;
