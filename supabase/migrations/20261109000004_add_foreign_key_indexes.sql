-- Add indexes for foreign-key columns flagged by Supabase performance advisors.
-- These support owner, inbox, application-history and notification lookups.
create index if not exists application_status_history_application_id_idx
  on public.application_status_history (application_id);
create index if not exists application_status_history_changed_by_idx
  on public.application_status_history (changed_by);
create index if not exists applications_payment_updated_by_idx
  on public.applications (payment_updated_by);
create index if not exists applications_reviewed_by_idx
  on public.applications (reviewed_by);
create index if not exists business_page_messages_sender_id_idx
  on public.business_page_messages (sender_id);
create index if not exists business_page_posts_author_id_idx
  on public.business_page_posts (author_id);
create index if not exists business_page_posts_page_id_idx
  on public.business_page_posts (page_id);
create index if not exists business_pages_owner_id_idx
  on public.business_pages (owner_id);
create index if not exists business_posts_created_by_idx
  on public.business_posts (created_by);
create index if not exists conversations_application_id_idx
  on public.conversations (application_id);
create index if not exists messages_sender_id_idx
  on public.messages (sender_id);
create index if not exists staff_notifications_recipient_id_idx
  on public.staff_notifications (recipient_id);
