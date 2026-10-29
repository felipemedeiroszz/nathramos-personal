"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { StudentWithSubscription } from "@/services/StudentService";

interface AdminAlunosClientProps {
  locale: string;
  students: StudentWithSubscription[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  limit: number;
}
const surface = "rounded-2xl border border-white/[0.08] bg-[#101113]";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-yellow-400 disabled:cursor-not-allowed disabled:opacity-30";

export function AdminAlunosClient({
  locale,
  students,
  total,
  page,
  totalPages,
  search,
  status,
  limit,
}: AdminAlunosClientProps) {
  const t = (pt: string, en: string) => (locale === "en-US" ? en : pt);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(search);
  const [view, setView] = useState("list");
  const [sort, setSort] = useState("default");
  useEffect(() => {
    setQuery(search);
  }, [search]);
  const labels: Record<string, string> = {
    active: t("Ativos", "Active"),
    trialing: t("Em teste", "Trialing"),
    past_due: t("Atrasados", "Past due"),
    blocked: t("Bloqueados", "Blocked"),
    canceled: t("Cancelados", "Canceled"),
    inactive: t("Inativos", "Inactive"),
    expired: t("Expirados", "Expired"),
    no_subscription: t("Sem assinatura", "No subscription"),
  };
  function navigate(nextSearch: string, nextStatus: string, nextPage = 1) {
    const params = new URLSearchParams();
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextStatus) params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    startTransition(() => router.push(`/${locale}/admin/alunos?${params}`));
  }
  const date = (value?: string | null) =>
    value && !Number.isNaN(Date.parse(value))
      ? new Date(value).toLocaleDateString(locale, {
          timeZone: "America/Sao_Paulo",
        })
      : "—";
  const ordered = [...students].sort((a, b) =>
    sort === "name"
      ? a.full_name.localeCompare(b.full_name, locale)
      : sort === "recent"
        ? Date.parse(b.created_at) - Date.parse(a.created_at)
        : 0,
  );
  const active = students.filter((s) =>
    ["active", "trialing"].includes(s.subscription?.status || ""),
  ).length;
  const attention = students.filter((s) =>
    ["past_due", "blocked", "expired"].includes(s.subscription?.status || ""),
  ).length;
  const noPlan = students.filter((s) => !s.subscription).length;
  const badge = (student: StudentWithSubscription) => {
    const value = student.subscription?.status || "no_subscription";
    const singular: Record<string, string> = {
      active: t("Ativo", "Active"),
      trialing: t("Em teste", "Trialing"),
      past_due: t("Atrasado", "Past due"),
      blocked: t("Bloqueado", "Blocked"),
      canceled: t("Cancelado", "Canceled"),
      inactive: t("Inativo", "Inactive"),
      expired: t("Expirado", "Expired"),
      no_subscription: t("Sem assinatura", "No subscription"),
    };
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium",
          ["active", "trialing"].includes(value)
            ? "bg-emerald-400/10 text-emerald-400"
            : value === "past_due"
              ? "bg-amber-400/10 text-amber-300"
              : ["blocked", "expired", "canceled"].includes(value)
                ? "bg-rose-400/10 text-rose-400"
                : "bg-white/5 text-zinc-500",
        )}
      >
        <span className="h-1 w-1 rounded-full bg-current" />
        {singular[value] || value}
      </span>
    );
  };
  const identity = (student: StudentWithSubscription) => (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        src={student.avatar_url || undefined}
        alt={student.full_name}
        size="sm"
        fallback={
          student.full_name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((n) => n[0])
            .join("") || "?"
        }
      />
      <div className="min-w-0">
        <Link
          href={`/${locale}/admin/alunos/${student.id}`}
          className="block truncate text-sm font-medium text-zinc-100 transition hover:text-yellow-400"
        >
          {student.full_name}
        </Link>
        <p className="mt-1 truncate text-[11px] text-zinc-500">
          {student.email || t("E-mail não informado", "Email not provided")}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 text-zinc-100">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
            {t("Gestão de alunos", "Student management")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("Alunos", "Students")}
            <span className="text-yellow-400">.</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {t(
              "Pessoas no centro. Acompanhamento em cada etapa.",
              "People at the center. Support at every stage.",
            )}
          </p>
        </div>
        <Link href={`/${locale}/admin/dashboard`} className={button}>
          <ArrowUpRight size={14} />
          {t("Visão geral", "Overview")}
        </Link>
      </header>
      <section
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label={t("Resumo dos resultados", "Results summary")}
      >
        {[
          {
            label: t("Resultados encontrados", "Matching students"),
            value: total,
            note: t(
              "Total com os filtros atuais",
              "Total matching current filters",
            ),
            icon: Users,
            accent: true,
          },
          {
            label: t("Ativos nesta página", "Active on this page"),
            value: active,
            note: t(
              "Assinaturas ativas e em teste",
              "Active and trialing subscriptions",
            ),
            icon: Check,
          },
          {
            label: t("Atenção nesta página", "Attention on this page"),
            value: attention,
            note: t(
              "Atrasados, bloqueados ou expirados",
              "Past due, blocked or expired",
            ),
            icon: ShieldCheck,
          },
          {
            label: t(
              "Sem assinatura nesta página",
              "No subscription on this page",
            ),
            value: noPlan,
            note: t(
              "Alunos sem assinatura vinculada",
              "Students without a subscription",
            ),
            icon: CreditCard,
          },
        ].map(({ label, value, note, icon: Icon, accent }) => (
          <div
            key={label}
            className={cn(
              surface,
              "p-4 sm:p-5",
              accent &&
                "border-yellow-400/20 bg-gradient-to-br from-yellow-400/[0.07] to-[#101113]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] text-zinc-400">{label}</span>
              <Icon
                size={15}
                className={
                  accent ? "shrink-0 text-yellow-400" : "shrink-0 text-zinc-600"
                }
              />
            </div>
            <p className="my-3 text-3xl font-semibold tracking-tight">
              {value.toLocaleString(locale)}
            </p>
            <p className="text-[10px] leading-relaxed text-zinc-500">{note}</p>
          </div>
        ))}
      </section>
      <section className={cn(surface, "overflow-hidden")} aria-busy={pending}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 pt-2">
          <nav
            className="flex max-w-full gap-5 overflow-x-auto"
            aria-label={t(
              "Filtrar alunos por situação",
              "Filter students by state",
            )}
          >
            {[
              { key: "", label: t("Todos os alunos", "All students") },
              { key: "active", label: labels.active },
              { key: "past_due", label: labels.past_due },
              { key: "no_subscription", label: labels.no_subscription },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(query, item.key)}
                className={cn(
                  "whitespace-nowrap border-b-2 py-4 text-xs transition",
                  status === item.key
                    ? "border-yellow-400 font-medium text-yellow-400"
                    : "border-transparent text-zinc-500 hover:text-white",
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mb-2 flex rounded-lg border border-white/10 p-0.5">
            {[
              {
                key: "list",
                icon: List,
                label: t("Visualização em lista", "List view"),
              },
              {
                key: "grid",
                icon: LayoutGrid,
                label: t("Visualização em cards", "Card view"),
              },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                aria-label={label}
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "rounded-md p-1.5",
                  view === key
                    ? "bg-white/10 text-zinc-100"
                    : "text-zinc-600 hover:text-white",
                )}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate(query, status);
          }}
          className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] p-4 sm:px-5"
        >
          <label className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2.5 focus-within:border-yellow-400/50">
            <Search size={15} className="shrink-0 text-zinc-500" />
            <input
              aria-label={t(
                "Buscar por nome ou e-mail",
                "Search by name or email",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(
                "Buscar por nome ou e-mail…",
                "Search by name or email…",
              )}
              className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-zinc-600"
            />
          </label>
          <select
            aria-label={t(
              "Filtrar alunos por status",
              "Filter students by status",
            )}
            value={status}
            onChange={(e) => navigate(query, e.target.value)}
            className={cn(button, "max-w-full bg-[#101113]")}
          >
            <option value="">{t("Todos os status", "All statuses")}</option>
            {Object.entries(labels)
              .filter(([key]) => key !== "trialing")
              .map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
          </select>
          <button
            disabled={pending}
            className="rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-300 disabled:opacity-50"
          >
            {pending ? t("Buscando…", "Searching…") : t("Buscar", "Search")}
          </button>
          <label className="ml-auto flex items-center gap-2 text-zinc-500">
            <ArrowDownUp size={13} />
            <select
              aria-label={t(
                "Ordenar alunos da página",
                "Sort students on this page",
              )}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="max-w-40 bg-[#101113] py-2 text-[11px] outline-none"
            >
              <option value="default">
                {t("Ordem original", "Default order")}
              </option>
              <option value="name">
                {t("Nome A–Z (página)", "Name A–Z (page)")}
              </option>
              <option value="recent">
                {t("Mais recentes (página)", "Newest (page)")}
              </option>
            </select>
          </label>
        </form>
        {(search || status) && (
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-5 py-3 text-[10px] text-zinc-500">
            <span>{t("Filtros aplicados", "Applied filters")}</span>
            {search && (
              <span className="rounded-md bg-white/5 px-2 py-1 text-zinc-300">
                {search}
              </span>
            )}
            {status && (
              <span className="rounded-md bg-yellow-400/10 px-2 py-1 text-yellow-400">
                {labels[status]}
              </span>
            )}
            <button
              onClick={() => {
                setQuery("");
                navigate("", "");
              }}
              className="ml-auto flex items-center gap-1 hover:text-white"
            >
              <X size={12} />
              {t("Limpar filtros", "Clear filters")}
            </button>
          </div>
        )}
        {!students.length ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <Users size={30} className="text-zinc-600" />
            <h2 className="text-sm font-medium">
              {t("Nenhum aluno encontrado", "No students found")}
            </h2>
            <p className="max-w-xs text-xs leading-relaxed text-zinc-500">
              {t(
                "Tente outro nome ou e-mail, ou remova os filtros para ampliar a busca.",
                "Try another name or email, or clear filters to broaden your search.",
              )}
            </p>
            {(search || status) && (
              <button
                className={button}
                onClick={() => {
                  setQuery("");
                  navigate("", "");
                }}
              >
                {t("Limpar filtros", "Clear filters")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={cn(
                "hidden overflow-x-auto",
                view === "list" && "lg:block",
              )}
            >
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="bg-white/[0.015] text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    {[
                      t("Aluno", "Student"),
                      t("Plano e assinatura", "Plan and subscription"),
                      "Status",
                      t("Vencimento", "Due date"),
                      t("Cadastro", "Registered"),
                      "",
                    ].map((label, i) => (
                      <th key={i} className="px-5 py-3 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {ordered.map((student) => (
                    <tr
                      key={student.id}
                      className="transition hover:bg-white/[0.025]"
                    >
                      <td className="max-w-[280px] px-5 py-4">
                        {identity(student)}
                      </td>
                      <td className="max-w-52 px-5 py-4">
                        <p className="truncate text-zinc-300">
                          {student.subscription?.plan_name ||
                            t("Sem plano", "No plan")}
                        </p>
                        <p className="mt-1 text-[10px] text-zinc-600">
                          {student.subscription?.provider || "—"} ·{" "}
                          {student.country ||
                            t("País não informado", "Country not provided")}
                        </p>
                      </td>
                      <td className="px-5 py-4">{badge(student)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-zinc-400">
                        {date(student.subscription?.current_period_end)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-zinc-500">
                        {date(student.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/${locale}/admin/alunos/${student.id}`}
                          aria-label={`${t("Ver perfil de", "View profile of")} ${student.full_name}`}
                          className="inline-flex rounded-lg border border-white/10 p-2 text-zinc-500 transition hover:border-yellow-400/30 hover:text-yellow-400"
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className={cn(
                "grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3",
                view === "list" && "lg:hidden",
              )}
            >
              {ordered.map((student) => (
                <article
                  key={student.id}
                  className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.015] p-4"
                >
                  {identity(student)}
                  <div className="my-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400">
                      {student.subscription?.plan_name ||
                        t("Sem plano", "No plan")}
                    </span>
                    {badge(student)}
                  </div>
                  <div className="flex justify-between border-t border-white/[0.06] pt-3 text-[10px] text-zinc-500">
                    <span>{t("Vencimento", "Due date")}</span>
                    <span>
                      {date(student.subscription?.current_period_end)}
                    </span>
                  </div>
                  <Link
                    href={`/${locale}/admin/alunos/${student.id}`}
                    className={cn(button, "mt-4 w-full")}
                  >
                    {t("Ver aluno", "View student")}
                    <ArrowRight size={13} />
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-4">
          <p role="status" className="text-[11px] text-zinc-500">
            {pending
              ? t("Atualizando resultados…", "Updating results…")
              : `${total ? (page - 1) * limit + 1 : 0}–${Math.min(page * limit, total)} ${t("de", "of")} ${total} ${t("alunos", "students")}`}
          </p>
          <nav
            className="flex items-center gap-3"
            aria-label={t("Paginação de alunos", "Student pagination")}
          >
            <button
              className={button}
              aria-label={t("Página anterior", "Previous page")}
              disabled={page <= 1 || pending}
              onClick={() => navigate(search, status, page - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-zinc-400">
              {page} / {totalPages}
            </span>
            <button
              className={button}
              aria-label={t("Próxima página", "Next page")}
              disabled={page >= totalPages || pending}
              onClick={() => navigate(search, status, page + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </nav>
        </footer>
      </section>
      <p className="flex items-center gap-2 text-[10px] text-zinc-500">
        <ShieldCheck size={12} />
        {t(
          "Indicadores de status e ordenação consideram os alunos da página atual. Busca e filtros consultam toda a base autorizada.",
          "Status metrics and sorting apply to the current page. Search and filters query all authorized students.",
        )}
      </p>
    </div>
  );
}
