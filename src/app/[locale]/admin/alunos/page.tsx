import Link from "next/link";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
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
  const actor = await requireRole(["admin", "coach"], "/dashboard");

  const title = (() => {
    try {
      if (tAdminNav.has("students")) return tAdminNav("students");
    } catch {}
    return "Alunos";
  })();

  const requestedPage = Math.max(
    1,
    Math.min(1000000, Math.trunc(Number(searchParams.page)) || 1),
  );
  const search =
    typeof searchParams.search === "string"
      ? searchParams.search.slice(0, 200)
      : "";
  const status = [
    "active",
    "past_due",
    "blocked",
    "canceled",
    "inactive",
    "expired",
    "no_subscription",
  ].includes(searchParams.status || "")
    ? searchParams.status!
    : "";
  const limit = 20;
  const offset = (requestedPage - 1) * limit;

  const { students, total, page } = await StudentService.listStudents({
    search,
    status,
    locale,
    limit,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (actor.role === "coach")
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-bold">
          {locale === "en-US" ? "My students" : "Meus alunos"}
        </h1>
        <form className="flex gap-3">
          <label>
            {locale === "en-US" ? "Search" : "Buscar"}
            <input
              name="search"
              defaultValue={search}
              className="block rounded-lg bg-surface border border-border p-2"
            />
          </label>
          <button type="submit" className="underline">
            {locale === "en-US" ? "Search" : "Buscar"}
          </button>
        </form>
        <p>
          {total} {locale === "en-US" ? "students" : "alunos"}
        </p>
        <ul className="grid sm:grid-cols-2 gap-3">
          {students.map((student) => (
            <li
              key={student.id}
              className="border border-border rounded-xl p-4"
            >
              <Link
                className="font-semibold underline"
                href={`/${locale}/admin/alunos/${student.id}`}
              >
                {student.full_name}
              </Link>
              <p className="text-sm text-text-secondary">{student.email}</p>
            </li>
          ))}
        </ul>
        <nav className="flex gap-4" aria-label="Pagination">
          {page > 1 && (
            <Link
              href={`?search=${encodeURIComponent(search)}&page=${page - 1}`}
            >
              ←
            </Link>
          )}
          <span>
            {page}/{totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`?search=${encodeURIComponent(search)}&page=${page + 1}`}
            >
              →
            </Link>
          )}
        </nav>
      </section>
    );

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
