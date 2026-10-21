-- Server-side customer chat APIs use the service_role key and need explicit table privileges.
-- These privileges are not granted to anon or authenticated browser clients.
GRANT SELECT ON TABLE public.conversations TO service_role;
GRANT SELECT, INSERT ON TABLE public.messages TO service_role;
