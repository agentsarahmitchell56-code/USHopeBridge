-- Prevent browser roles from truncating tenant and staff tables.
-- TRUNCATE bypasses row-level security and is not required by the application.
revoke truncate on table
  public.business_page_posts,
  public.business_pages,
  public.business_posts,
  public.staff_notifications
from public, anon, authenticated;
