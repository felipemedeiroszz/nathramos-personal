import {test} from 'node:test'
import assert from 'node:assert/strict'
import {loadTs} from './load-ts.mjs'
const mocks={'server-only':{},'@/lib/supabase/server':{},'@/lib/auth/access':{},'./stripe':{},'./asaas':{}}
const {asaasDate,asaasStatus,normalizeAsaasRefunds}=loadTs('src/lib/payments/sync.ts',mocks)
test('Asaas: risco aprovado, disputa e estorno pendente não são confirmação de dinheiro',()=>{
 for(const s of ['APPROVED','AWAITING_RISK_ANALYSIS','CHARGEBACK_DISPUTE','REFUND_REQUESTED']) assert.equal(asaasStatus(s),'processing')
 for(const s of ['CONFIRMED','RECEIVED','DUNNING_RECEIVED']) assert.equal(asaasStatus(s),'paid')
 assert.equal(asaasDate('2026-10-28'),'2026-10-28T03:00:00.000Z')
})
test('estornos Asaas usam identidade estável mesmo quando a ordem muda',()=>{
 const a={dateCreated:'2026-10-28 10:00:00',value:10,status:'DONE'},b={dateCreated:'2026-10-29 10:00:00',value:20,status:'PENDING'}
 const first=normalizeAsaasRefunds('pay_1',[a,b]),second=normalizeAsaasRefunds('pay_1',[b,a])
 assert.equal(first[0].id,second[1].id);assert.equal(first[1].id,second[0].id)
 assert.equal(first[0].status,'succeeded');assert.equal(first[1].status,'pending')
})
test('Stripe: confirmação busca estado atual e usa a fatura canônica, valor pago e data efetiva',async()=>{
 const applied=[]
 const sub={id:'sub_test',customer:'cus_test',metadata:{user_id:'user'},status:'active',currency:'brl',current_period_start:1793100000,current_period_end:1795778400,items:{data:[{price:{id:'price_test',unit_amount:10000,recurring:{interval:'month',interval_count:1}}}]},latest_invoice:{id:'in_test',paid:true,amount_paid:8000,amount_due:10000,currency:'brl',payment_intent:'pi_test',charge:'ch_test',status_transitions:{paid_at:1793190000}}}
 const stripe={subscriptions:{retrieve:async()=>sub},paymentIntents:{retrieve:async()=>({id:'pi_test',latest_charge:'ch_test'})},charges:{retrieve:async()=>({id:'ch_test',disputed:false,balance_transaction:{currency:'brl',fee:300}})},refunds:{list:()=>({async *[Symbol.asyncIterator](){}})}}
 const db={from:()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{id:'plan',stripe_price_id:'price_test',price_cents:10000,billing_cycle_days:30},error:null})};return q},rpc:async(name,args)=>{applied.push(args);return{data:{},error:null}}}
 const {syncStripeSubscription}=loadTs('src/lib/payments/sync.ts',{'server-only':{},'@/lib/supabase/server':{createServiceClientSSR:async()=>db},'./stripe':{getStripeClient:()=>stripe},'./asaas':{}})
 await syncStripeSubscription('sub_test','evt_test','invoice.paid')
 assert.equal(applied.length,1)
 const {p_subscription:s,p_payment:p}=applied[0]
 assert.equal(s.billing_cycle_days,30);assert.equal(s.current_period_end,new Date(sub.current_period_end*1000).toISOString())
 assert.equal(p.external_id,'in_test');assert.equal(p.amount_cents,8000);assert.equal(p.fee_cents,300);assert.equal(p.paid_at,new Date(1793190000*1000).toISOString())
 assert.deepEqual(Array.from(p.aliases),['in_test','pi_test','ch_test'])
})
test('webhook Stripe rejeita assinatura inválida e responde 500 se a transação falhar',async()=>{
 let invalid=true,failed=0
 const {POST}=loadTs('src/app/api/webhooks/stripe/route.ts',{
  '@/lib/payments/stripe':{StripeProvider:{constructWebhookEvent:async()=>{if(invalid)throw Error('signature');return{id:'evt',type:'invoice.paid',data:{object:{id:'in_1'}}}}}},
  '@/lib/payments/services':{PaymentService:{isEventProcessed:async()=>false,markEventProcessed:async(p)=>{assert.equal(p.errorText,'payment_sync_failed');failed++}}},
  '@/lib/payments/sync':{syncStripeEvent:async()=>{throw Error('database offline')}}
 })
 const previous=process.env.STRIPE_WEBHOOK_SECRET;process.env.STRIPE_WEBHOOK_SECRET='test'
 try {
  assert.equal((await POST(new Request('http://test',{method:'POST',body:'{}'}))).status,400)
  invalid=false
  assert.equal((await POST(new Request('http://test',{method:'POST',body:'{}'}))).status,500)
  assert.equal(failed,1)
 } finally {if(previous===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=previous}
})
test('Asaas exige token no cabeçalho e id estável do evento',async()=>{
 const {POST}=loadTs('src/app/api/webhooks/asaas/route.ts',{
 '@/lib/payments/asaas':{AsaasProvider:{getWebhookToken:()=> 'secret'}},
 '@/lib/payments/services':{PaymentService:{isEventProcessed:async()=>false}},
 '@/lib/payments/sync':{syncAsaasPayment:async()=>{}}
 })
 assert.equal((await POST(new Request('http://test?token=secret',{method:'POST',body:'{}'}))).status,401)
 assert.equal((await POST(new Request('http://test',{method:'POST',headers:{'asaas-access-token':'secret'},body:JSON.stringify({event:'PAYMENT_RECEIVED'})}))).status,400)
 assert.equal((await POST(new Request('http://test',{method:'POST',headers:{'asaas-access-token':'secret'},body:JSON.stringify({id:'evt_1',event:'PAYMENT_RECEIVED',payment:{id:'pay_1'}})}))).status,200)
})
