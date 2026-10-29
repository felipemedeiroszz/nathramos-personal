import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
import { AuditLogService } from "@/services/AuditLogService";
import { AdminAuditoriaClient } from "@/components/admin/audit/AdminAuditoriaClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin | Auditoria",
};

const PAGE_SIZE = 20;

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminAuditoriaPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: (typeof locales)[number] };
  searchParams: SearchParams;
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const tAdminNav = await getTranslations("adminNav");
  const tAdminAudit = await getTranslations("adminAudit");
  await requireRole(["admin"], "/dashboard");

  const pick = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };

  const filters = {
    q: pick("q"),
    entity_type: pick("entity"),
    action: pick("action"),
    from: pick("from"),
    to: pick("to"),
  };

  const parsedPage = Number(pick("page") ?? "1");
  const currentPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const [rows, total, entityTypes, actions] = await Promise.all([
    AuditLogService.list({
      ...filters,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    }),
    AuditLogService.count(filters),
    AuditLogService.distinctValues("entity_type"),
    AuditLogService.distinctValues("action"),
  ]);

  const title = (() => {
    try {
      if (tAdminNav.has("audit")) return tAdminNav("audit");
    } catch {}
    return "Auditoria";
  })();

  return (
    <div className="space-y-6 w-full">
      <AdminPageHeader locale={locale} section="system">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{title}</h1>
        <p className="text-sm md:text-base text-text-secondary">
          {tAdminAudit("subtitle")}
        </p>
      </AdminPageHeader>

      <AdminAuditoriaClient
        rows={rows}
        total={total}
        page={currentPage}
        pageSize={PAGE_SIZE}
        entityTypes={entityTypes}
        actions={actions}
        filters={{
          q: filters.q ?? "",
          entity: filters.entity_type ?? "",
          action: filters.action ?? "",
          from: filters.from ?? "",
          to: filters.to ?? "",
        }}
      />
    </div>
  );
}
