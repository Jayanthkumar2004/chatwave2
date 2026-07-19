/*
# Storage bucket policies for avatars and attachments

Both buckets are public (read anyone). Writes are scoped so authenticated users
can upload files. Avatars live under a per-user folder; attachments under a
per-user folder. Anyone authenticated can read; only the owner of a folder can
write/delete within it (path prefix matches their auth.uid).
*/

-- avatars: public read, owner write
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
TO public USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
CREATE POLICY "avatars_owner_insert"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
TO authenticated USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
) WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
CREATE POLICY "avatars_owner_delete"
ON storage.objects FOR DELETE
TO authenticated USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- attachments: public read (shared media), owner write
DROP POLICY IF EXISTS "attachments_public_read" ON storage.objects;
CREATE POLICY "attachments_public_read"
ON storage.objects FOR SELECT
TO public USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "attachments_owner_insert" ON storage.objects;
CREATE POLICY "attachments_owner_insert"
ON storage.objects FOR INSERT
TO authenticated WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "attachments_owner_delete" ON storage.objects;
CREATE POLICY "attachments_owner_delete"
ON storage.objects FOR DELETE
TO authenticated USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
