import Link from "next/link"
import { setRequestLocale } from "next-intl/server"
import { Dumbbell } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { requireStudentPage } from "@/lib/auth/platform"
import { WorkoutService } from "@/services/WorkoutService"
import { StudentWorkoutExecutionClient } from "@/components/student/workout/StudentWorkoutExecutionClient"
import { StartWorkoutButton } from "@/components/student/workout/StartWorkoutButton"
export const dynamic = "force-dynamic"
export const metadata = { title: "Treino" }
export default async function Page({ params: { locale } }: { params: { locale: string } }) {
 setRequestLocale(locale); const userId=await requireStudentPage()
 const plans=await WorkoutService.getTodayPlans(userId)
 const views=await Promise.all(plans.map(async plan => {
   const exercises=await WorkoutService.applyStudentOverrides(userId,await WorkoutService.listDayExercises(plan.day.id))
   const session=await WorkoutService.getTodaysSession(userId,plan.day.id)
   if(session && !session.completed_at) {
     const logs=await WorkoutService.sessionLogs(userId,session.id)
     return <StudentWorkoutExecutionClient key={session.id} program={plan.program} day={plan.day} sessionId={session.id} exercises={exercises} initialLogs={logs} locale={locale} />
   }
   return <Card key={plan.day.id}><CardHeader><CardTitle>{locale==='en-US' ? plan.program.title_en : plan.program.title_pt}</CardTitle></CardHeader><CardContent className="space-y-4"><p>{locale==='en-US' ? plan.day.name_en : plan.day.name_pt} · {exercises.length} exercícios</p>{session?.completed_at ? <p className="text-primary font-semibold">Treino concluído hoje.</p> : exercises.length ? <StartWorkoutButton dayId={plan.day.id} programId={plan.program.id} /> : <p>Nenhum exercício cadastrado neste treino.</p>}</CardContent></Card>
 }))
 return <div className="space-y-6"><PageHeader title="Treino" description="Sua programação de hoje" icon={<Dumbbell size={22} />} />{views}{!plans.length && <Card><CardContent className="p-6 space-y-3"><p>Nenhum treino programado para hoje.</p><Link className="text-primary underline" href={`/${locale}/conversas`}>Falar com minha treinadora</Link></CardContent></Card>}</div>
}
