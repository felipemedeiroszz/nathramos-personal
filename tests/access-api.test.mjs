import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './load-ts.mjs'
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002'
function environment(options={}) {
 const state={userId:A,role:'student',allowed:true,maintenance:false,deleted:false,room:{user_id:A,coach_id:B,is_active:true},calls:0,...options}
 const db={from(table){const q={select(){return q},eq(){return q},single:async()=>({data:{role:state.role,is_deleted:state.deleted},error:null}),maybeSingle:async()=>({data:state.room,error:null})};return q}}
 const platform=loadTs('src/lib/auth/platform.ts',{
 'server-only':{},'@/lib/supabase/server':{createClientSSR:async()=>({auth:{getUser:async()=>({data:{user:state.userId?{id:state.userId}:null},error:null})}}),createServiceClientSSR:async()=>db},
 './access':{canAccessPlatform:async()=>({allowed:state.allowed})},'@/services/PlatformSettingsService':{getMaintenanceStatus:async()=>({active:state.maintenance})},'next/navigation':{redirect(){throw Error('redirect')}},
 })
 function route(file){return loadTs(file,{'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200})}},'@/lib/auth/platform':platform,'@/services/WorkoutService':{WorkoutService:{userHistory:async(id,limit)=>{state.calls++;return [{user_id:id,limit}]},getTodaysProgram:async()=>{state.calls++;return null}}}})}
 return {state,platform,route}
}
for(const file of ['src/app/api/workout/today/route.ts','src/app/api/workout/history/route.ts']) {
 test(`${file}: bloqueia acesso anônimo e consulta a outro aluno`,async()=>{
  const {state,route}=environment({userId:null});const api=route(file)
  assert.equal((await api.GET(new Request('http://localhost/api?userId='+A))).status,401)
  state.userId=A
  assert.equal((await api.GET(new Request('http://localhost/api?userId='+B))).status,403)
  assert.equal(state.calls,0)
  assert.equal((await api.GET(new Request('http://localhost/api'))).status,200)
  assert.equal(state.calls,1)
 })
 test(`${file}: assinatura bloqueada e manutenção são verificadas no servidor`,async()=>{
  const {state,route}=environment({allowed:false});const api=route(file)
  assert.equal((await api.GET(new Request('http://localhost/api'))).status,403)
  state.allowed=true;state.maintenance=true
  assert.equal((await api.GET(new Request('http://localhost/api'))).status,503)
  assert.equal(state.calls,0)
 })
}
test('salas exigem participação e derivam o remetente no servidor',async()=>{
 const {state,platform}=environment()
 assert.equal((await platform.requireRoomAccess('room')).viewer,'user')
 state.room.user_id=B
 await assert.rejects(platform.requireRoomAccess('room'),/Conversa indisponível/)
 state.role='coach';state.room.coach_id=A
 assert.equal((await platform.requireRoomAccess('room')).viewer,'coach')
 state.room.is_active=false
 await assert.rejects(platform.requireRoomAccess('room',true),/encerrada/)
})
test('administrador pode consultar aluno, conta removida não pode operar',async()=>{
 const {state,platform}=environment({role:'admin',allowed:false,maintenance:true})
 assert.equal((await platform.requireStudentTarget(B)).targetId,B)
 state.deleted=true
 await assert.rejects(platform.requireStudentTarget(B),/Conta indisponível/)
})
