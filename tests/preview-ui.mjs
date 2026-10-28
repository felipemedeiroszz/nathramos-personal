import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { loadTs } from './load-ts.mjs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const components=loadTs('src/components/student/RoutineClients.tsx',{'next/navigation':{useRouter:()=>({refresh(){}})},'@/app/actions/routine':{}})
const nutrition={calories_kcal:300,protein_g:15,carbs_g:30,fats_g:7.5}
const item={key:'fixture-item',kind:'diet',assignmentId:'fixture-assignment',itemId:'fixture-item',kit:'Acompanhamento alimentar',name:'Arroz integral',quantity:150,unit:'g',slot:'12:00',mealType:'lunch',notes:'Orientação da treinadora',done:false,foodId:'fixture-food',nutrition}
const data={date:'2026-10-28',weekStart:'2026-10-26',timezone:'America/Sao_Paulo',firstName:'Aluno de teste',locale:'pt-BR',diet:[item],supplements:[],plannedNutrition:nutrition,consumedNutrition:{calories_kcal:0,protein_g:0,carbs_g:0,fats_g:0},water:[{id:1,amount_ml:175,logged_date:'2026-10-28',logged_time:'09:30'}],waterTotal:175,waterGoal:2000,hydrationReminders:true,hydrationSilent:true,hydrationFrequency:60,quietStart:'22:00',quietEnd:'07:00',shopping:[{foodId:'fixture-food',name:'Arroz integral',quantities:[{quantity:150,unit:'g'}],bought:false}],sleep:[],weight:[],logs:[]}
const views=[['dieta',components.DailyItemsClient,{items:[item],kind:'diet',planned:nutrition,consumed:data.consumedNutrition}],['hidratacao',components.HydrationClient,{data}],['compras',components.ShoppingClient,{data}],['suplementos',components.DailyItemsClient,{kind:'supplement',items:[{...item,kind:'supplement',name:'Suplemento prescrito',quantity:5,unit:'g',slot:'08:00',mealType:'other',nutrition:null}]}]]
const out=resolve('artifacts/auditoria-ui');await mkdir(out,{recursive:true})
const css=(await readdir('.next/static/css')).filter(f=>f.endsWith('.css')).map(f=>`<link rel="stylesheet" href="${pathToFileURL(resolve('.next/static/css',f))}">`).join('')
const cssSource=(await Promise.all((await readdir('.next/static/css')).filter(f=>f.endsWith('.css')).map(f=>readFile('.next/static/css/'+f,'utf8')))).join('')
const fontClass=cssSource.match(/\.([\w-]+)\{--font-inter:/)?.[1] || ''
const browser=await chromium.launch({headless:true,channel:'chrome'})
try {
 for(const [name,Component,props] of views) {
  const body=renderToStaticMarkup(React.createElement(Component,props))
  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body class="${fontClass} bg-background text-text" style="${fontClass ? '' : '--font-inter:Arial'}"><main class="max-w-5xl mx-auto p-4 md:p-8 space-y-5"><h1 class="text-2xl font-bold">${name}</h1>${body}</main></body></html>`
  const file=resolve(out,name+'.html');await writeFile(file,html)
  for(const width of [390,1280]) {
   const page=await browser.newPage({viewport:{width,height:950}})
   await page.goto(pathToFileURL(file).href)
   await page.evaluate(()=>document.fonts.ready)
   await page.screenshot({path:resolve(out,`${name}-${width}.png`),fullPage:true})
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)
   if(overflow) throw new Error(`${name} overflows at ${width}px`)
   console.log(`${name} ${width}px: no horizontal overflow`)
   await page.close()
  }
 }
} finally {await browser.close()}
