import { setRequestLocale } from "next-intl/server"
import { TrendingUp } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Chart } from "@/components/ui/Chart"
import { requireStudentPage } from "@/lib/auth/platform"
import { StudentRoutineService } from "@/services/StudentRoutineService"
import { WorkoutMetricsService } from "@/services/WorkoutMetricsService"
import { RoutineSummary } from "@/components/student/RoutineSummary"
import { HealthLogClient } from "@/components/student/RoutineClients"
import { WorkoutHistory } from "@/components/student/workout/WorkoutHistory"
export const dynamic = "force-dynamic"
export const metadata = { title: "Progresso e desempenho" }
export default async function Page({ params: { locale } }: { params: { locale: string } }) {
 setRequestLocale(locale); const userId = await requireStudentPage()
 const [data, metrics] = await Promise.all([StudentRoutineService.get(userId), WorkoutMetricsService.getPerformanceSummary(userId)])
 const values = [["Sessões concluídas", metrics.total_sessions], ["Volume total (kg)", metrics.total_volume_kg], ["Sequência atual (dias)", metrics.current_streak_days], ["Frequência semanal (12 semanas)", metrics.weekly_frequency]]
 return <div className="space-y-6"><PageHeader title="Progresso e desempenho" description="Seus registros e resultados" icon={<TrendingUp size={22} />} /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{values.map(([label,value]) => <Card key={label}><CardContent className="p-5"><p className="text-sm text-text-secondary">{label}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>)}</div><RoutineSummary data={data} />
 <Card><CardHeader><CardTitle>Volume de treino · últimos 30 dias</CardTitle></CardHeader><CardContent>{metrics.recent_volume.length ? <Chart data={metrics.recent_volume.map(v => ({ name: v.date, value: v.volume_kg }))} /> : <p>Nenhum treino concluído no período.</p>}</CardContent></Card>
 <Card><CardHeader><CardTitle>Peso · últimos 30 dias</CardTitle></CardHeader><CardContent>{data.weight.length ? <Chart data={[...data.weight].reverse().map(w => ({ name: w.logged_date, value: Number(w.weight_kg) }))} /> : <p>Nenhum peso registrado no período.</p>}</CardContent></Card>
 <HealthLogClient /><WorkoutHistory locale={locale} userId={userId} /></div>
}
