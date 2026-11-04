begin;
-- Public catalog images remain readable. Only administrators may mutate them.
create policy product_images_admin_insert on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'product-images' or public.is_admin());
create policy product_images_admin_update on storage.objects
  as restrictive for update to authenticated
  using (bucket_id <> 'product-images' or public.is_admin())
  with check (bucket_id <> 'product-images' or public.is_admin());
create policy product_images_admin_delete on storage.objects
  as restrictive for delete to authenticated
  using (bucket_id <> 'product-images' or public.is_admin());
update storage.buckets set file_size_limit=5242880,
  allowed_mime_types=array['image/png','image/jpeg','image/webp']
  where id='product-images';
commit;
