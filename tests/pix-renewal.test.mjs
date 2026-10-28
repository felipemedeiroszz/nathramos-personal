import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import {testDatabase} from './database.mjs'
import {loadTs} from './load-ts.mjs'
const USER='40000000-0000-4000-8000-000000000001'
let db,plan,oldId
before(async()=>{
 db=await testDatabase()
 await db.query("insert into auth.users(id,email) values($1,'prepaid@test.test')",[USER])
 plan=(await db.query("select * from plans where is_active and currency='BRL' limit 1")).rows[0]
 await db.query('update plans set grace_days=10 where id=$1',[plan.id])
 oldId=(await db.query("insert into subscriptions(user_id,plan_id,provider,external_id,source,status,currency,unit_amount_cents,billing_cycle_days,current_period_start,current_period_end,last_paid_at) values($1,$2,'asaas','pay_expired','asaas_pix','active','BRL',10000,30,now()-interval '30 days',now(),now()-interval '30 days') returning id",[USER,plan.id])).rows[0].id
})
after(async()=>{if(db)await db.close()})
const access=async()=> (await db.query('select * from can_access_platform($1)',[USER])).rows[0]
test('PIX bloqueia exatamente no vencimento mesmo com tolerância configurada',async()=>{
 const result=await access()
 assert.equal(result.allowed,false);assert.equal(result.status,'blocked');assert.equal(result.reason,'pix_period_expired_payment_required')
 await db.query("update subscriptions set source=null,status='past_due' where id=$1",[oldId])
 assert.equal((await access()).allowed,false)
})
test('novo PIX pendente não libera acesso; confirmado libera um novo período',async()=>{
 const op=(await db.query("select billing_reserve_checkout($1,'plan',$2,'asaas','pix-renewal') as op",[USER,plan.id])).rows[0].op
 const payment={user_id:USER,checkout_id:op.id,external_id:'pay_renewal',aliases:['pay_renewal'],status:'pending',amount_cents:op.amount_cents,currency:'BRL',method:'pix'}
 const apply=async(id,p)=>db.query("select billing_apply_event('asaas',$1,'TEST','{}',null,$2,now())",[id,p])
 await apply('evt-renewal-pending',payment)
 assert.equal((await access()).allowed,false)
 await apply('evt-renewal-paid',{...payment,status:'paid',paid_at:new Date().toISOString()})
 assert.equal((await access()).allowed,true)
 await db.query("update subscriptions set current_period_end=now() where id=$1",[op.subscription_id])
 assert.equal((await access()).allowed,false)
})
test('cartão incompleto mantém bloqueio; primeira fatura paga libera assinatura recorrente',async()=>{
 const op=(await db.query("select billing_reserve_checkout($1,'plan',$2,'stripe','setup:monthly') as op",[USER,plan.id])).rows[0].op
 const now=new Date(),end=new Date(now.getTime()+30*86400000)
 const sub={user_id:USER,plan_id:plan.id,checkout_id:op.id,stripe_customer_id:'cus_monthly',external_id:'sub_monthly',status:'inactive',external_status:'incomplete',currency:'BRL',unit_amount_cents:plan.price_cents,billing_cycle_days:30,current_period_start:now.toISOString(),current_period_end:end.toISOString(),cancel_at_period_end:false}
 const p={user_id:USER,external_id:'in_monthly',aliases:['in_monthly','pi_monthly'],status:'pending',amount_cents:plan.price_cents,currency:'BRL',method:'credit_card'}
 const apply=async(id,s,payment)=>db.query("select billing_apply_event('stripe',$1,'TEST','{}',$2,$3,now())",[id,s,payment])
 await apply('evt-card-incomplete',sub,p)
 assert.equal((await access()).allowed,false)
 await apply('evt-card-paid',{...sub,status:'active',external_status:'active',last_paid_at:now.toISOString()},{...p,status:'paid',paid_at:now.toISOString()})
 assert.equal((await access()).allowed,true)
 const current=(await db.query('select billing_current_subscription($1) as sub',[USER])).rows[0].sub
 assert.equal(current.provider,'stripe');assert.equal(current.billing_cycle_days,30)
})
test('relatórios classificam PIX vencido como bloqueado sem tolerância',()=>{
 const {effectiveSubscriptionStatus}=loadTs('src/lib/admin/reporting.ts')
 assert.equal(effectiveSubscriptionStatus({provider:'asaas',source:'asaas_pix',status:'active',current_period_end:'2026-10-28T12:00Z'},10,new Date('2026-10-28T12:00Z')),'blocked')
 assert.equal(effectiveSubscriptionStatus({provider:'stripe',status:'active',current_period_end:'2026-10-28T12:00Z'},10,new Date('2026-10-28T12:00Z')),'past_due')
})
