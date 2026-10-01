-- Phase 7 follow-up: use an explicit path-prefix check for avatar objects.
--
-- Avatar object names are written as:
--   <auth-user-id>/avatar.<extension>
--
-- Keep writes scoped to the authenticated user's own prefix without relying on
-- storage.foldername(name) helper behavior.

drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

create policy "Users can upload their own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

create policy "Users can update their own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
)
with check (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

create policy "Users can delete their own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);
