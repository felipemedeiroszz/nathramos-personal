import { setRequestLocale } from "next-intl/server"
import { Droplets } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { requireStudentPage } from "@/lib/auth/platform"
import { StudentRoutineService } from "@/services/StudentRoutineService"
import { HydrationClient } from "@/components/student/RoutineClients"
export const dynamic = "force-dynamic"
export const metadata = { title: "Hidratação" }
export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale)
  const userId = await requireStudentPage()
  const data = await StudentRoutineService.get(userId)
  return <div className="space-y-6"><PageHeader title="Hidratação" description="Seu acompanhamento de hoje" icon={<Droplets size={22} />} /><HydrationClient data={data} /></div>
}
