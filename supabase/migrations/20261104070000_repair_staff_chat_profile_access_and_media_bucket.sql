-- Restore least-privilege server access required by authenticated staff chat APIs.
-- This does not grant profile access to anon or authenticated clients.
grant select on table public.profiles to service_role;

-- Match the private storage bucket limits and MIME allowlist to the chat API.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]
where id = 'hopebridge-private-uploads';
