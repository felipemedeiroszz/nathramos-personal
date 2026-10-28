import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './load-ts.mjs';
const {databaseFailureKind}=loadTs('src/lib/supabase/errors.ts');
test('diagnóstico distingue esquema ausente de permissão e credenciais',()=>{
 for(const code of ['PGRST200','PGRST202','PGRST204','PGRST205','42P01','42703','42883'])assert.equal(databaseFailureKind({code}),'schema');
 assert.equal(databaseFailureKind({code:'42501'}),'permission');
 assert.equal(databaseFailureKind({code:'PGRST301'}),'credentials');
 assert.equal(databaseFailureKind({code:'PGRST002'}),'connection');
});
test('verificação aponta recurso faltante sem expor detalhes, SQL ou chave',async()=>{
 const {checkAdminDatabase}=loadTs('src/lib/admin/diagnostics.ts',{'server-only':{}});
 const db={from(table){const q={select:()=>q,eq:()=>q,limit:async()=>table==='payment_refunds'?{error:{code:'PGRST205',message:'private SQL token secret'}}:{data:table==='profiles'?[{id:'admin'}]:[]}};return q},rpc:async()=>({data:{},error:null})};
 const result=await checkAdminDatabase(db,'admin');
 assert.equal(result.ok,false);const failed=result.checks.filter(c=>!c.ok);assert.equal(failed.length,1);assert.equal(failed[0].id,'refunds');assert.equal(failed[0].migration,'000041_payment_integrity.sql');
 assert.equal(JSON.stringify(result).includes('secret'),false);
});
test('endpoint nega anônimo, coach e aluno antes de acessar cliente privilegiado',async()=>{
 for(const role of [null,'coach','student']){
  let privileged=0;
  const session={auth:{getUser:async()=>({data:{user:role?{id:'actor'}:null}})},from(){const q={select:()=>q,eq:()=>q,single:async()=>({data:{role,is_deleted:false}})};return q}};
  const {GET}=loadTs('src/app/api/admin/diagnostics/route.ts',{'@/lib/supabase/server':{createClientSSR:async()=>session,createServiceClientSSR:async()=>{privileged++;return{}}},'@/lib/admin/diagnostics':{checkAdminDatabase:async()=>{throw Error('must not execute')}}});
  const response=await GET();assert.equal(response.status,role?403:401);assert.equal(privileged,0);
 }
});
test('administrador consulta diagnóstico sem divulgar a service role key',async()=>{
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_SERVICE_ROLE_KEY='secret-do-not-return';
 try{
  const session={auth:{getUser:async()=>({data:{user:{id:'admin'}}})},from(){const q={select:()=>q,eq:()=>q,single:async()=>({data:{role:'admin',is_deleted:false}})};return q}};
  const {GET}=loadTs('src/app/api/admin/diagnostics/route.ts',{'@/lib/supabase/server':{createClientSSR:async()=>session,createServiceClientSSR:async()=>({})},'@/lib/admin/diagnostics':{checkAdminDatabase:async()=>({ok:true,checks:[]})}});
  const response=await GET();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal((await response.text()).includes('secret-do-not-return'),false);
 }finally{if(key===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=key;}
});
test('SQL de diagnóstico reconhece funções reais e aponta função removida',async()=>{
 const {testDatabase}=await import('./database.mjs');const {readFile}=await import('node:fs/promises');
 const db=await testDatabase();
 try{
  const sql=await readFile('supabase/diagnostics/admin-readiness.sql','utf8');
  let report=(await db.query(sql)).rows;
  assert.ok(report.length>=10);assert.ok(report.every(r=>r.present));assert.ok(report.filter(r=>r.kind==='function').every(r=>r.service_can_execute));
  await db.exec('drop function public.admin_data_page(uuid,text,jsonb,integer,integer)');
  report=(await db.query(sql)).rows;
  const missing=report.filter(r=>!r.present);assert.equal(missing.length,1);assert.ok(missing[0].resource.includes('admin_data_page'));
 }finally{await db.close();}
});
