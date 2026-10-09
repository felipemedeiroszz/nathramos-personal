import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Search, User, Plus, MoreVertical } from "lucide-react";
import { requireRole } from "@/lib/auth/access";
import { StudentService } from "@/services/StudentService";
import { AdminAlunosClient } from "./AdminAlunosClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Alunos",
};

export default async function AdminAlunosPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams: { page?: string; search?: string; status?: string };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tCommon = await getTranslations("common");
  await requireRole(["admin", "coach"], "/dashboard");

  const title = (() => {
    try {
      if (tAdminNav.has("students")) return tAdminNav("students");
    } catch {}
    return "Alunos";
  })();

  const page = parseInt(searchParams.page || "1", 10);
  const search = searchParams.search || "";
  const status = searchParams.status || "";
  const limit = 20;
  const offset = (page - 1) * limit;

  const { students, total } = await StudentService.listStudents({
    search,
    status,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {total} {total === 1 ? "aluno" : "alunos"} cadastrados
        </p>
      </header>

      <AdminAlunosClient
        locale={locale}
        students={students}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        status={status}
        limit={limit}
      />
    </div>
  );
}
