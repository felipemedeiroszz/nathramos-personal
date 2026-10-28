import {build} from 'esbuild';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/luis.medeiros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve('artifacts/student-billing-ui');await mkdir(out,{recursive:true});
await writeFile(path.join(out,'navigation.mjs'),`export const useRouter=()=>({refresh:()=>{window.__refresh=(window.__refresh||0)+1},push:url=>window.__navigate=url});`);
await writeFile(path.join(out,'link.mjs'),`import React from 'react';export default function Link(p){return React.createElement('a',p)}`);
await writeFile(path.join(out,'entry.mjs'),`
import React from 'react';import {createRoot} from 'react-dom/client';import {PaymentCenter} from '../../src/components/payments/PaymentCenter';import {PixCheckoutPanel} from '../../src/components/payments/PixCheckoutPanel';
const params=new URLSearchParams(location.search),locale=params.get('locale')||'pt-BR',kind=params.get('kind')||'blocked',now=new Date().toISOString(),end=new Date(Date.now()+86400000).toISOString();
const payment={id:'payment-a',external_id:'pay_sample',status:'pending',method:'pix',provider:'asaas',amount_cents:14990,currency:'BRL',created_at:now,paid_at:null,refunded_amount_cents:0,pix_copy_paste:'000201TESTE-DE-PIX',pix_expires_at:end,description_pt:'Mensalidade · Plano completo',description_en:'Membership · Full plan'};
const card=kind==='card';const data={name:'Mariana',access:{allowed:card,status:card?'active':'blocked',reason:'pix_period_expired_payment_required'},subscription:{id:'subscription-a',provider:card?'stripe':'asaas',source:card?'stripe':'asaas_pix',status:card?'active':'blocked',external_id:card?'sub_sample':'pay_old',cancel_at_period_end:false,unit_amount_cents:14990,currency:'BRL',billing_cycle_days:30,current_period_end:card?end:now,plan:{name_pt:'Plano completo',name_en:'Full plan'}},payments:{rows:card?[{...payment,status:'partially_refunded',refunded_amount_cents:2990,method:'credit_card',provider:'stripe'}]:[payment],page:1,total:1,size:15,status:'all'},operations:card?[]:[{id:'operation-a',provider:'asaas',kind:'plan',remote_id:'pay_sample',state:'ready',created_at:now,expires_at:end,amount_cents:14990,currency:'BRL'}]};
const labels={title:'PIX',qr:'QR Code',copyPaste:'PIX copia e cola',copy:'Copiar',copied:'Copiado',expires:'Válido até',expired:'Vencido',refresh:'Tentar novamente',instructions:'Escaneie ou copie o código no seu banco.',awaiting:'Aguardando confirmação',paymentError:'Falha no pagamento'};
createRoot(document.getElementById('app')).render(kind==='pix'?React.createElement(PixCheckoutPanel,{locale,needsDocument:true,planId:'plan-a',labels,onSuccess:()=>window.__paid=true}):React.createElement(PaymentCenter,{locale,data}));
`);
await build({entryPoints:[path.join(out,'entry.mjs')],outfile:path.join(out,'bundle.js'),bundle:true,format:'iife',platform:'browser',jsx:'automatic',alias:{'@':path.resolve('src'),'next/navigation':path.join(out,'navigation.mjs'),'next/link':path.join(out,'link.mjs')},logLevel:'silent'});
const css=(await readdir('.next/static/css')).filter(f=>f.endsWith('.css')).map(f=>`<link rel="stylesheet" href="/_next/static/css/${f}">`).join('');
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://test');let target;if(url.pathname.startsWith('/_next/static/'))target=path.resolve('.next/static',url.pathname.slice('/_next/static/'.length));else if(url.pathname==='/bundle.js')target=path.join(out,'bundle.js');if(target){assert.ok(target.startsWith(path.resolve('.next/static'))||target.startsWith(out));res.setHeader('Content-Type',target.endsWith('.css')?'text/css':'application/javascript');res.end(await readFile(target));return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body class="bg-background text-text" style="--font-inter:Arial,sans-serif;font-family:Arial,sans-serif"><main id="app" class="mx-auto max-w-6xl p-4 md:p-8"></main><script src="/bundle.js"></script></body></html>`);}catch(e){res.statusCode=500;res.end(String(e));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const kind of ['blocked','card'])for(const locale of ['pt-BR','en-US'])for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/payments/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"status":"pending"}'}));
  await page.goto(base+'?kind='+kind+'&locale='+locale);await page.getByRole('heading',{name:locale==='pt-BR'?'Assinatura e pagamentos':'Subscription and payments',exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(out,kind+'-'+locale+'-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:locale==='pt-BR'?'Detalhes':'Details',exact:true}).click();await page.getByRole('dialog').waitFor();assert.ok(await page.getByRole('dialog').textContent());await page.keyboard.press('Escape');
  if(kind==='blocked'){
   await page.getByRole('button',{name:locale==='pt-BR'?'Encerrar tentativa':'Close attempt',exact:true}).click();
   await page.getByRole('button',{name:locale==='pt-BR'?'Confirmar':'Confirm',exact:true}).click();await page.waitForFunction(()=>window.__refresh>0);
  }
  assert.deepEqual(errors,[]);await page.close();console.log('PASS central',kind,locale,width);
 }
 const pix=await browser.newPage({viewport:{width:390,height:850}});let creates=0;
 await pix.route('**/api/payments/asaas/pix',route=>{creates++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({payment_id:'pay_test',pix_qr_code:'',pix_copy_paste:'TEST-PIX-CODE',pix_expires_at:new Date(Date.now()+3600000).toISOString()})})});
 await pix.route('**/api/payments/asaas/pay_test',route=>route.fulfill({status:200,contentType:'application/json',body:'{"status":"paid"}'}));
 await pix.goto(base+'?kind=pix');await pix.getByRole('button',{name:'Gerar PIX',exact:true}).waitFor();assert.equal(creates,0);
 await pix.getByRole('button',{name:'Gerar PIX',exact:true}).click();assert.equal(creates,0);
 await pix.getByLabel('CPF do pagador',{exact:true}).fill('24971563792');
 await pix.getByRole('button',{name:'Tentar novamente',exact:true}).click();await pix.waitForFunction(()=>window.__paid===true);assert.equal(creates,1);
 console.log('PASS PIX consentimento, CPF e confirmação');await pix.close();
}finally{await browser.close();server.close();}
