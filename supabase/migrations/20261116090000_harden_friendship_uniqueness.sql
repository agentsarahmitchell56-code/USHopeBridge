-- Enforce one relationship row per pair, regardless of request direction.
-- Existing rows are retained; stop before creating the index if legacy duplicates exist.
do $$
begin
  if exists (
    select 1
    from public.friendships
    group by least(requester_id, addressee_id), greatest(requester_id, addressee_id)
    having count(*) > 1
  ) then
    raise exception 'Duplicate friendship rows exist; reconcile them before applying this migration.';
  end if;
end
$$;

create unique index if not exists friendships_one_relationship_per_pair_idx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

alter table public.friendships
  drop constraint if exists friendships_distinct_users_check;
alter table public.friendships
  add constraint friendships_distinct_users_check
  check (requester_id <> addressee_id);

alter table public.friendships
  drop constraint if exists friendships_status_check;
alter table public.friendships
  add constraint friendships_status_check
  check (status in ('pending', 'accepted', 'declined', 'blocked'));
