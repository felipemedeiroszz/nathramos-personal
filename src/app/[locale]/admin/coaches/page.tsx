import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@/i18n/config";
import { requireRole } from "@/lib/auth/access";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { checked } from "@/services/StudentRoutineService";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CoachCreateForm } from "@/components/admin/CoachCreateForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin | Coaches" };

export default async function CoachesPage(
  props: {
    params: Promise<{ locale: (typeof locales)[number] }>;
    searchParams: Promise<{ page?: string }>;
  }
) {
  const searchParams = (await props.searchParams) ?? {};
  const params = await props.params;

  const {
    locale
  } = params;

  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await requireRole(["admin"], "/dashboard");
  const db = await createServiceClientSSR();
  const en = locale === "en-US";
  const t = (pt: string, english: string) => en ? english : pt;
  const countResult = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "coach").eq("is_deleted", false);
  checked(countResult, "coach directory count");
  const total = countResult.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(searchParams.page)) || 1));
  const rows = checked(await db.from("profiles").select("id,full_name,created_at")
    .eq("role", "coach").eq("is_deleted", false).order("created_at", { ascending: false }).order("id")
    .range((page - 1) * 20, page * 20 - 1), "coach directory") as { id: string; full_name: string; created_at: string }[];
  const coaches = await Promise.all(rows.map(async row => {
    const result = await db.auth.admin.getUserById(row.id);
    if (result.error) throw new Error("Não foi possível consultar o acesso do coach.");
    return { ...row, email: result.data.user?.email };
  }));

  return <div className="space-y-6">
    <AdminPageHeader locale={locale} section="system">
      <h1 className="text-2xl font-semibold text-text">Coaches</h1>
      <p className="mt-2 text-sm text-text-secondary">{t("Cadastre os profissionais que acompanham seus alunos.", "Create accounts for the professionals who coach your students.")}</p>
    </AdminPageHeader>
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <Card className="min-w-0">
        <CardHeader><CardTitle>{t("Coaches cadastrados", "Registered coaches")} ({total})</CardTitle>
          <CardDescription>{t("Vincule os alunos ao responsável pela ficha individual em Alunos.", "Assign students to their coach from each student's profile under Students.")}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {!coaches.length ? <p className="py-8 text-center text-sm text-text-secondary">{t("Nenhum coach cadastrado. Use o formulário para criar a primeira conta.", "No coaches registered. Use the form to create the first account.")}</p> :
            <ul className="divide-y divide-border">{coaches.map(coach => <li key={coach.id} className="flex gap-3 py-4 min-w-0">
              <ShieldCheck size={20} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0"><p className="font-medium break-words">{coach.full_name}</p>
                <p className="text-sm text-text-secondary break-all">{coach.email || t("E-mail indisponível", "Email unavailable")}</p>
                <p className="mt-1 text-xs text-text-secondary">{t("Cadastro em", "Registered on")} {new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(coach.created_at))}</p>
              </div>
            </li>)}</ul>}
          {pages > 1 && <nav aria-label={t("Paginação de coaches", "Coach pagination")} className="flex items-center justify-between gap-3 text-sm">
            {page > 1 ? <Link className="underline" href={`/${locale}/admin/coaches?page=${page - 1}`}>{t("Anterior", "Previous")}</Link> : <span />}
            <span>{page} / {pages}</span>
            {page < pages ? <Link className="underline" href={`/${locale}/admin/coaches?page=${page + 1}`}>{t("Próxima", "Next")}</Link> : <span />}
          </nav>}
          <Link className="inline-flex text-sm text-primary underline" href={`/${locale}/admin/alunos`}>{t("Gerenciar alunos e responsáveis", "Manage students and coaches")}</Link>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader><CardTitle>{t("Novo coach", "New coach")}</CardTitle>
          <CardDescription>{t("Crie o acesso com e-mail e senha inicial. O coach terá acesso aos alunos vinculados à sua carteira. Nenhum e-mail é enviado automaticamente.", "Create access with an email and initial password. Coaches can access students assigned to them. No email is sent automatically.")}</CardDescription></CardHeader>
        <CardContent><CoachCreateForm locale={locale} /></CardContent>
      </Card>
    </div>
  </div>;
}
