-- Business workspaces: extend the existing single-owner business_pages model.
-- Review and apply separately; the application never executes this file.

alter table public.business_pages
  add column if not exists contact_phone text not null default '';

alter table public.business_page_posts
  add column if not exists media_path text,
  add column if not exists media_type text,
  add column if not exists media_url text,
  add column if not exists status text not null default 'PUBLISHED';

alter table public.business_page_posts
  add constraint business_page_posts_status_check check (status in ('DRAFT','PUBLISHED'));

alter table public.business_page_posts
  drop constraint if exists business_page_posts_body_check;
alter table public.business_page_posts
  add constraint business_page_posts_body_check check (
    (char_length(trim(body)) between 1 and 3000)
    or (media_path is not null and char_length(trim(body)) = 0)
  );

drop policy if exists "Public can read posts on published pages" on public.business_page_posts;
create policy "Public can read published posts on published pages"
on public.business_page_posts for select to anon, authenticated
using (
  status = 'PUBLISHED'
  and exists (
    select 1 from public.business_pages p
    where p.id = business_page_posts.page_id and p.published = true
  )
);
drop policy if exists "Business owners read their page drafts" on public.business_page_posts;
create policy "Business owners read their page drafts"
on public.business_page_posts for select to authenticated
using (
  exists (
    select 1 from public.business_pages p
    where p.id = business_page_posts.page_id and p.owner_id = (select auth.uid())
  )
);

-- Private objects remain inaccessible to other tenants, including their owners.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-private-media', 'business-private-media', false, 26214400,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Business owners read their private media" on storage.objects;
create policy "Business owners read their private media"
on storage.objects for select to authenticated
using (
  bucket_id = 'business-private-media'
  and exists (
    select 1 from public.business_pages p
    where p.id::text = (storage.foldername(name))[1]
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "Business owners upload private media" on storage.objects;
create policy "Business owners upload private media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'business-private-media'
  and exists (
    select 1 from public.business_pages p
    where p.id::text = (storage.foldername(name))[1]
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "Business owners update private media" on storage.objects;
create policy "Business owners update private media"
on storage.objects for update to authenticated
using (
  bucket_id = 'business-private-media'
  and exists (
    select 1 from public.business_pages p
    where p.id::text = (storage.foldername(name))[1]
      and p.owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'business-private-media'
  and exists (
    select 1 from public.business_pages p
    where p.id::text = (storage.foldername(name))[1]
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "Business owners delete private media" on storage.objects;
create policy "Business owners delete private media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'business-private-media'
  and exists (
    select 1 from public.business_pages p
    where p.id::text = (storage.foldername(name))[1]
      and p.owner_id = (select auth.uid())
  )
);

-- Seed HOPEBRIDGE as a page tenant for an existing administrator. The legacy
-- application, status, and support workflows remain on their current routes.
insert into public.business_pages (
  owner_id, name, slug, category, description, contact_email, published
)
select p.id,
       'HOPEBRIDGE Financial Assistance',
       'hopebridge-financial-assistance',
       'Financial assistance information',
       'Information, application access and customer support in one place.',
       '',
       true
from public.profiles p
where p.role = 'admin'
  and not exists (select 1 from public.business_pages b where b.slug = 'hopebridge-financial-assistance')
order by p.created_at asc
limit 1;

-- Preserve published legacy profile posts under the HOPEBRIDGE tenant page.
insert into public.business_page_posts (page_id, author_id, body, media_url, media_type, created_at)
select b.id, p.created_by,
       left(coalesce(nullif(trim(p.caption), ''), 'HOPEBRIDGE shared a public update.'), 3000),
       p.media_url, p.media_type, p.created_at
from public.business_posts p
cross join public.business_pages b
where b.slug = 'hopebridge-financial-assistance'
  and p.status = 'PUBLISHED'
  and not exists (
    select 1 from public.business_page_posts bp
    where bp.page_id = b.id and bp.created_at = p.created_at and bp.body = left(coalesce(nullif(trim(p.caption), ''), 'HOPEBRIDGE shared a public update.'), 3000)
  );

