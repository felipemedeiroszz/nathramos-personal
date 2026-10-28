import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import type { RoutineData } from "@/services/StudentRoutineService"
export function RoutineSummary({ data }: { data: RoutineData }) {
 const dietDone = data.diet.filter(i => i.done).length
 const supplDone = data.supplements.filter(i => i.done).length
 const rows = [ ["Alimentos consumidos hoje", `${dietDone} / ${data.diet.length}`], ["Doses tomadas hoje", `${supplDone} / ${data.supplements.length}`], ["Água hoje", `${data.waterTotal} ml${data.waterGoal ? ` / ${data.waterGoal} ml` : ''}`], ["Último peso registrado", data.weight[0] ? `${data.weight[0].weight_kg} kg · ${data.weight[0].logged_date}` : "Sem registro nos últimos 30 dias"], ["Último sono registrado", data.sleep[0] ? `${(data.sleep[0].total_minutes / 60).toFixed(1)} h · ${data.sleep[0].logged_date}` : "Sem registro nos últimos 30 dias"], ["Dias com dieta registrada (30 dias)", String(new Set(data.logs.filter(l => l.kind === "diet").map(l => l.logged_date)).size)], ["Dias com suplementação registrada (30 dias)", String(new Set(data.logs.filter(l => l.kind === "supplement").map(l => l.logged_date)).size)] ]
 return <Card><CardHeader><CardTitle>Acompanhamento · {data.date}</CardTitle></CardHeader><CardContent className="grid sm:grid-cols-2 gap-5">{rows.map(([label,value]) => <div key={label}><p className="text-sm text-text-secondary">{label}</p><p className="font-semibold">{value}</p></div>)}</CardContent></Card>
}
