-- ============================================================================
-- 000011 - BUCKET DE IMAGENS DE PRODUTOS (ALIMENTOS E SUPLEMENTOS)
-- Bucket público para anexar imagem a cada alimento e suplemento.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 01. CRIAR BUCKET (se não existir)
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
      values ('product-images', 'product-images', true, false, 5242880, array['image/png','image/jpeg','image/webp'])
      on conflict (id) do nothing;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 02. POLÍTICAS RLS DO BUCKET
-- ----------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    perform set_config('search_path','storage,public', true);

    drop policy if exists "Product Images - Public Read" on objects;
    drop policy if exists "Product Images - Authenticated Upload" on objects;
    drop policy if exists "Product Images - Owner Update" on objects;
    drop policy if exists "Product Images - Owner Delete" on objects;

    create policy "Product Images - Public Read"
      on objects for select
      to public
      using (bucket_id = 'product-images');

    create policy "Product Images - Authenticated Upload"
      on objects for insert
      to authenticated
      with check (bucket_id = 'product-images');

    create policy "Product Images - Owner Update"
      on objects for update
      to authenticated
      using (bucket_id = 'product-images')
      with check (bucket_id = 'product-images');

    create policy "Product Images - Owner Delete"
      on objects for delete
      to authenticated
      using (bucket_id = 'product-images');
  end if;
end $$;
