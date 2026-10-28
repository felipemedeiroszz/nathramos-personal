import Link from "next/link"
import { setRequestLocale } from "next-intl/server"
import { LayoutDashboard } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { requireStudentPage } from "@/lib/auth/platform"
import { createServiceClientSSR } from "@/lib/supabase/server"
import { StudentRoutineService, checked } from "@/services/StudentRoutineService"
import { RoutineSummary } from "@/components/student/RoutineSummary"
import { TodayWorkoutCard } from "@/components/student/workout/TodayWorkoutCard"
import { getZonedParts } from "@/lib/notifications/time"
export const dynamic = "force-dynamic"
export const metadata = { title: "Dashboard" }
export default async function Page({ params: { locale } }: { params: { locale: string } }) {
 setRequestLocale(locale)
 const userId = await requireStudentPage()
 const db: any = await createServiceClientSSR()
 const [data, notifications, rooms, meetings] = await Promise.all([
   StudentRoutineService.get(userId),
   db.from("notifications").select("id, title, body, read_at").eq("user_id", userId).or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`).order("created_at", { ascending: false }).limit(5),
   db.from("mentorship_rooms").select("id, unread_count_user").eq("user_id", userId).eq("is_active", true),
   db.from("meetings").select("id, title_pt, title_en, start_at").eq("user_id", userId).in("status", ["scheduled","confirmed","rescheduled"]).gte("start_at", new Date().toISOString()).order("start_at").limit(3),
 ])
 const notices = checked<any[]>(notifications, "dashboard notifications")
 const conversations = checked<any[]>(rooms, "dashboard rooms")
 const upcoming = checked<any[]>(meetings, "dashboard meetings")
 const clock = getZonedParts(new Date(), data.timezone)
 const now = `${String(clock.hour).padStart(2,'0')}:${String(clock.minute).padStart(2,'0')}`
 const nextMeal = data.diet.filter(i => !i.done && (!i.slot || i.slot >= now)).sort((a,b) => a.slot.localeCompare(b.slot))[0]
 return <div className="space-y-6"><PageHeader title={`Olá${data.firstName ? `, ${data.firstName}` : ''}`} description="Seu acompanhamento de hoje" icon={<LayoutDashboard size={22} />} />
 <TodayWorkoutCard locale={locale} userId={userId} /><RoutineSummary data={data} />
 <div className="grid md:grid-cols-2 gap-5"><Card><CardHeader><CardTitle>Próxima refeição</CardTitle></CardHeader><CardContent><p>{nextMeal ? `${nextMeal.slot || 'Horário livre'} · ${nextMeal.name} · ${nextMeal.quantity} ${nextMeal.unit}` : 'Nenhuma refeição pendente para o restante de hoje.'}</p><Link className="text-primary underline" href={`/${locale}/dieta`}>Ver dieta</Link></CardContent></Card>
 <Card><CardHeader><CardTitle>Mentoria</CardTitle></CardHeader><CardContent><p>{conversations.reduce((sum,r) => sum + Number(r.unread_count_user || 0),0)} mensagens não lidas</p>{upcoming.map(m => <p key={m.id} className="mt-2">{locale === 'en-US' ? m.title_en : m.title_pt} · {new Date(m.start_at).toLocaleString(locale, { timeZone: data.timezone })}</p>)}<Link className="text-primary underline" href={`/${locale}/conversas`}>Abrir conversas</Link></CardContent></Card></div>
 <Card><CardHeader><CardTitle>Últimas notificações</CardTitle></CardHeader><CardContent className="space-y-3">{!notices.length && <p>Nenhuma notificação recebida.</p>}{notices.map(n => <div key={n.id}><p className="font-semibold">{n.title}{!n.read_at && ' · Nova'}</p><p className="text-sm text-text-secondary">{n.body}</p></div>)}<Link className="text-primary underline" href={`/${locale}/notificacoes`}>Ver todas</Link></CardContent></Card>
 </div>
}
