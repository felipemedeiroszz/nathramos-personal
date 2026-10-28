import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'

export async function testDatabase() {
 const extensions = {}
 for (const name of ['uuid_ossp','pgcrypto','pg_trgm','btree_gin','btree_gist']) {
   const module = await import(`@electric-sql/pglite/contrib/${name}`)
   extensions[name === 'uuid_ossp' ? 'uuid-ossp' : name] = Object.values(module).find(value => value?.setup)
 }
 const db = new PGlite({ extensions })
 await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
 create table storage.buckets(id text primary key, name text, public boolean, avif_autodetection boolean, file_size_limit bigint, allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 create publication supabase_realtime;
 grant usage on schema public,auth,storage to authenticated,anon,service_role;
 grant execute on all functions in schema auth to authenticated,anon,service_role;
 alter default privileges in schema public grant all on tables to authenticated,service_role;
 alter default privileges in schema public grant usage,select on sequences to authenticated,service_role;
 `)
 // Legacy migration 5 targets an existing production auth user; supply a fixture
 // for that historical prerequisite. No production identities or passwords used.
 await db.exec("insert into auth.users(id,email) values('81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e','admin@example.test')")
 for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) {
   try { await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8')) }
   catch(error) { await db.close(); throw new Error(`Migration ${file}: ${error.message}`, { cause:error }) }
 }
 await db.exec('grant all on all tables in schema public to service_role; grant usage,select on all sequences in schema public to service_role;')
 return db
}
