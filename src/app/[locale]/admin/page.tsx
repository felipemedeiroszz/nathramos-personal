import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/access";
export const dynamic = "force-dynamic";
export default async function Page(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  await requireRole(["admin", "coach"], "/dashboard");
  redirect(`/${locale}/admin/dashboard`);
}
