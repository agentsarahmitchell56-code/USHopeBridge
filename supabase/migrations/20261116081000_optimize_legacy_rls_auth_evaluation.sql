-- Avoid per-row auth helper evaluation in selected legacy RLS policies.
-- These changes preserve the existing predicates and access model.
alter policy "staff can read profiles" on public.profiles
  using ((id = (select auth.uid())) or (select public.is_staff()));

alter policy "Users update own profile details" on public.profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy "staff can read messages" on public.messages
  using ((select public.is_staff()));

alter policy "staff can send messages" on public.messages
  with check (
    (select public.is_staff())
    and sender_type = 'agent'
    and sender_id = (select auth.uid())
  );

alter policy "Staff manage business posts" on public.business_posts
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin','agent']::text[])
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['admin','agent']::text[])
  ));

alter policy "Public can view published business pages" on public.business_pages
  using (published = true or owner_id = (select auth.uid()));

alter policy "Owners manage their business pages" on public.business_pages
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter policy "Owners manage their page posts" on public.business_page_posts
  using (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.business_pages p
      where p.id = business_page_posts.page_id
        and p.owner_id = (select auth.uid())
    )
  )
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.business_pages p
      where p.id = business_page_posts.page_id
        and p.owner_id = (select auth.uid())
    )
  );