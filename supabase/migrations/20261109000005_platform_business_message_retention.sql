-- Platform customer-message retention: expire a conversation 12 months after
-- the customer's most recent message. This function only selects candidates;
-- the server route removes private storage objects and then the database rows.

create index if not exists business_page_messages_customer_retention_idx
  on public.business_page_messages (conversation_id, created_at desc)
  where sender_type = 'customer';

create or replace function public.get_expired_business_conversations(
  p_cutoff timestamptz,
  p_limit integer default 100
)
returns table (
  conversation_id uuid,
  attachment_paths text[]
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  with customer_activity as (
    select
      c.id,
      coalesce(max(m.created_at) filter (where m.sender_type = 'customer'), c.created_at) as last_customer_activity
    from public.business_page_conversations c
    left join public.business_page_messages m on m.conversation_id = c.id
    group by c.id, c.created_at
  ),
  expired as (
    select ca.id
    from customer_activity ca
    where ca.last_customer_activity < p_cutoff
    order by ca.last_customer_activity asc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  )
  select
    e.id,
    coalesce(
      array_agg(m.attachment_path) filter (where m.attachment_path is not null),
      array[]::text[]
    )
  from expired e
  left join public.business_page_messages m on m.conversation_id = e.id
  group by e.id;
$$;

revoke all on function public.get_expired_business_conversations(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.get_expired_business_conversations(timestamptz, integer) to service_role;

comment on function public.get_expired_business_conversations(timestamptz, integer)
is 'Returns Platform business conversations whose last customer message is older than the supplied cutoff, with their private attachment paths. Service role only.';
