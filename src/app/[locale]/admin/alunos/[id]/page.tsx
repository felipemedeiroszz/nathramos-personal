import { StudentCardioSummary } from "@/components/admin/workout/StudentCardioSummary";
import { assignmentPhase, followingDate } from "@/lib/workout-schedule";
import { getZonedParts } from "@/lib/notifications/time";
import { WorkoutPeriodEditor } from "@/components/admin/workout/WorkoutScheduleModal";
import { checked } from "@/services/StudentRoutineService";
import { StudentManualBillingPanel } from "@/components/admin/student/StudentManualBillingPanel";
import { StudentBillingHistoryPanel } from "@/components/admin/student/StudentBillingHistoryPanel";
import { StudentProfileHeader } from "@/components/admin/student/StudentProfileHeader";
import { StudentCoachForm } from "@/components/admin/StudentCoachForm";
import { requireManagedStudent } from "@/lib/auth/platform";
import { StudentRoutinePanel } from "@/components/admin/student/StudentRoutinePanel";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales } from "@/i18n/config";
import { notFound } from "next/navigation";
import { createServiceClientSSR } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/access";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { StudentDetailNavigation } from "@/components/admin/student/StudentDetailNavigation";
import { selectedStudentTab } from "@/lib/admin/student-detail-tabs";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Ruler,
  Weight,
  Globe,
  Languages,
  UserPlus,
  CreditCard,
  Dumbbell,
  History,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Pill,
  Utensils,
} from "lucide-react";
import { WorkoutKitService } from "@/services/WorkoutKitService";
import { WorkoutService } from "@/services/WorkoutService";
import { SubscriptionService } from "@/services/SubscriptionService";
import { SupplementService } from "@/services/SupplementService";
import { DietService } from "@/services/DietService";
import type {
  PlanRow,
  StudentWorkoutKitRow,
  WorkoutKitRow,
  WorkoutSessionRow,
  StudentSupplementKitWithKit,
  StudentDietKitWithKit,
  SupplementKitRow,
  DietKitRow,
} from "@/types";
import { UnassignWorkoutButton } from "@/components/admin/workout/UnassignWorkoutButton";
import { AssignWorkoutKitModalClient } from "@/components/admin/workout/AssignWorkoutKitModalClient";
import { StudentPasswordResetForm } from "@/components/admin/StudentPasswordResetForm";
import { StudentAccountForms } from "@/components/admin/student/StudentAccountForms";
import { isAccountSuspended } from "@/lib/auth/suspension";
import {
  StudentKitsPanel,
  type StudentKitOption,
  type StudentKitAssignment,
} from "@/components/admin/student/StudentKitsPanel";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin | Aluno",
};
interface ExtendedProfile {
  id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role?: "admin" | "student" | "coach" | null;
  gender?: string | null;
  birth_date?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  language?: string | null;
  country?: string | null;
  created_at?: string | null;
}
interface SubscriptionWithPlan {
  id: string;
  status: string;
  plan_name_pt?: string | null;
  plan_name_en?: string | null;
  plan_price_cents?: number | null;
  currency?: string | null;
  current_period_end?: string | null;
  payment_method_pref?: string | null;
  provider?: string | null;
  source?: string | null;
  started_at?: string | null;
}
const MAX_ACTIVE_WORKOUTS = 6;
function formatDateISO(iso?: string | null, locale = "pt-BR"): string {
  if (!iso) return "-";
  try {
    const d = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso,
    );
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale, { timeZone: "America/Sao_Paulo" });
  } catch {
    return iso;
  }
}
function formatDateTime(iso?: string | null, locale = "pt-BR"): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(locale, { timeZone: "America/Sao_Paulo" });
  } catch {
    return iso;
  }
}
function genderLabel(g?: string | null, locale = "pt-BR"): string {
  if (!g) return "-";
  const map: Record<string, { pt: string; en: string }> = {
    male: { pt: "Masculino", en: "Male" },
    female: { pt: "Feminino", en: "Female" },
    other: { pt: "Outro", en: "Other" },
  };
  const v = map[g.toLowerCase()];
  if (!v) return g;
  return locale === "pt-BR" ? v.pt : v.en;
}
function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "error" | "outline" {
  switch (status) {
    case "active":
    case "paid":
    case "completed":
      return "success";
    case "trialing":
      return "default";
    case "past_due":
    case "paused":
      return "warning";
    case "canceled":
    case "archived":
    case "expired":
    case "blocked":
    case "failed":
      return "error";
    default:
      return "outline";
  }
}
function statusLabel(
  status: string,
  tCommon: (k: any) => string,
  tPayments?: any,
): string {
  const map: Record<string, string> = {
    active: "Ativo",
    completed: "Concluido",
    trialing: "Teste",
    past_due: "Atrasado",
    paused: "Pausado",
    canceled: "Cancelado",
    archived: "Arquivado",
    expired: "Expirado",
    blocked: "Bloqueado",
    pending: "Pendente",
    processing: "Processando",
    paid: "Pago",
    failed: "Falhou",
  };
  return map[status] || status;
}
export default async function AdminAlunoDetalhePage(props: {
  params: Promise<{ locale: (typeof locales)[number]; id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const searchParams = (await props.searchParams) ?? {};
  const params = await props.params;

  const { locale, id } = params;

  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const label = (pt: string, en: string) => (locale === "en-US" ? en : pt);
  const dateLabel = (value?: string | null) => formatDateISO(value, locale);
  const timeLabel = (value?: string | null) => formatDateTime(value, locale);
  const actor = await requireRole(["admin", "coach"], "/dashboard");
  const selectedTab = selectedStudentTab(searchParams, actor.role === "admin");
  await requireManagedStudent(id);
  const tCommon = await getTranslations("common");
  const tAuth = await getTranslations("auth");
  const tPayments = await getTranslations("payments");
  const tStudentKits = await getTranslations("studentKits");
  const supabase = await createServiceClientSSR();
  const [dietFingerprint, supplementFingerprint] = await Promise.all(
    ["diet", "supplement"].map(async (kind) => {
      const result = await (supabase.rpc as any)(
        "admin_assignment_fingerprint",
        { p_actor: actor.userId, p_kind: kind, p_scope: "student", p_id: id },
      );
      if (result.error)
        throw new Error("Não foi possível verificar a versão das atribuições.");
      return result.data as string;
    }),
  );
  const coaches =
    actor.role === "admin"
      ? await supabase
          .from("profiles")
          .select("id,full_name")
          .in("role", ["admin", "coach"])
          .eq("is_deleted", false)
          .order("full_name")
      : { data: [], error: null };
  const responsibility =
    actor.role === "admin"
      ? await supabase
          .from("mentorship_rooms")
          .select("coach_id")
          .eq("user_id", id)
          .maybeSingle()
      : { data: null, error: null };
  checked(coaches, "student coaches");
  checked(responsibility, "student responsibility");
  let profile: ExtendedProfile | null = null;
  try {
    const result = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", "student")
      .eq("is_deleted", false)
      .maybeSingle();
    profile =
      (checked(result, "student profile") as ExtendedProfile | null) ?? null;
  } catch (error) {
    throw error;
  }
  if (!profile) {
    notFound();
  }
  let email = (profile as any).email || null;
  let suspended: boolean | null = null;
  if (actor.role === "admin" || !email) {
    const result = await supabase.auth.admin.getUserById(id);
    if (!result.error && result.data.user) {
      email = result.data.user.email ?? email;
      suspended = isAccountSuspended(result.data.user);
    }
  }
  let subscription: SubscriptionWithPlan | null = null;
  try {
    const sub =
      actor.role === "admin" ? await SubscriptionService.getActive(id) : null;
    if (sub) {
      const planResult = await supabase
        .from("plans")
        .select("name_pt,name_en,price_cents,currency")
        .eq("id", sub.plan_id)
        .maybeSingle();
      const plan = checked(planResult, "student subscription plan") as
        (PlanRow & { name_pt: string; name_en: string }) | null;
      subscription = {
        id: sub.id,
        status: sub.status,
        plan_name_pt: plan?.name_pt ?? null,
        plan_name_en: plan?.name_en ?? null,
        plan_price_cents: plan?.price_cents ?? sub.unit_amount_cents,
        currency: plan?.currency ?? sub.currency,
        current_period_end: sub.current_period_end,
        payment_method_pref: sub.payment_method_pref ?? null,
        provider: sub.provider ?? null,
        source: sub.source ?? null,
        started_at: sub.started_at,
      };
    }
  } catch (error) {
    throw error;
  }
  let assignments: StudentWorkoutKitRow[] = [];
  try {
    assignments = await WorkoutKitService.listStudentAssignments(id);
  } catch (error) {
    throw error;
  }
  let history: WorkoutSessionRow[] = [];
  try {
    history = await WorkoutService.userHistory(id, 20);
  } catch (error) {
    throw error;
  }
  let kits: WorkoutKitRow[] = [];
  try {
    kits = await WorkoutKitService.listKits({ is_published: true });
  } catch (error) {
    throw error;
  }
  let supplementKitOptions: StudentKitOption[] = [];
  let supplementAssignments: StudentKitAssignment[] = [];
  let dietKitOptions: StudentKitOption[] = [];
  let dietAssignments: StudentKitAssignment[] = [];
  try {
    const allSupplementKits: SupplementKitRow[] =
      await SupplementService.listKits({
        is_published: true,
      });
    supplementKitOptions = allSupplementKits.map((k) => ({
      id: k.id,
      namePt: k.name_pt,
      nameEn: k.name_en,
    }));
    const rows: StudentSupplementKitWithKit[] =
      await SupplementService.listStudentKits(id, "active");
    supplementAssignments = rows.map((r) => ({
      id: r.id,
      kitId: r.kit_id,
      namePt: r.kit?.name_pt ?? "Kit",
      nameEn: r.kit?.name_en ?? "Kit",
      status: r.status,
      startDate: r.start_date,
      endDate: r.end_date ?? null,
      notes: r.notes ?? null,
      assignedAt: r.assigned_at,
    }));
  } catch (error) {
    throw error;
  }
  try {
    const allDietKits: DietKitRow[] = await DietService.listKits({
      is_published: true,
    });
    dietKitOptions = allDietKits.map((k) => ({
      id: k.id,
      namePt: k.name_pt,
      nameEn: k.name_en,
    }));
    const rows: StudentDietKitWithKit[] = await DietService.listStudentKits(
      id,
      "active",
    );
    dietAssignments = rows.map((r) => ({
      id: r.id,
      kitId: r.kit_id,
      namePt: r.kit?.name_pt ?? "Kit",
      nameEn: r.kit?.name_en ?? "Kit",
      status: r.status,
      startDate: r.start_date,
      endDate: r.end_date ?? null,
      notes: r.notes ?? null,
      assignedAt: r.assigned_at,
    }));
  } catch (error) {
    throw error;
  }
  const workoutToday = getZonedParts(
    new Date(),
    (profile as any).timezone || "America/Sao_Paulo",
  ).dateKey;
  const activeCount = assignments.filter((a) =>
    ["current", "scheduled"].includes(assignmentPhase(a, workoutToday)),
  ).length;
  const lastEnd = assignments
    .filter(
      (a) => a.status === "active" && a.end_date && a.end_date >= workoutToday,
    )
    .map((a) => a.end_date!)
    .sort()
    .at(-1);
  const nextWorkoutStart = lastEnd ? followingDate(lastEnd) : workoutToday;
  assignments.sort((a, b) => a.start_date.localeCompare(b.start_date));
  const maxReached = activeCount >= MAX_ACTIVE_WORKOUTS;
  return (
    <div className="space-y-6 w-full min-w-0 text-zinc-100">
      <StudentProfileHeader
        showFinancialHistory={actor.role === "admin"}
        locale={locale}
        id={id}
        name={
          profile.full_name ||
          `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
          label("Aluno", "Student")
        }
        email={email}
        avatar={profile.avatar_url}
        country={profile.country}
        registered={dateLabel(profile.created_at)}
        activeWorkouts={activeCount}
        maxWorkouts={MAX_ACTIVE_WORKOUTS}
        sessions={history.length}
        diets={dietAssignments.length}
        supplements={supplementAssignments.length}
        lastSession={history.length ? dateLabel(history[0].completed_at) : "—"}
      />
      <StudentDetailNavigation
        locale={locale}
        studentId={id}
        active={selectedTab}
        admin={actor.role === "admin"}
        params={searchParams}
      />
      <div className="min-w-0">
        {selectedTab === "profile" && (
          <section aria-label={label("Dados pessoais", "Personal details")}>
            <Card className="min-w-0 rounded-2xl border-white/[0.08] bg-[#101113] p-5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <User size={16} className="text-yellow-400" />{" "}
                      {label("Dados pessoais", "Personal details")}
                    </CardTitle>
                    <CardDescription>
                      {label("Dados cadastrais", "Profile details")}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      profile.role === "admin"
                        ? "error"
                        : profile.role === "coach"
                          ? "warning"
                          : "default"
                    }
                  >
                    {label("ALUNO", "STUDENT")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 text-sm">
                  <InfoLine
                    icon={<Mail size={14} />}
                    label={tAuth("email")}
                    value={email || "-"}
                  />
                  <InfoLine
                    icon={<Phone size={14} />}
                    label={tAuth("phone")}
                    value={profile.phone || "-"}
                  />
                  <InfoLine
                    icon={<Calendar size={14} />}
                    label={tAuth("birthDate")}
                    value={dateLabel(profile.birth_date)}
                  />
                  <InfoLine
                    icon={<User size={14} />}
                    label={tAuth("gender")}
                    value={genderLabel(profile.gender, locale)}
                  />
                  <InfoLine
                    icon={<Ruler size={14} />}
                    label={tAuth("height")}
                    value={profile.height_cm ? `${profile.height_cm} cm` : "-"}
                  />
                  <InfoLine
                    icon={<Weight size={14} />}
                    label={tAuth("weight")}
                    value={profile.weight_kg ? `${profile.weight_kg} kg` : "-"}
                  />
                  <InfoLine
                    icon={<Globe size={14} />}
                    label={tAuth("country")}
                    value={(profile as any).country || "-"}
                  />
                  <InfoLine
                    icon={<Languages size={14} />}
                    label={tAuth("language")}
                    value={profile.language || "-"}
                  />
                  <InfoLine
                    icon={<UserPlus size={14} />}
                    label={label("Cadastrado em", "Registered on")}
                    value={dateLabel(profile.created_at)}
                    span={2}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        )}
        {actor.role === "admin" && selectedTab === "billing" && (
          <section
            aria-label={label("Financeiro", "Billing")}
            className="space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-yellow-400/[0.06] to-transparent p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {label("Financeiro do aluno", "Student finances")}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {label(
                    "Acompanhe o acesso, registre recebimentos e consulte o histórico.",
                    "Review access, record receipts and browse payment history.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="#registrar-recebimento"
                  className="rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-semibold text-black"
                >
                  {label("Novo registro", "New entry")}
                </a>
                <a
                  href="#historico-financeiro"
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-xs text-zinc-300"
                >
                  {label("Ver histórico", "View history")}
                </a>
              </div>
            </div>
            <Card className="min-w-0 rounded-2xl border-white/[0.08] bg-[#101113] shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CreditCard size={16} className="text-yellow-400" />{" "}
                      {label("Assinatura", "Subscription")}
                    </CardTitle>
                    <CardDescription>
                      {label("Plano e status atual", "Plan and current status")}
                    </CardDescription>
                  </div>
                  {subscription && (
                    <Badge variant={statusBadgeVariant(subscription.status)}>
                      {statusLabel(subscription.status, tCommon, tPayments)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!subscription ? (
                  <EmptyState
                    className="py-8"
                    icon={
                      <CreditCard size={32} className="text-text-secondary" />
                    }
                    title={label(
                      "Sem assinatura ativa",
                      "No active subscription",
                    )}
                    description={label(
                      "Aluno não possui plano ativo no momento.",
                      "The student has no active plan.",
                    )}
                  />
                ) : (
                  <div className="grid grid-cols-1 items-start gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    <div className="mb-1 rounded-xl border border-yellow-400/15 bg-yellow-400/[0.04] p-4">
                      <p className="text-[9px] font-medium uppercase tracking-widest text-yellow-400/70">
                        {label("Valor do plano", "Plan price")}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">
                        {subscription.plan_price_cents != null &&
                        subscription.currency
                          ? new Intl.NumberFormat(locale, {
                              style: "currency",
                              currency: subscription.currency,
                            }).format(subscription.plan_price_cents / 100)
                          : "—"}
                      </p>
                    </div>
                    <InfoLine
                      icon={<CreditCard size={14} />}
                      label={label("Plano", "Plan")}
                      value={
                        locale === "pt-BR"
                          ? subscription.plan_name_pt || "-"
                          : subscription.plan_name_en || "-"
                      }
                    />
                    <InfoLine
                      icon={<CheckCircle2 size={14} />}
                      label="Status"
                      value={statusLabel(
                        subscription.status,
                        tCommon,
                        tPayments,
                      )}
                    />
                    <InfoLine
                      icon={<CalendarDays size={14} />}
                      label={label("Próximo vencimento", "Next due date")}
                      value={dateLabel(subscription.current_period_end)}
                    />
                    <InfoLine
                      icon={<CreditCard size={14} />}
                      label={label("Método de pagamento", "Payment method")}
                      value={
                        subscription.source === "admin_manual"
                          ? label("Liberação manual", "Manual access")
                          : methodLabel(
                              subscription.payment_method_pref,
                              subscription.provider,
                            )
                      }
                    />
                    <InfoLine
                      icon={<UserPlus size={14} />}
                      label={label("Iniciada em", "Started on")}
                      value={dateLabel(subscription.started_at)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <StudentManualBillingPanel studentId={id} locale={locale} />
            <StudentBillingHistoryPanel
              studentId={id}
              locale={locale}
              params={searchParams}
            />
          </section>
        )}

        {selectedTab === "routine" && (
          <section className="space-y-5">
            <StudentRoutinePanel studentId={id} />
          </section>
        )}
        {actor.role === "admin" && selectedTab === "management" && (
          <section className="space-y-5">
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <StudentAccountForms
                studentId={id}
                locale={locale}
                profile={profile}
                suspended={suspended}
              />
              {actor.role === "admin" && (
                <StudentCoachForm
                  studentId={id}
                  locale={locale}
                  coaches={
                    (coaches.data || []) as { id: string; full_name: string }[]
                  }
                  current={
                    (responsibility.data as { coach_id: string } | null)
                      ?.coach_id || ""
                  }
                />
              )}
              {actor.role === "admin" && (
                <StudentPasswordResetForm
                  locale={locale}
                  studentId={id}
                  studentName={
                    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
                    "aluno"
                  }
                />
              )}
            </div>
          </section>
        )}

        {selectedTab === "workouts" && (
          <section className="mt-4">
            <StudentCardioSummary studentId={id} locale={locale} />
            <Card className="min-w-0 border-0 bg-transparent p-1 shadow-none sm:p-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Dumbbell size={18} />{" "}
                      {label("Programação dos kits", "Kit schedule")}
                    </CardTitle>
                    <CardDescription>
                      {label(
                        "Um kit por período. O próximo entra automaticamente pela data inicial; os anteriores permanecem no histórico.",
                        "One kit per period. The next starts automatically on its start date; previous kits remain in history.",
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={maxReached ? "error" : "warning"}>
                      <AlertTriangle size={12} className="mr-1" />
                      {label("Em andamento + agendados", "Current + scheduled")}
                      : {activeCount} / {MAX_ACTIVE_WORKOUTS}
                    </Badge>
                    <AssignWorkoutKitModalClient
                      studentId={id}
                      today={workoutToday}
                      nextStart={nextWorkoutStart}
                      capacity={Math.max(0, MAX_ACTIVE_WORKOUTS - activeCount)}
                      kits={kits}
                      locale={locale}
                      disabled={maxReached}
                      disabledReason="Já existem seis kits em andamento ou agendados."
                    />
                  </div>
                </div>
                {maxReached && (
                  <div className="mt-3 rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-2.5 text-sm text-red-300 flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>
                      {label(
                        "Os seis períodos disponíveis estão ocupados. Novas vagas ficam disponíveis quando um kit termina ou é desatribuído.",
                        "All six periods are occupied. Slots become available when a kit ends or is unassigned.",
                      )}
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <EmptyState
                    className="py-12"
                    icon={
                      <Dumbbell size={36} className="text-text-secondary" />
                    }
                    title={label(
                      "Nenhum treino atribuído",
                      "No assigned workouts",
                    )}
                    description={label(
                      "Clique em 'Programar kits' para organizar os períodos de treino.",
                      "Select 'Schedule kits' to arrange the workout periods.",
                    )}
                  />
                ) : (
                  <div className="min-w-0 rounded-xl border border-white/[0.07] overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{label("Nome", "Name")}</TableHead>
                          <TableHead>{label("Início", "Start")}</TableHead>
                          <TableHead>{label("Fim", "End")}</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                            {label("Atribuído em", "Assigned on")}
                          </TableHead>
                          <TableHead className="text-right">
                            {tCommon("actions")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignments.map((a) => {
                          const kit = (a as any).kit;
                          const program = (a as any).program;
                          const namePt =
                            (kit && (kit as any).name_pt) ||
                            (program && (program as any).title_pt) ||
                            "Sem titulo";
                          const nameEn =
                            (kit && (kit as any).name_en) ||
                            (program && (program as any).title_en) ||
                            "Untitled";
                          const displayName =
                            locale === "pt-BR" ? namePt : nameEn;
                          return (
                            <TableRow key={a.id}>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm">
                                  <Dumbbell
                                    size={14}
                                    className="text-text-secondary shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-text truncate max-w-[260px]">
                                      {displayName}
                                    </div>
                                    <div className="text-xs text-text-secondary truncate max-w-[260px]">
                                      {kit
                                        ? `Kit: ${(kit as any).name_pt || (kit as any).name_en}`
                                        : `Programa individual`}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{dateLabel(a.start_date)}</TableCell>
                              <TableCell>{dateLabel(a.end_date)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    assignmentPhase(a, workoutToday) ===
                                    "current"
                                      ? "success"
                                      : assignmentPhase(a, workoutToday) ===
                                          "scheduled"
                                        ? "warning"
                                        : "outline"
                                  }
                                >
                                  {assignmentPhase(a, workoutToday) ===
                                  "current"
                                    ? label("Em andamento", "Current")
                                    : assignmentPhase(a, workoutToday) ===
                                        "scheduled"
                                      ? label("Agendado", "Scheduled")
                                      : assignmentPhase(a, workoutToday) ===
                                          "ended"
                                        ? label("Encerrado", "Ended")
                                        : statusLabel(a.status, tCommon)}
                                </Badge>
                              </TableCell>
                              <TableCell>{dateLabel(a.assigned_at)}</TableCell>
                              <TableCell className="text-right">
                                {a.kit_id &&
                                  ["current", "scheduled"].includes(
                                    assignmentPhase(a, workoutToday),
                                  ) && (
                                    <WorkoutPeriodEditor
                                      studentId={id}
                                      assignmentId={a.id}
                                      kitId={a.kit_id}
                                      namePt={namePt}
                                      nameEn={nameEn}
                                      start={a.start_date}
                                      end={a.end_date ?? null}
                                      locale={locale}
                                      today={workoutToday}
                                    />
                                  )}
                                <UnassignWorkoutButton
                                  swkId={a.id}
                                  locale={locale}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
        {selectedTab === "history" && (
          <section className="mt-4">
            <Card className="min-w-0 border-0 bg-transparent p-1 shadow-none sm:p-2">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <History size={18} /> Histórico de sessões
                  </CardTitle>
                  <CardDescription>
                    Últimas sessões de treino concluídas pelo aluno.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <EmptyState
                    className="py-12"
                    icon={<History size={36} className="text-text-secondary" />}
                    title={label(
                      "Sem sessões concluídas",
                      "No completed sessions",
                    )}
                    description={label(
                      "O aluno ainda não finalizou nenhuma sessão de treino.",
                      "The student has not completed a workout session yet.",
                    )}
                  />
                ) : (
                  <div className="min-w-0 rounded-xl border border-white/[0.07] overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{label("Data", "Date")}</TableHead>
                          <TableHead>{label("Iniciada", "Started")}</TableHead>
                          <TableHead>
                            {label("Finalizada", "Completed")}
                          </TableHead>
                          <TableHead>{label("Duração", "Duration")}</TableHead>
                          <TableHead>
                            {label("Sentimento", "Feeling")}
                          </TableHead>
                          <TableHead>RPE</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-semibold text-text">
                              {dateLabel(s.scheduled_date)}
                            </TableCell>
                            <TableCell>{timeLabel(s.started_at)}</TableCell>
                            <TableCell>{timeLabel(s.completed_at)}</TableCell>
                            <TableCell>
                              {s.duration_min ? `${s.duration_min} min` : "-"}
                            </TableCell>
                            <TableCell>
                              {s.feeling_scale
                                ? "★".repeat(
                                    Math.max(0, Math.min(5, s.feeling_scale)),
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {s.rpe_avg != null ? String(s.rpe_avg) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
        {selectedTab === "supplements" && (
          <section className="mt-4">
            <Card className="min-w-0 border-0 bg-transparent p-1 shadow-none sm:p-2">
              <CardContent className="pt-5">
                <StudentKitsPanel
                  studentId={id}
                  fingerprint={supplementFingerprint}
                  kind="supplement"
                  kits={supplementKitOptions}
                  assignments={supplementAssignments}
                />
              </CardContent>
            </Card>
          </section>
        )}
        {selectedTab === "diets" && (
          <section className="mt-4">
            <Card className="min-w-0 border-0 bg-transparent p-1 shadow-none sm:p-2">
              <CardContent className="pt-5">
                <StudentKitsPanel
                  studentId={id}
                  fingerprint={dietFingerprint}
                  kind="diet"
                  kits={dietKitOptions}
                  assignments={dietAssignments}
                />
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
function InfoLine({
  icon,
  label,
  value,
  span,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
}) {
  return (
    <div
      className={
        "min-w-0 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-3 " +
        (span === 2 ? "sm:col-span-2" : "")
      }
    >
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-medium text-zinc-500 mb-2">
        {icon}
        {label}
      </div>
      <div className="break-words text-xs font-medium text-zinc-300">
        {value}
      </div>
    </div>
  );
}
function methodLabel(method?: string | null, provider?: string | null): string {
  if (!method && !provider) return "-";
  const m: Record<string, string> = {
    credit_card: "Cartão de crédito",
    pix: "PIX",
    boleto: "Boleto",
    bank_transfer: "Transferência bancária",
    stripe: "Stripe",
    asaas: "Asaas",
  };
  const a = method ? m[method] : null;
  const b = provider ? m[provider] : null;
  if (a && b && a !== b) return `${a} (${b})`;
  return a || b || method || provider || "-";
}
