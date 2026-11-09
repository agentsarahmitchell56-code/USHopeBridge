-- Expose only published public-profile content through a narrowly scoped RPC.
-- The API uses the service role server-side; no table-wide SELECT is granted.
create or replace function public.get_published_business_posts(p_limit integer default 24)
returns table (
  id uuid,
  caption text,
  media_url text,
  media_type text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id, p.caption, p.media_url, p.media_type, p.created_at
  from public.business_posts p
  where p.status = 'PUBLISHED'
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 50);
$$;

revoke all on function public.get_published_business_posts(integer) from public;
grant execute on function public.get_published_business_posts(integer) to service_role;
