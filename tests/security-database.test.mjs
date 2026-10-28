import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { testDatabase } from './database.mjs'
const A='00000000-0000-4000-8000-000000000001', B='00000000-0000-4000-8000-000000000002', ADMIN='81ab4bb4-4bdb-4f9c-be3c-7977e2efe58e'
let db, planId, programId, dayId, exerciseId, workoutExerciseId
before(async () => {
 db=await testDatabase()
 await db.query("insert into auth.users(id,email) values($1,'a@example.test'),($2,'b@example.test')",[A,B])
 planId=(await db.query('select id from public.plans limit 1')).rows[0].id
 await db.query("insert into public.subscriptions(user_id,plan_id,status,unit_amount_cents) values($1,$3,'active',100),($2,$3,'active',100)",[A,B,planId])
 programId=(await db.query("insert into public.workout_programs(owner_id,title_pt,title_en) values($1,'Treino de teste','Test workout') returning id",[ADMIN])).rows[0].id
 dayId=(await db.query("insert into public.workout_days(program_id,week_number,day_of_week,name_pt,name_en) values($1,1,extract(isodow from current_date),'Dia','Day') returning id",[programId])).rows[0].id
 exerciseId=(await db.query("insert into public.exercises(name_pt,name_en,primary_muscle,equipment,difficulty) values('Agachamento','Squat','quads','body_weight','beginner') returning id")).rows[0].id
 workoutExerciseId=(await db.query("insert into public.workout_exercises(day_id,exercise_id,sets) values($1,$2,3) returning id",[dayId,exerciseId])).rows[0].id
 await db.query("insert into public.student_workout_kits(student_id,program_id,start_date,status) values($1,$2,current_date,'active')",[A,programId])
 await db.query("insert into public.water_intake_logs(user_id,logged_date,amount_ml) values($1,current_date,175),($2,current_date,300)",[A,B])
})
after(async()=>{if(db) await db.close()})
async function actor(id, action, role='authenticated') {
 return db.transaction(async tx => {
   await tx.exec(`set local role ${role}`)
   await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id,role])
   return action(tx)
 })
}
test('aluno não pode elevar o próprio papel nem trocar cliente de pagamento',async()=>{
 await assert.rejects(actor(A,tx=>tx.query("update public.profiles set role='admin' where id=$1",[A])),/Administrative profile fields/)
 await assert.rejects(actor(A,tx=>tx.query("update public.profiles set stripe_customer_id='forged' where id=$1",[A])),/Administrative profile fields/)
 await actor(A,tx=>tx.query("update public.profiles set first_name='Aluno' where id=$1",[A]))
 assert.equal((await db.query('select role from public.profiles where id=$1',[A])).rows[0].role,'student')
})
test('RLS isola os dados de hidratação entre alunos e permite visão administrativa',async()=>{
 const rows=await actor(A,tx=>tx.query('select user_id,amount_ml from public.water_intake_logs'))
 assert.deepEqual(rows.rows.map(r=>r.user_id),[A]);assert.equal(rows.rows[0].amount_ml,175)
 const admin=await actor(ADMIN,tx=>tx.query('select user_id from public.water_intake_logs'))
 assert.equal(admin.rows.length,2)
})
test('assinatura bloqueada e manutenção impedem acesso direto ao banco sem bloquear perfil',async()=>{
 await db.query("update public.subscriptions set status='blocked' where user_id=$1",[A])
 assert.equal((await actor(A,tx=>tx.query('select * from public.water_intake_logs'))).rows.length,0)
 assert.equal((await actor(A,tx=>tx.query('select id from public.profiles where id=$1',[A]))).rows.length,1)
 await db.query("update public.subscriptions set status='active' where user_id=$1",[A])
 await db.exec("insert into public.platform_settings(key,value_json) values('maintenance_mode','true') on conflict(key) do update set value_json='true'; update public.platform_settings set value_pt=null where key='maintenance_until';")
 assert.equal((await actor(A,tx=>tx.query('select * from public.water_intake_logs'))).rows.length,0)
 await db.exec("update public.platform_settings set value_json='false' where key='maintenance_mode'")
})
test('rotina não pode ser forjada por chamada direta e preferências são persistidas atomicamente',async()=>{
 await assert.rejects(actor(A,tx=>tx.query("insert into public.student_routine_logs(user_id,kind,assignment_id,item_id,logged_date) values($1,'diet',gen_random_uuid(),gen_random_uuid(),current_date)",[A])),/permission denied/)
 await db.query('select public.save_student_hydration($1,current_date,2300,true,45,true)',[A])
 await db.query('select public.save_student_hydration($1,current_date,2450,false,90,false)',[A])
 assert.deepEqual((await db.query('select daily_target_ml from public.hydration_goals where user_id=$1',[A])).rows,[{daily_target_ml:2450}])
 assert.equal((await db.query('select hydration_frequency_minutes from public.student_routine_settings where user_id=$1',[A])).rows[0].hydration_frequency_minutes,90)
 await assert.rejects(actor(A,tx=>tx.query('select public.save_student_hydration($1,current_date,5000,true,30,false)',[B])),/permission denied/)
})
test('alunos não podem reatribuir salas nem falsificar o remetente pelo Supabase',async()=>{
 const room=(await db.query('select id from public.mentorship_rooms where user_id=$1',[A])).rows[0].id
 await assert.rejects(actor(A,tx=>tx.query('update public.mentorship_rooms set user_id=$1 where id=$2',[B,room])),/permission denied/)
 await assert.rejects(actor(A,tx=>tx.query("insert into public.chat_messages(room_id,sender_id,sender_type,content) values($1,$2,'coach','Forged')",[room,ADMIN])),/permission denied/)
 assert.equal((await actor(B,tx=>tx.query('select id from public.mentorship_rooms where id=$1',[room]))).rows.length,0)
})
test('sessão exige atribuição e chamadas repetidas reutilizam a mesma sessão',async()=>{
 await assert.rejects(db.query('select * from public.start_student_workout($1,$2,$3,current_date)',[B,dayId,programId]),/Workout not assigned/)
 const first=(await db.query('select * from public.start_student_workout($1,$2,$3,current_date)',[A,dayId,programId])).rows[0]
 const again=(await db.query('select * from public.start_student_workout($1,$2,$3,current_date)',[A,dayId,programId])).rows[0]
 assert.equal(first.id,again.id)
})
test('séries e conclusão validam titularidade; séries não duplicam e volume é real',async()=>{
 const session=(await db.query('select id from public.workout_sessions where user_id=$1',[A])).rows[0].id
 const input={session_id:session,workout_exercise_id:workoutExerciseId,exercise_id:exerciseId,set_number:1,reps_done:10,weight_kg:20,completed:true}
 await assert.rejects(db.query('select * from public.log_student_workout_set($1,$2)',[B,input]),/Session unavailable/)
 await db.query('select * from public.log_student_workout_set($1,$2)',[A,input]); await db.query('select * from public.log_student_workout_set($1,$2)',[A,input])
 assert.equal(Number((await db.query('select count(*) as n from public.exercise_sets_log where session_id=$1',[session])).rows[0].n),1)
 await assert.rejects(db.query('select * from public.log_student_workout_set($1,$2)',[A,{...input,set_number:4}]),/Set not prescribed/)
 await assert.rejects(db.query('select * from public.complete_student_workout($1,$2,$3)',[B,session,{}]),/Session unavailable/)
 const complete=(await db.query('select * from public.complete_student_workout($1,$2,$3)',[A,session,{feeling:4,rpe:7}])).rows[0]
 assert.equal(Number(complete.total_volume_kg),200)
 await assert.rejects(db.query('select * from public.log_student_workout_set($1,$2)',[A,input]),/Session unavailable/)
})
test('exercícios diretos de kits são executáveis e edições preservam a identidade',async()=>{
 const kit=(await db.query("insert into public.workout_kits(name_pt,name_en,slug,created_by_id) values('Kit teste','Test kit','test-kit',$1) returning id",[ADMIN])).rows[0].id
 const item=(await db.query('insert into public.workout_kit_items(kit_id,exercise_id,day_of_week) values($1,$2,extract(isodow from current_date)) returning id',[kit,exerciseId])).rows[0].id
 const generated=(await db.query('select generated_program_id from public.workout_kits where id=$1',[kit])).rows[0].generated_program_id
 assert.ok(generated)
 const first=(await db.query('select id from public.workout_exercises where source_kit_item_id=$1',[item])).rows[0].id
 await db.query('update public.workout_kit_items set order_index=5 where id=$1',[item])
 assert.equal((await db.query('select id from public.workout_exercises where source_kit_item_id=$1',[item])).rows[0].id,first)
 await db.query('delete from public.workout_kit_items where id=$1',[item])
 assert.equal((await db.query('select id from public.workout_exercises where source_kit_item_id=$1',[item])).rows.length,0)
})

test('aluno não vê perfis de terceiros nem cria um perfil privilegiado diretamente', async()=>{
 const result=await actor(A,tx=>tx.query('select id from public.profiles where id=$1',[B]))
 assert.equal(result.rows.length,0)
 await assert.rejects(actor(A,tx=>tx.query("insert into public.profiles(id,role) values(gen_random_uuid(),'admin')")),/permission denied/)
})

test('consumo pertence à atribuição do aluno, mantém snapshot nutricional e não duplica',async()=>{
 const food=(await db.query("insert into public.diet_foods(name_pt,name_en,serving_size,serving_unit,calories_kcal,protein_g,carbs_g,fats_g) values('Arroz','Rice',100,'g',200,10,20,5) returning id")).rows[0].id
 const kit=(await db.query("insert into public.diet_kits(name_pt,name_en,slug) values('Dieta teste','Test diet','diet-test') returning id")).rows[0].id
 const item=(await db.query("insert into public.diet_kit_items(kit_id,food_id,quantity,unit,time_of_day) values($1,$2,150,'g','12:00') returning id",[kit,food])).rows[0].id
 const assignment=(await db.query("insert into public.student_diet_kits(student_id,kit_id) values($1,$2) returning id",[A,kit])).rows[0].id
 const log=(uid,done)=>db.query("select public.set_student_routine($1,'diet',$2,$3,'12:00',$4,current_date)",[uid,assignment,item,done])
 await assert.rejects(log(B,true),/Diet assignment unavailable/)
 await log(A,true);await log(A,true)
 const rows=(await db.query('select calories_kcal,protein_g from public.student_routine_logs where assignment_id=$1',[assignment])).rows
 assert.equal(rows.length,1);assert.equal(Number(rows[0].calories_kcal),300);assert.equal(Number(rows[0].protein_g),15)
 await db.query('update public.diet_foods set calories_kcal=300 where id=$1',[food]);await log(A,true)
 assert.equal(Number((await db.query('select calories_kcal from public.student_routine_logs where assignment_id=$1',[assignment])).rows[0].calories_kcal),300)
 await log(A,false)
 assert.equal((await db.query('select id from public.student_routine_logs where assignment_id=$1',[assignment])).rows.length,0)
 await db.query("update public.student_diet_kits set end_date=current_date-1 where id=$1",[assignment])
 await assert.rejects(log(A,true),/Diet assignment unavailable/)
})
test('registro de saúde é atômico, atualiza perfil e reutiliza o peso do dia',async()=>{
 await db.query('select public.record_student_health($1,current_date,80,420)',[A])
 await db.query('select public.record_student_health($1,current_date,79.5,450)',[A])
 const weight=await db.query('select weight_kg from public.weight_logs where user_id=$1 and logged_date=current_date',[A])
 assert.equal(weight.rows.length,1);assert.equal(Number(weight.rows[0].weight_kg),79.5)
 assert.equal(Number((await db.query('select weight_kg from public.profiles where id=$1',[A])).rows[0].weight_kg),79.5)
 await assert.rejects(db.query('select public.record_student_health($1,current_date,70,2000)',[A]),/Invalid sleep duration/)
 assert.equal(Number((await db.query('select weight_kg from public.profiles where id=$1',[A])).rows[0].weight_kg),79.5)
})

test('dose de suplemento exige vínculo e horário ou número de dose prescrito',async()=>{
 const supplement=(await db.query("insert into public.supplements(name_pt,name_en,category_pt,category_en,serving_size,serving_unit) values('Suplemento teste','Test supplement','Teste','Test',5,'g') returning id")).rows[0].id
 const kit=(await db.query("insert into public.supplement_kits(name_pt,name_en,slug) values('Kit dose','Dose kit','dose-kit') returning id")).rows[0].id
 const item=(await db.query("insert into public.supplement_kit_items(kit_id,supplement_id,frequency_per_day,times_of_day) values($1,$2,3,array['08:00','08:00:00']) returning id",[kit,supplement])).rows[0].id
 const assignment=(await db.query('insert into public.student_supplement_kits(student_id,kit_id) values($1,$2) returning id',[A,kit])).rows[0].id
 const log=(uid,slot)=>db.query("select public.set_student_routine($1,'supplement',$2,$3,$4,true,current_date)",[uid,assignment,item,slot])
 await assert.rejects(log(B,'08:00'),/Supplement assignment unavailable/)
 await assert.rejects(log(A,'09:00'),/Dose unavailable/)
 await assert.rejects(log(A,'dose-3'),/Dose unavailable/)
 await log(A,'08:00');await log(A,'dose-1');await log(A,'dose-2');await log(A,'dose-1')
 assert.equal((await db.query('select id from public.student_routine_logs where assignment_id=$1',[assignment])).rows.length,3)
})

test('RPC legada de exclusão não aceita chamada anônima ou direta de aluno',async()=>{
 await assert.rejects(actor('',tx=>tx.query('select public.delete_user_account($1)',[B]),'anon'),/permission denied/)
 await assert.rejects(actor(A,tx=>tx.query('select public.delete_user_account($1)',[B])),/permission denied/)
 assert.equal((await db.query('select id from auth.users where id=$1',[B])).rows.length,1)
})
test('administrador marcado como removido não pode restaurar privilégios pelo banco',async()=>{
 await db.query('update public.profiles set is_deleted=true where id=$1',[ADMIN])
 const update=await actor(ADMIN,tx=>tx.query('update public.profiles set is_deleted=false where id=$1 returning id',[ADMIN]))
 assert.equal(update.rows.length,0)
 assert.equal((await db.query('select is_deleted from public.profiles where id=$1',[ADMIN])).rows[0].is_deleted,true)
 assert.equal((await actor(ADMIN,tx=>tx.query('select id from public.profiles where id=$1',[B]))).rows.length,0)
 await db.query('update public.profiles set is_deleted=false where id=$1',[ADMIN])
})
