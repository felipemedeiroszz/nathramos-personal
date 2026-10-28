import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadTs} from './load-ts.mjs'
const user='user-a',other='user-b';
function dbFor(op={id:'op',user_id:user,kind:'plan',provider:'asaas',remote_id:'pay_a',state:'ready'}) {
 const tables={profiles:[{id:user,role:'student',is_deleted:false,full_name:'Aluno'}],payments:[{id:'a',user_id:user,is_duplicate:false,status:'paid',amount_cents:10000,currency:'BRL',metadata:{secret:'private'}},{id:'b',user_id:other,is_duplicate:false,status:'paid'},{id:'duplicate',user_id:user,is_duplicate:true,status:'paid'}],billing_checkout_operations:[op]};
 const writes=[];
 return {writes,tables,from(table){let filters=[],start=0,end=Infinity,cols='*',single=false,patch;
  const q={select(c){cols=c;return q},eq(k,v){filters.push(row=>row[k]===v);return q},in(k,v){filters.push(row=>v.includes(row[k]));return q},order(){return q},range(s,e){start=s;end=e;return q},limit(n){end=n-1;return q},single(){single=true;return q},update(p){patch=p;return q},then(resolve,reject){try{let rows=(tables[table]||[]).filter(row=>filters.every(f=>f(row)));if(patch){writes.push({table,patch});rows.forEach(r=>Object.assign(r,patch))}const count=rows.length;rows=rows.slice(start,end+1).map(row=>cols==='*'?row:Object.fromEntries(cols.split(',').map(k=>[k,row[k]])));return Promise.resolve({data:single?rows[0]||null:rows,error:single&&!rows.length?Error('not found'):null,count}).then(resolve,reject)}catch(error){return Promise.reject(error).then(resolve,reject)}}};return q;}
 }
}
const common={'server-only':{},'@/lib/auth/access':{canAccessPlatform:async()=>({allowed:false,status:'blocked',reason:'pix_period_expired_payment_required'})},'./services':{SubscriptionService:{getActive:async()=>null}}};
test('central permite consultar e renovar com acesso bloqueado, sem expor outro aluno ou metadados',async()=>{
 const db=dbFor();const {studentBillingSummary}=loadTs('src/lib/payments/student.ts',{...common,'./sync':{billingDb:async()=>db}});
 const data=await studentBillingSummary(user);
 assert.equal(data.access.allowed,false);assert.equal(data.payments.rows.length,1);assert.equal(data.payments.rows[0].id,'a');assert.equal('metadata' in data.payments.rows[0],false);
});
test('histórico valida filtros e não transforma erro de banco em lista vazia',async()=>{
 const db=dbFor();const {studentPaymentPage,paymentFilters}=loadTs('src/lib/payments/student.ts',{...common,'./sync':{billingDb:async()=>db}});
 assert.throws(()=>paymentFilters({page:'-1'}),/Página/);assert.throws(()=>paymentFilters({status:'forged'}),/Status/);
 assert.equal((await studentPaymentPage(user,{status:'pending'})).rows.length,0);
 db.from=()=>{const q={select:()=>q,eq:()=>q,order:()=>q,range:async()=>({error:Error('offline')})};return q};
 await assert.rejects(studentPaymentPage(user),/offline/);
});
function pendingEnv({paid=false,foreign=false,fail=false}={}) {
 const db=dbFor({id:'op',user_id:foreign?other:user,kind:'plan',provider:'asaas',remote_id:'pay_a',state:'ready'});const calls=[];
 const api=loadTs('src/lib/payments/pending.ts',{'server-only':{},'./student':{billingProfile:async()=>({})},'./sync':{billingDb:async()=>db,syncAsaasPayment:async()=>calls.push('sync')},'./asaas':{AsaasProvider:{getPayment:async()=>({id:'pay_a',status:paid?'RECEIVED':'PENDING'}),deletePayment:async()=>{calls.push('delete');if(fail)throw Error('provider unavailable')}}},'./stripe':{getStripeClient:()=>({})}});
 return {db,calls,...api};
}
test('troca de meio cancela somente tentativa própria não paga e confirma no provedor antes de salvar',async()=>{
 const env=pendingEnv();await env.cancelPendingCheckout(user,'op');assert.deepEqual(env.calls,['delete','sync']);assert.equal(env.db.writes[0].patch.state,'completed');
 const foreign=pendingEnv({foreign:true});await assert.rejects(foreign.cancelPendingCheckout(user,'op'),/não encontrada/);assert.equal(foreign.calls.length,0);
});
test('pagamento já confirmado não é excluído para trocar de meio e falha externa preserva tentativa',async()=>{
 const paid=pendingEnv({paid:true});await assert.rejects(paid.cancelPendingCheckout(user,'op'),/mudou/);assert.deepEqual(paid.calls,['sync']);assert.equal(paid.db.writes.length,0);
 const failed=pendingEnv({fail:true});await assert.rejects(failed.cancelPendingCheckout(user,'op'),/unavailable/);assert.equal(failed.db.writes.length,0);
});
test('retomada de cartão usa a fatura existente, sem criar outra assinatura',async()=>{
 const db=dbFor({id:'op',user_id:user,kind:'plan',provider:'stripe',remote_id:'sub_a',state:'ready'});
 const {resumePendingCheckout}=loadTs('src/lib/payments/pending.ts',{'server-only':{},'./student':{billingProfile:async()=>({})},'./sync':{billingDb:async()=>db,syncStripeSubscription:async()=>({})},'./asaas':{},'./stripe':{getStripeClient:()=>({subscriptions:{retrieve:async()=>({id:'sub_a',status:'incomplete',latest_invoice:{hosted_invoice_url:'https://invoice.stripe.com/test'}})}})}});
 assert.equal((await resumePendingCheckout(user,'op','pt-BR')).url,'https://invoice.stripe.com/test');
});
test('exportação gera Excel real e CSV somente com os dados do usuário autenticado',async()=>{
 const {default:ExcelJS}=await import('exceljs');
 const rows=[{id:'own',amount_cents:10000,currency:'BRL',status:'paid',method:'pix',external_id:'pay_own'}];
 const {GET}=loadTs('src/app/api/payments/history/export/route.ts',{
  '@/lib/api/response':{requireApiUser:async()=>({userId:user}),handleApiError:error=>{throw error},ApiValidationError:Error},
  '@/lib/payments/student':{billingProfile:async id=>assert.equal(id,user),studentPaymentPage:async id=>{assert.equal(id,user);return{rows,total:1,page:1,size:15}}}
 });
 const csv=await GET({nextUrl:new URL('http://test/api?status=paid')});const content=await csv.text();
 assert.ok(content.includes('pay_own'));assert.ok(content.includes('100.00'));assert.equal(csv.headers.get('Cache-Control'),'private, no-store');
 const xlsx=await GET({nextUrl:new URL('http://test/api?format=xlsx')});
 assert.ok(xlsx.headers.get('Content-Type').includes('spreadsheetml'));
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(await xlsx.arrayBuffer()));
 assert.equal(workbook.getWorksheet('Pagamentos').getCell('A2').value,'own');
 assert.equal(workbook.getWorksheet('Pagamentos').rowCount,2);
 assert.equal(workbook.getWorksheet('Pagamentos').getCell('F2').value,100);
});
test('PIX valida documento antes de reservar ou criar cobrança',async()=>{
 const {validCpf}=loadTs('src/lib/payments/document.ts');
 assert.equal(validCpf('249.715.637-92'),true);assert.equal(validCpf('00000000000'),false);assert.equal(validCpf('24971563791'),false);
 let reserved=0;
 const {createAsaasPix}=loadTs('src/lib/payments/checkout.ts',{'server-only':{},'./sync':{billingDb:async()=>{reserved++;return{}}},'./services':{ProfileService:{getProfile:async()=>({id:user,role:'student',is_deleted:false,asaas_customer_id:null,cpf:null})}},'./asaas':{}});
 await assert.rejects(createAsaasPix(user,'plan','plan-a'),/CPF/);assert.equal(reserved,0);
});
