import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
export const dynamic = "force-dynamic";
export default async function Page({
  params: { locale },
}: {
  params: { locale: string };
}) {
  await requireRole(["admin", "coach"], "/dashboard");
  redirect(`/${locale}/admin/dashboard`);
}
