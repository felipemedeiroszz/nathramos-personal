// Render the real server page with local service/action fixtures.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";
export const student = "00000000-0000-4000-8000-000000000001";
export async function renderStudentDetail(
  params = {},
  role = "admin",
  locale = "pt-BR",
) {
  const marker = (name) => () =>
    React.createElement("div", { "data-fixture": name }, name);
  const profile = {
    id: student,
    role: "student",
    is_deleted: false,
    full_name: "Mariana Oliveira",
    first_name: "Mariana",
    last_name: "Oliveira",
    email: "mariana@example.test",
    phone: "(11) 90000-0000",
    birth_date: "1995-04-15",
    height_cm: 165,
    weight_kg: 64,
    country: "Brasil",
    language: locale,
    created_at: "2026-10-01T12:00:00Z",
    avatar_url: null,
  };
  const db = {
    from(table) {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        order: () => q,
        maybeSingle: async () => ({
          data: table === "profiles" ? profile : null,
          error: null,
        }),
        then: (resolve, reject) =>
          Promise.resolve({ data: [], error: null }).then(resolve, reject),
      };
      return q;
    },
    rpc: async () => ({ data: "fingerprint", error: null }),
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: { id: student, email: profile.email, banned_until: null },
          },
          error: null,
        }),
      },
    },
  };
  const empty = { listKits: async () => [], listStudentKits: async () => [] };
  const messages = (
    await import("../src/messages/" + locale + ".json", {
      with: { type: "json" },
    })
  ).default;
  const { default: Page } = loadTs(
    "src/app/[locale]/admin/alunos/[id]/page.tsx",
    {
      "server-only": {},
      "next-intl/server": {
        setRequestLocale() {},
        getTranslations: async (namespace) => (key) =>
          messages[namespace]?.[key] || key,
      },
      "next/navigation": {
        notFound() {
          throw Error("not found");
        },
      },
      "next/link": ({ children, prefetch, ...props }) =>
        React.createElement("a", props, children),
      "@/lib/auth/access": {
        requireRole: async () => ({ userId: "staff", role }),
      },
      "@/lib/auth/platform": {
        requireManagedStudent: async (id) => {
          if (id !== student) throw Error("wrong student");
        },
      },
      "@/lib/supabase/server": { createServiceClientSSR: async () => db },
      "@/services/StudentRoutineService": {
        checked: (result) => {
          if (result.error) throw Error("database");
          return result.data;
        },
      },
      "@/services/WorkoutKitService": {
        WorkoutKitService: {
          listStudentAssignments: async () => [],
          listKits: async () => [],
        },
      },
      "@/services/WorkoutService": {
        WorkoutService: {
          userHistory: async () => [],
          listPrograms: async () => [],
        },
      },
      "@/services/SubscriptionService": {
        SubscriptionService: { getActive: async () => null },
      },
      "@/services/SupplementService": { SupplementService: empty },
      "@/services/DietService": { DietService: empty },
      "@/components/admin/student/StudentManualBillingPanel": {
        StudentManualBillingPanel: marker("manual-payments"),
      },
      "@/components/admin/student/StudentBillingHistoryPanel": {
        StudentBillingHistoryPanel: marker("payment-history"),
      },
      "@/components/admin/student/StudentRoutinePanel": {
        StudentRoutinePanel: marker("routine-health"),
      },
      "@/components/admin/student/StudentAccountForms": {
        StudentAccountForms: marker("account-access"),
      },
      "@/components/admin/StudentCoachForm": {
        StudentCoachForm: marker("coach-assignment"),
      },
      "@/components/admin/StudentPasswordResetForm": {
        StudentPasswordResetForm: marker("password-reset"),
      },
      "@/components/admin/student/StudentKitsPanel": {
        StudentKitsPanel: ({ kind }) =>
          React.createElement(
            "div",
            { "data-fixture": kind + "-kits" },
            kind + " kits",
          ),
      },
      "@/components/admin/workout/AssignWorkoutKitModalClient": {
        AssignWorkoutKitModalClient: marker("assign-workout"),
      },
      "@/components/admin/workout/UnassignWorkoutButton": {
        UnassignWorkoutButton: marker("unassign-workout"),
      },
    },
  );
  return renderToStaticMarkup(
    await Page({
      params: Promise.resolve({ locale, id: student }),
      searchParams: Promise.resolve(params),
    }),
  );
}
