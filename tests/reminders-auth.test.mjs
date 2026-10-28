import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './load-ts.mjs'
function reminders({disabled=false,silent=true,hour=12}={}) {
 const data={date:'2026-10-28',timezone:'America/Sao_Paulo',locale:'pt-BR',diet:[{kind:'diet',key:'meal',slot:'12:00',name:'Refeição prescrita',done:false},{kind:'diet',key:'done',slot:'12:00',name:'Já consumida',done:true}],supplements:[{kind:'supplement',key:'dose',slot:'12:00',name:'Dose prescrita',done:false}],waterGoal:2000,waterTotal:175,hydrationReminders:!disabled,hydrationFrequency:60,hydrationSilent:silent,quietStart:null,quietEnd:null}
 const sent=[]
 const db={from(table){const q={select(){return q},eq(){return q},limit(){return q},gte(){return q},then(resolve){return Promise.resolve({data:table==='profiles'?[{id:'student'}]:sent.map(s=>({payload:s.payload})),error:null}).then(resolve)}};return q}}
 const {NotificationDispatcher}=loadTs('src/services/NotificationDispatcher.ts',{
 './StudentRoutineService':{StudentRoutineService:{get:async()=>data},checked:result=>{if(result.error)throw result.error;return result.data}},
 './PlatformSettingsService':{getMaintenanceStatus:async()=>({active:false})},'./WorkoutService':{WorkoutService:{getTodaysProgram:async()=>null}},
 '../lib/supabase/server':{createServiceClientSSR:async()=>db},'./NotificationService':{ALWAYS_PUSH_TYPES:[],NotificationService:{send:async(user,payload)=>{sent.push(payload);return {inApp:true}}}},
 '../lib/notifications/time':{getZonedParts:()=>({dateKey:data.date,hour,minute:0}),isWithinQuietHours:(minute,start)=>!!start&&(minute>=22*60||minute<7*60),zonedTimeToUtc:(date,slot)=>new Date(`${date}T${slot}:00Z`)},
 '@/lib/auth/access':{canAccessPlatform:async()=>({allowed:true})},
 })
 return {NotificationDispatcher,sent}
}
test('lembretes usam itens reais, ignoram consumo concluído e deduplicam chamadas',async()=>{
 const {NotificationDispatcher,sent}=reminders()
 assert.equal((await NotificationDispatcher.generateRoutineReminders()).created,3)
 assert.equal(sent.filter(p=>p.type==='diet').length,1)
 assert.equal((await NotificationDispatcher.generateRoutineReminders()).created,0)
 assert.equal(sent.length,3)
})
test('hidratação respeita desligamento e modo silencioso persistidos',async()=>{
 const disabled=reminders({disabled:true});await disabled.NotificationDispatcher.generateRoutineReminders()
 assert.equal(disabled.sent.some(p=>p.type==='hydration'),false)
 const quiet=reminders({hour:23});await quiet.NotificationDispatcher.generateRoutineReminders();assert.equal(quiet.sent.length,0)
 const enabled=reminders({hour:23,silent:false});await enabled.NotificationDispatcher.generateRoutineReminders();assert.equal(enabled.sent.filter(p=>p.type==='hydration').length,1)
})
function callback(result={error:null}) {
 const route=loadTs('src/app/[locale]/auth/callback/route.ts',{'next/server':{NextResponse:{redirect:url=>({location:url.href})}},'@/lib/supabase/server':{createClientSSR:async()=>({auth:{exchangeCodeForSession:async()=>result,verifyOtp:async()=>result}})},'@/i18n/config':{locales:['pt-BR','en-US']}})
 return url=>route.GET({url,nextUrl:new URL(url)},{params:{locale:'pt-BR'}})
}
test('callback de recuperação troca código por sessão e impede redirecionamento externo',async()=>{
 assert.equal((await callback()('http://localhost/pt-BR/auth/callback?code=fixture&next=/pt-BR/reset-password')).location,'http://localhost/pt-BR/reset-password')
 assert.equal((await callback()('http://localhost/pt-BR/auth/callback?code=fixture&next=https://example.test')).location,'http://localhost/pt-BR/dashboard')
})
test('callback inválido não libera redefinição de senha',async()=>{
 assert.equal((await callback({error:{message:'expired'}})('http://localhost/pt-BR/auth/callback?code=expired&next=/pt-BR/reset-password')).location,'http://localhost/pt-BR/login?auth_error=invalid_link')
})
