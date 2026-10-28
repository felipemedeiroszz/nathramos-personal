import "server-only";
import { cache } from "react";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { readPages } from "./StudentRoutineService";
import {
  aggregateAdminReport,
  periodBounds,
  type AdminCurrency,
} from "@/lib/admin/reporting";
export const getAdminReport = cache(async (currency: AdminCurrency = "BRL") => {
  const db: any = await createServiceClientSSR();
  const now = new Date();
  const { start } = periodBounds(now);
  const [profiles, subscriptions, payments, plans, refunds] = await Promise.all([
    readPages<any>(
      () =>
        db
          .from("profiles")
          .select("id,full_name,display_name,role,is_deleted,created_at")
          .order("id"),
      "admin profiles",
    ),
    readPages<any>(
      () => db.from("subscriptions").select("*").order("id"),
      "admin subscriptions",
    ),
    readPages<any>(
      () =>
        db
          .from("payments")
          .select("*").eq("is_duplicate",false)
          .or(`paid_at.gte.${start},created_at.gte.${start}`)
          .order("id"),
      "admin payments",
    ),
    readPages<any>(
      () =>
        db.from("plans").select("id,name_pt,name_en,grace_days").order("id"),
      "admin plans",
    ),
    readPages<any>(() => db.from("payment_refunds").select("*,payment:payments!inner(currency,is_duplicate)").eq("status","succeeded").gte("occurred_at",start).order("external_id"), "admin refunds"),
  ]);
  return aggregateAdminReport(
    profiles.data,
    subscriptions.data,
    payments.data,
    plans.data,
    currency,
    now,
    refunds.data.filter(r => !r.payment.is_duplicate).map(r => ({...r,currency:r.payment.currency})),
  );
});
