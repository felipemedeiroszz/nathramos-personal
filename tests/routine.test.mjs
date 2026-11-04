import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './load-ts.mjs'
const {isAssignmentCurrent,foodNutrition,supplementSlots,workoutWeek,selectWorkoutDays,sumNutrition}=loadTs('src/lib/student/routine.ts')
test('atribuições respeitam início, fim inclusivo, status e kit removido',()=>{
 const a={status:'active',start_date:'2026-10-27',end_date:'2026-10-28',kit:{is_deleted:false}}
 assert.equal(isAssignmentCurrent(a,'2026-10-28'),true)
 assert.equal(isAssignmentCurrent(a,'2026-10-26'),false)
 assert.equal(isAssignmentCurrent(a,'2026-10-29'),false)
 assert.equal(isAssignmentCurrent({...a,status:'archived'},'2026-10-28'),false)
 assert.equal(isAssignmentCurrent({...a,kit:{is_deleted:true}},'2026-10-28'),false)
})
test('nutrição usa a porção real e não inventa conversões de unidade',()=>{
 const food={serving_size:100,serving_unit:'g',calories_kcal:200,protein_g:10,carbs_g:20,fats_g:5}
 assert.deepEqual(foodNutrition(food,150,'g'),{calories_kcal:300,protein_g:15,carbs_g:30,fats_g:7.5})
 assert.equal(foodNutrition(food,1,'unidade'),null)
 assert.equal(foodNutrition({...food,serving_size:0},100,'g'),null)
 assert.equal(sumNutrition([foodNutrition(food,50,'g'),foodNutrition(food,150,'g')]).calories_kcal,400)
})
test('doses preservam frequência sem criar horários falsos',()=>{
 assert.deepEqual(supplementSlots(['08:00','08:00:00','25:00'],3),['08:00','dose-1','dose-2'])
 assert.deepEqual(supplementSlots([],1),['dose-1'])
})
test('calendário respeita semana e dia, sem liberar treino de descanso ou próximo dia',()=>{
 const days=[{week_number:1,day_of_week:1},{week_number:1,day_of_week:3},{week_number:2,day_of_week:3}]
 assert.deepEqual(selectWorkoutDays(days,2,3),[days[2]])
 assert.deepEqual(selectWorkoutDays(days,1,2),[])
 assert.deepEqual(selectWorkoutDays(days,3,3),[days[1]])
 assert.equal(workoutWeek('2026-10-01','2026-10-08',4),2)
 assert.equal(workoutWeek('2026-10-01','2026-10-29',4),1)
})

const {upsertWorkoutKitItemSchema}=loadTs('src/schemas/workouts.ts')
const uuid='00000000-0000-4000-8000-000000000001'
test('exercícios avulsos exigem dia e não podem misturar programa e exercício',()=>{
 assert.equal(upsertWorkoutKitItemSchema.safeParse({kit_id:uuid,exercise_id:uuid}).success,false)
 for(let day=1;day<=7;day++) assert.equal(upsertWorkoutKitItemSchema.safeParse({kit_id:uuid,exercise_id:uuid,day_of_week:day}).success,true)
 assert.equal(upsertWorkoutKitItemSchema.safeParse({kit_id:uuid,exercise_id:uuid,program_id:uuid,day_of_week:1}).success,false)
 assert.equal(upsertWorkoutKitItemSchema.safeParse({kit_id:uuid,program_id:uuid}).success,true)
})
test('perna de segunda não aparece terça nem domingo; domingo usa ISO 7',()=>{
 const leg={week_number:1,day_of_week:1,name:'Perna'}
 assert.deepEqual(selectWorkoutDays([leg],1,1),[leg])
 assert.deepEqual(selectWorkoutDays([leg],1,2),[])
 assert.deepEqual(selectWorkoutDays([leg],1,7),[])
 const sunday={week_number:1,day_of_week:7}
 assert.deepEqual(selectWorkoutDays([sunday],1,7),[sunday])
})
test('virada do dia usa o fuso do aluno',()=>{
 const {getZonedParts}=loadTs('src/lib/notifications/time.ts')
 assert.equal(getZonedParts(new Date('2026-11-03T02:59:00Z'),'America/Sao_Paulo').weekday,1)
 assert.equal(getZonedParts(new Date('2026-11-03T03:00:00Z'),'America/Sao_Paulo').weekday,2)
})
