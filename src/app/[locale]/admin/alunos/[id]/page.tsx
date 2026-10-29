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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
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
  WorkoutProgramRow,
  WorkoutSessionRow,
  StudentSupplementKitWithKit,
  StudentDietKitWithKit,
  SupplementKitRow,
  DietKitRow,
} from "@/types";
import { UnassignWorkoutButton } from "@/components/admin/workout/UnassignWorkoutButton";
import { AssignWorkoutKitModalClient } from "@/components/admin/workout/AssignWorkoutKitModalClient";
import { StudentPasswordResetForm } from "@/components/admin/StudentPasswordResetForm";
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
export default async function AdminAlunoDetalhePage({
  params: { locale, id },
}: {
  params: { locale: (typeof locales)[number]; id: string };
}) {
  if (!locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const label = (pt: string, en: string) => (locale === "en-US" ? en : pt);
  const dateLabel = (value?: string | null) => formatDateISO(value, locale);
  const timeLabel = (value?: string | null) => formatDateTime(value, locale);
  const actor = await requireRole(["admin", "coach"], "/dashboard");
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
      : { data: [] };
  const responsibility =
    actor.role === "admin"
      ? await supabase
          .from("mentorship_rooms")
          .select("coach_id")
          .eq("user_id", id)
          .maybeSingle()
      : { data: null };
  let profile: ExtendedProfile | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .eq("role", "student")
      .eq("is_deleted", false)
      .maybeSingle();
    profile = (data as ExtendedProfile | null) ?? null;
  } catch {
    profile = null;
  }
  if (!profile) {
    notFound();
  }
  let email = (profile as any).email || null;
  if (!email) {
    try {
      const res = await (supabase.auth.admin as any)?.getUserById?.(id);
      email = res?.data?.user?.email ?? null;
    } catch {}
  }
  let subscription: SubscriptionWithPlan | null = null;
  try {
    const sub =
      actor.role === "admin" ? await SubscriptionService.getActive(id) : null;
    if (sub) {
      const { data: planData } = await supabase
        .from("plans")
        .select("name_pt,name_en,price_cents,currency")
        .eq("id", sub.plan_id)
        .maybeSingle();
      const plan = planData as
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
        started_at: sub.started_at,
      };
    }
  } catch {
    subscription = null;
  }
  let assignments: StudentWorkoutKitRow[] = [];
  try {
    assignments = await WorkoutKitService.listStudentAssignments(id);
  } catch {
    assignments = [];
  }
  let history: WorkoutSessionRow[] = [];
  try {
    history = await WorkoutService.userHistory(id, 20);
  } catch {
    history = [];
  }
  let kits: WorkoutKitRow[] = [];
  let programs: WorkoutProgramRow[] = [];
  try {
    kits = await WorkoutKitService.listKits({ is_published: true });
    programs = await WorkoutService.listPrograms({ status: "active" });
  } catch {
    kits = [];
    programs = [];
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
  } catch {
    supplementKitOptions = [];
    supplementAssignments = [];
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
  } catch {
    dietKitOptions = [];
    dietAssignments = [];
  }
  const activeCount = assignments.filter((a) => a.status === "active").length;
  const maxReached = activeCount >= MAX_ACTIVE_WORKOUTS;
  return (
    <div className="space-y-6 w-full min-w-0 text-zinc-100">
      <StudentProfileHeader
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card
          className={
            actor.role === "admin"
              ? "xl:col-span-2 min-w-0 rounded-2xl border-white/[0.08] bg-[#101113] p-5"
              : "xl:col-span-3 min-w-0 rounded-2xl border-white/[0.08] bg-[#101113] p-5"
          }
        >
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
        {actor.role === "admin" && (
          <Card className="min-w-0 rounded-2xl border-white/[0.08] bg-[#101113] p-5 shadow-none">
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
                <div className="grid grid-cols-1 gap-3 text-sm">
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
                    value={statusLabel(subscription.status, tCommon, tPayments)}
                  />
                  <InfoLine
                    icon={<CalendarDays size={14} />}
                    label={label("Próximo vencimento", "Next due date")}
                    value={dateLabel(subscription.current_period_end)}
                  />
                  <InfoLine
                    icon={<CreditCard size={14} />}
                    label={label("Método de pagamento", "Payment method")}
                    value={methodLabel(
                      subscription.payment_method_pref,
                      subscription.provider,
                    )}
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
        )}
      </div>
      <Tabs
        defaultValue="workouts"
        className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#101113] p-3 sm:p-5"
      >
        <TabsList className="mb-2 flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-white/10 bg-transparent p-0 pb-3">
          <TabsTrigger value="routine">
            <CalendarDays size={14} className="mr-1.5" />
            {label("Rotina e saúde", "Routine and health")}
          </TabsTrigger>
          <TabsTrigger value="workouts">
            <Dumbbell size={14} className="mr-1.5" /> Treinos atribuídos
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={14} className="mr-1.5" /> Histórico de sessões
          </TabsTrigger>
          <TabsTrigger value="supplements">
            <Pill size={14} className="mr-1.5" />{" "}
            {tStudentKits("titleSupplement")}
          </TabsTrigger>
          <TabsTrigger value="diets">
            <Utensils size={14} className="mr-1.5" />{" "}
            {tStudentKits("titleDiet")}
          </TabsTrigger>
          {actor.role === "admin" && (
            <TabsTrigger value="management">
              <User size={14} className="mr-1.5" />
              {label("Administração", "Administration")}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="routine">
          <StudentRoutinePanel studentId={id} />
        </TabsContent>
        {actor.role === "admin" && (
          <TabsContent value="management">
            <div className="grid items-start gap-5 lg:grid-cols-2">
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
          </TabsContent>
        )}

        <TabsContent value="workouts" className="mt-4">
          <Card className="min-w-0 border-0 bg-transparent p-1 shadow-none sm:p-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Dumbbell size={18} /> Treinos atribuídos
                  </CardTitle>
                  <CardDescription>
                    Gerencie os programas e kits atribuídos a este aluno.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={maxReached ? "error" : "warning"}>
                    <AlertTriangle size={12} className="mr-1" />
                    Ativos: {activeCount} / {MAX_ACTIVE_WORKOUTS} (máximo
                    permitido)
                  </Badge>
                  <AssignWorkoutKitModalClient
                    studentId={id}
                    kits={kits}
                    programs={programs}
                    locale={locale}
                    disabled={maxReached}
                    disabledReason="Limite máximo de 6 treinos ativos atingido."
                  />
                </div>
              </div>
              {maxReached && (
                <div className="mt-3 rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-2.5 text-sm text-red-300 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Este aluno atingiu o limite máximo de {MAX_ACTIVE_WORKOUTS}{" "}
                    treinos ativos. Desatribua um treino existente antes de
                    atribuir um novo.
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <EmptyState
                  className="py-12"
                  icon={<Dumbbell size={36} className="text-text-secondary" />}
                  title={label(
                    "Nenhum treino atribuído",
                    "No assigned workouts",
                  )}
                  description={label(
                    "Clique em 'Atribuir novo' para adicionar o primeiro programa ao aluno.",
                    "Select 'Assign new' to add the first workout program.",
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
                              <Badge variant={statusBadgeVariant(a.status)}>
                                {statusLabel(a.status, tCommon)}
                              </Badge>
                            </TableCell>
                            <TableCell>{dateLabel(a.assigned_at)}</TableCell>
                            <TableCell className="text-right">
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
        </TabsContent>
        <TabsContent value="history" className="mt-4">
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
                        <TableHead>{label("Sentimento", "Feeling")}</TableHead>
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
        </TabsContent>
        <TabsContent value="supplements" className="mt-4">
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
        </TabsContent>
        <TabsContent value="diets" className="mt-4">
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
        </TabsContent>
      </Tabs>
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
