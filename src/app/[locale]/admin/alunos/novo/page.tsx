import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/config";
import { requireRole } from "@/lib/auth/access";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StudentCreateForm } from "@/components/admin/student/StudentCreateForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin | Novo aluno" };
export default async function NewStudentPage(props: { params: Promise<{ locale: (typeof locales)[number] }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  await requireRole(["admin"], "/dashboard");
  const en = locale === "en-US";
  return <div className="space-y-6">
    <AdminPageHeader locale={locale} section="students">
      <h1 className="text-2xl font-semibold">{en ? "New student" : "Novo aluno"}</h1>
      <p className="mt-2 text-sm text-text-secondary">{en ? "Create the account, then assign a plan and record received payments from the student's profile." : "Cadastre a conta e, na ficha do aluno, defina o plano e registre os pagamentos recebidos."}</p>
    </AdminPageHeader>
    <Card className="max-w-xl"><CardHeader><CardTitle>{en ? "Student access" : "Acesso do aluno"}</CardTitle>
      <CardDescription>{en ? "The student signs in with this email and initial password. No email is sent automatically. Access requires a valid plan." : "O aluno entra com este e-mail e a senha inicial. Nenhum e-mail é enviado automaticamente. O acesso depende de um plano vigente."}</CardDescription></CardHeader>
      <CardContent><StudentCreateForm locale={locale} /></CardContent>
    </Card>
    <Link href={`/${locale}/admin/alunos`} className="inline-flex text-sm text-primary underline">{en ? "Back to students" : "Voltar para Alunos"}</Link>
  </div>;
}
