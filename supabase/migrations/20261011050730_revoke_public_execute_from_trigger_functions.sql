-- Trigger functions execute through database triggers, not direct client RPC calls.
-- Remove default PUBLIC execute grants to reduce the exposed SECURITY DEFINER surface.
revoke all on function public.notify_application_status_change() from public, anon, authenticated;
revoke all on function public.notify_new_application() from public, anon, authenticated;
revoke all on function public.notify_new_customer_message() from public, anon, authenticated;
