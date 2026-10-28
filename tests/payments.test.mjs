import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {testDatabase} from './database.mjs'
import {loadTs} from './load-ts.mjs'
const A='30000000-0000-4000-8000-000000000001', B='30000000-0000-4000-8000-000000000002', ADMIN='81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e'
let db,plan,op,paid,firstEnd
before(async()=>{
 db=await testDatabase()
 await db.query("insert into auth.users(id,email) values($1,'pay-a@test.test'),($2,'pay-b@test.test')",[A,B])
 plan=(await db.query("select * from plans where is_active and not is_deleted and currency='BRL' limit 1")).rows[0]
})
after(async()=>{if(db)await db.close()})
async function apply(provider,event,payment,sub=null,observed='2026-10-28T15:00Z') {
 return (await db.query("select billing_apply_event($1,$2,'TEST','{}',$3,$4,$5) as result",[provider,event,sub,payment,observed])).rows[0].result
}
test('PIX reserva operação sem sobrescrever assinatura anterior e impede criação duplicada',async()=>{
 op=(await db.query("select billing_reserve_checkout($1,'plan',$2,'asaas','pix-test') as op",[A,plan.id])).rows[0].op
 assert.equal(op.amount_cents,plan.price_cents)
 await assert.rejects(db.query("select billing_reserve_checkout($1,'plan',$2,'asaas','pix-test')",[A,plan.id]),/processamento/)
 assert.equal((await db.query('select status from subscriptions where id=$1',[op.subscription_id])).rows[0].status,'inactive')
})
test('confirmação PIX, duplicata e outro evento não renovam o período novamente',async()=>{
 paid={user_id:A,external_id:'pay_test',aliases:['pay_test'],checkout_id:op.id,status:'paid',amount_cents:op.amount_cents,currency:'BRL',method:'pix',paid_at:'2026-10-28T12:00Z'}
 await apply('asaas','evt-confirmed',paid)
 firstEnd=(await db.query('select current_period_end from subscriptions where id=$1',[op.subscription_id])).rows[0].current_period_end
 assert.equal((await apply('asaas','evt-confirmed',paid)).duplicate,true)
 await apply('asaas','evt-received',{...paid,paid_at:'2026-10-29T12:00Z'},null,'2026-10-29T15:00Z')
 const sub=(await db.query('select * from subscriptions where id=$1',[op.subscription_id])).rows[0]
 assert.equal(sub.status,'active');assert.equal(sub.current_period_end.toISOString(),firstEnd.toISOString())
 assert.equal((await db.query("select count(*)::int n from payments where external_id='pay_test'")).rows[0].n,1)
})
test('falha atômica não registra evento como processado nem libera acesso indevido',async()=>{
 await assert.rejects(apply('asaas','evt-wrong-owner',{...paid,user_id:B}),/Checkout binding/)
 assert.equal((await db.query("select count(*)::int n from webhook_events where event_id='evt-wrong-owner'")).rows[0].n,0)
 await assert.rejects(apply('asaas','evt-wrong-value',{...paid,amount_cents:1}),/amount mismatch/)
})
test('snapshots antigos não sobrescrevem pagamento confirmado',async()=>{
 await apply('asaas','evt-stale',{...paid,status:'pending'},null,'2026-10-27T15:00Z')
 assert.equal((await db.query("select status from payments where external_id='pay_test'")).rows[0].status,'paid')
})
test('estornos parciais e integrais usam os valores efetivos, sem duplicar, e encerram acesso PIX no integral',async()=>{
 const half=Math.floor(paid.amount_cents/2)
 const refunds=[{id:'refund_1',amount_cents:half,status:'succeeded',occurred_at:'2026-10-30T12:00Z'}]
 await apply('asaas','evt-partial',{...paid,refunds},null,'2026-10-30T15:00Z')
 assert.equal((await db.query("select status from payments where external_id='pay_test'")).rows[0].status,'partially_refunded')
 assert.equal((await db.query('select status from subscriptions where id=$1',[op.subscription_id])).rows[0].status,'active')
 refunds.push({id:'refund_2',amount_cents:paid.amount_cents-half,status:'succeeded',occurred_at:'2026-10-31T12:00Z'})
 await apply('asaas','evt-full',{...paid,refunds},null,'2026-10-31T15:00Z')
 const p=(await db.query("select * from payments where external_id='pay_test'")).rows[0]
 assert.equal(p.status,'refunded');assert.equal(p.refunded_amount_cents,p.amount_cents)
 assert.equal((await db.query('select status from subscriptions where id=$1',[op.subscription_id])).rows[0].status,'canceled')
 await apply('asaas','evt-repeat-refund',{...paid,refunds},null,'2026-10-31T16:00Z')
 assert.equal((await db.query('select count(*)::int n from payment_refunds')).rows[0].n,2)
})
test('fatura Stripe e PaymentIntent antigos são conciliados em um lançamento canônico',async()=>{
 await db.query("insert into payments(user_id,provider,external_id,status,amount_cents,currency,method,paid_at) values($1,'stripe','pi_test','paid',10000,'BRL','credit_card','2026-10-20'),($1,'stripe','in_test','paid',10000,'BRL','credit_card','2026-10-20')",[B])
 await apply('stripe','evt-canonical',{user_id:B,external_id:'in_test',aliases:['pi_test','in_test','ch_test'],status:'paid',amount_cents:10000,currency:'BRL',method:'credit_card',paid_at:'2026-10-20T12:00Z'})
 const rows=(await db.query("select is_duplicate,canonical_payment_id from payments where provider='stripe'")).rows
 assert.equal(rows.filter(r=>!r.is_duplicate).length,1);assert.equal(rows.filter(r=>r.is_duplicate).length,1)
 const page=(await db.query("select admin_data_page($1,'payments','{}',1,30) as data",[ADMIN])).rows[0].data
 assert.equal(page.rows.filter(r=>r.provider==='stripe').length,1)
})
test('aluno não pode forjar compra paga nem executar conciliação pelo Supabase',async()=>{
 await db.transaction(async tx=>{
  await tx.exec('set local role authenticated')
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[B])
  await assert.rejects(tx.query("select billing_apply_event('stripe','forged','TEST','{}',null,null,now())"),/permission denied/)
 })
 await db.transaction(async tx=>{
  await tx.exec('set local role authenticated')
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[B])
  await assert.rejects(tx.query("insert into ebook_purchases(user_id,ebook_id,status,amount_cents,currency) values($1,gen_random_uuid(),'paid',0,'BRL')",[B]),/permission denied/)
 })
})
test('financeiro mantém receita bruta, separa estornos pelo mês e exclui duplicatas',()=>{
 const {aggregateAdminReport}=loadTs('src/lib/admin/reporting.ts')
 const r=aggregateAdminReport([{id:B,role:'student',created_at:'2026-01-01'}],[],[{id:'real',user_id:B,amount_cents:10000,currency:'BRL',status:'refunded',paid_at:'2026-10-20',created_at:'2026-10-20'},{id:'copy',is_duplicate:true,amount_cents:10000,currency:'BRL',status:'paid',paid_at:'2026-10-20'}],[],'BRL',new Date('2026-10-28T15:00Z'),[{payment_id:'real',status:'succeeded',amount_cents:3000,currency:'BRL',occurred_at:'2026-10-25'}])
 assert.equal(r.overview.month_revenue_cents,10000);assert.equal(r.overview.month_refunded_cents,3000);assert.equal(r.overview.month_after_refunds_cents,7000)
})
test('assinatura Stripe, cliente e pagamento são persistidos juntos e checkout é concluído',async()=>{
 const stripeOp=(await db.query("select billing_reserve_checkout($1,'plan',$2,'stripe','setup:qa') as op",[B,plan.id])).rows[0].op
 const s={user_id:B,plan_id:plan.id,checkout_id:stripeOp.id,stripe_customer_id:'cus_qa',external_id:'sub_qa',status:'active',external_status:'active',currency:'BRL',unit_amount_cents:10000,billing_cycle_days:30,current_period_start:'2026-10-20T12:00Z',current_period_end:'2026-11-20T12:00Z',cancel_at_period_end:false,last_paid_at:'2026-10-20T12:00Z'}
 await apply('stripe','evt-sub-transaction',{user_id:B,external_id:'in_qa',aliases:['in_qa','pi_qa'],status:'paid',amount_cents:10000,currency:'BRL',method:'credit_card',paid_at:'2026-10-20T12:00Z'},s)
 const local=(await db.query("select * from subscriptions where external_id='sub_qa'")).rows[0]
 assert.equal(local.status,'active')
 const payment=(await db.query("select * from payments where external_id='in_qa'")).rows[0]
 assert.equal(payment.subscription_id,local.id)
 assert.equal((await db.query('select stripe_customer_id from profiles where id=$1',[B])).rows[0].stripe_customer_id,'cus_qa')
 assert.equal((await db.query('select state from billing_checkout_operations where id=$1',[stripeOp.id])).rows[0].state,'completed')
 await apply('stripe','evt-stale-sub',null,{...s,status:'inactive'},'2026-10-19T12:00Z')
 assert.equal((await db.query('select status from subscriptions where id=$1',[local.id])).rows[0].status,'active')
})
test('erro de webhook pode ser reprocessado e erro concorrente não desfaz sucesso',async()=>{
 await db.query("select billing_record_failure('stripe','evt-retry','TEST','{}','sync_failed')")
 assert.equal((await db.query("select processed_at from webhook_events where event_id='evt-retry'")).rows[0].processed_at,null)
 await apply('stripe','evt-retry',null)
 await db.query("select billing_record_failure('stripe','evt-retry','TEST','{}','late_failure')")
 const event=(await db.query("select * from webhook_events where event_id='evt-retry'")).rows[0]
 assert.ok(event.processed_at);assert.equal(event.error_text,null)
})
