-- Grant server-side access required by the token-verifying business messaging API.
-- Do not grant these privileges to anon or authenticated clients.
grant select, insert, update, delete on public.business_page_conversations to service_role;
grant select, insert, update, delete on public.business_page_messages to service_role;
grant select, insert, update, delete on public.business_pages to service_role;
grant select, insert, update, delete on public.business_page_posts to service_role;
