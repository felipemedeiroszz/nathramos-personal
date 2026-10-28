import Link from "next/link"
import { setRequestLocale, getTranslations } from "next-intl/server"
import { requireStudentPage } from "@/lib/auth/platform"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pill, Droplets, FileText, BookOpen, ShoppingCart, MessageSquare, Calendar, Bell, User, CreditCard } from "lucide-react"
export const dynamic = "force-dynamic"
export default async function Page({ params: { locale } }: { params: { locale: string } }) {
 setRequestLocale(locale); await requireStudentPage()
 const t = await getTranslations("navigation")
 const links = [ ["supplements", "/suplementos", Pill], ["hydration", "/hidratacao", Droplets], ["exams", "/exames", FileText], ["ebooks", "/ebooks", BookOpen], ["shoppingList", "/lista-compras", ShoppingCart], ["mentoring", "/conversas", MessageSquare], ["meetings", "/reunioes", Calendar], ["notifications", "/notificacoes", Bell], ["account", "/account", User], ["membership", "/assinatura", CreditCard] ] as const
 return <div className="space-y-6"><PageHeader title={t("more")} /><div className="grid sm:grid-cols-2 gap-4">{links.map(([key,path,Icon]) => <Link key={key} className="flex gap-3 items-center p-5 rounded-xl border border-border bg-surface hover:border-primary" href={`/${locale}${path}`}><Icon size={22} />{t(key)}</Link>)}</div></div>
}
