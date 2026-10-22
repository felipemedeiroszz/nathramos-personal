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
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
  Plus,
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
  ProfileRow,
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
import { AssignWorkoutKitModal } from "@/components/admin/workout/AssignWorkoutKitModal";
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

function formatDateISO(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR");
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

function statusBadgeVariant(status: string): "default" | "success" | "warning" | "error" | "outline" {
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

function statusLabel(status: string, tCommon: (k: any) => string, tPayments?: any): string {
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
  await requireRole(["admin", "coach"], "/dashboard");

  const tAdmin = await getTranslations("admin");
  const tAdminNav = await getTranslations("adminNav");
  const tCommon = await getTranslations("common");
  const tAuth = await getTranslations("auth");
  const tPayments = await getTranslations("payments");
  const tWorkout = await getTranslations("workout");
  const tKit = await getTranslations("kit");
  const tStudentKits = await getTranslations("studentKits");
  const tMuscle = await getTranslations("muscleGroups");
  const tEquip = await getTranslations("equipments");
  const tDiff = await getTranslations("difficultyLevels");

  const supabase = await createServiceClientSSR();

  let profile: ExtendedProfile | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
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
      email = res?.user?.email ?? null;
    } catch {}
  }

  let subscription: SubscriptionWithPlan | null = null;
  try {
    const sub = await SubscriptionService.getActive(id);
    if (sub) {
      const { data: planData } = await supabase
        .from("plans")
        .select("name_pt,name_en,price_cents,currency")
        .eq("id", sub.plan_id)
        .maybeSingle();
      const plan = planData as (PlanRow & { name_pt: string; name_en: string }) | null;
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
    const allSupplementKits: SupplementKitRow[] = await SupplementService.listKits({
      is_published: true,
    });
    supplementKitOptions = allSupplementKits.map((k) => ({
      id: k.id,
      namePt: k.name_pt,
      nameEn: k.name_en,
    }));
    const rows: StudentSupplementKitWithKit[] = await SupplementService.listStudentKits(
      id,
      "active"
    );
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
    const allDietKits: DietKitRow[] = await DietService.listKits({ is_published: true });
    dietKitOptions = allDietKits.map((k) => ({
      id: k.id,
      namePt: k.name_pt,
      nameEn: k.name_en,
    }));
    const rows: StudentDietKitWithKit[] = await DietService.listStudentKits(id, "active");
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

  const avatarFallback = (`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "??")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() ?? "")
    .join("") || "??";

  const title = (() => {
    try {
      if (tAdminNav.has("students")) return tAdminNav("students");
    } catch {}
    return "Alunos";
  })();

  return (
    <div className="space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">
          {`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || tAuth("firstName") + " " + tAuth("lastName")}
        </h1>
        <p className="text-sm md:text-base text-text-secondary">
          Perfil detalhado do aluno e gerenciamento de conteudos atribuidos.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User size={18} /> Perfil
                </CardTitle>
                <CardDescription>Dados cadastrais</CardDescription>
              </div>
              <Badge variant={profile.role === "admin" ? "error" : profile.role === "coach" ? "warning" : "default"}>
                {(profile.role ?? "student").toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar
                size="xl"
                src={profile.avatar_url ?? undefined}
                alt={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Avatar"}
                fallback={avatarFallback}
              />
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold text-text truncate">
                  {`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "-"}
                </div>
                {email && (
                  <div className="text-sm text-text-secondary truncate flex items-center gap-1.5 mt-0.5">
                    <Mail size={12} /> {email}
                  </div>
                )}
                <div className="text-xs text-text-secondary mt-1">
                  Criado em: {formatDateTime(profile.created_at)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <InfoLine icon={<Mail size={14} />} label={tAuth("email")} value={email || "-"} />
              <InfoLine icon={<Phone size={14} />} label={tAuth("phone")} value={profile.phone || "-"} />
              <InfoLine
                icon={<Calendar size={14} />}
                label={tAuth("birthDate")}
                value={formatDateISO(profile.birth_date)}
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
                label="Cadastrado em"
                value={formatDateISO(profile.created_at)}
                span={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard size={18} /> Assinatura
                </CardTitle>
                <CardDescription>Plano e status atual</CardDescription>
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
                icon={<CreditCard size={32} className="text-text-secondary" />}
                title="Sem assinatura ativa"
                description="Aluno nao possui plano ativo no momento."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 text-sm">
                <InfoLine
                  icon={<CreditCard size={14} />}
                  label="Plano"
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
                  label="Proximo vencimento"
                  value={formatDateISO(subscription.current_period_end)}
                />
                <InfoLine
                  icon={<CreditCard size={14} />}
                  label="Metodo de pagamento"
                  value={methodLabel(subscription.payment_method_pref, subscription.provider)}
                />
                <InfoLine
                  icon={<UserPlus size={14} />}
                  label="Iniciada em"
                  value={formatDateISO(subscription.started_at)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History size={18} /> Resumo
                </CardTitle>
                <CardDescription>Metricas rapidas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-xl border border-border bg-surface-secondary/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <Dumbbell size={14} /> Treinos atribuidos
              </div>
              <div className="text-lg font-bold text-text">{assignments.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface-secondary/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <CheckCircle2 size={14} /> Sessoes concluidas
              </div>
              <div className="text-lg font-bold text-text">{history.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface-secondary/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-secondary text-sm">
                <Clock size={14} /> Ultima sessao
              </div>
              <div className="text-sm font-semibold text-text">
                {history.length ? formatDateISO(history[0].completed_at) : "-"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <StudentPasswordResetForm
        studentId={id}
        studentName={`${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "aluno"}
      />

      <Tabs defaultValue="workouts">
        <TabsList>
          <TabsTrigger value="workouts">
            <Dumbbell size={14} className="mr-1.5" /> Treinos atribuidos
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={14} className="mr-1.5" /> Historico de sessoes
          </TabsTrigger>
          <TabsTrigger value="supplements">
            <Pill size={14} className="mr-1.5" /> {tStudentKits("titleSupplement")}
          </TabsTrigger>
          <TabsTrigger value="diets">
            <Utensils size={14} className="mr-1.5" /> {tStudentKits("titleDiet")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell size={18} /> Treinos atribuidos
                  </CardTitle>
                  <CardDescription>
                    Gerencie os programas e kits atribuidos a este aluno.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={maxReached ? "error" : "warning"}>
                    <AlertTriangle size={12} className="mr-1" />
                    Ativos: {activeCount} / {MAX_ACTIVE_WORKOUTS} (maximo permitido)
                  </Badge>
                  <AssignWorkoutKitModalClient
                    studentId={id}
                    kits={kits}
                    programs={programs}
                    locale={locale}
                    disabled={maxReached}
                    disabledReason="Limite maximo de 6 treinos ativos atingido."
                  />
                </div>
              </div>
              {maxReached && (
                <div className="mt-3 rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-2.5 text-sm text-red-300 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    Este aluno atingiu o limite maximo de {MAX_ACTIVE_WORKOUTS} treinos ativos.
                    Desatribua um treino existente antes de atribuir um novo.
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <EmptyState
                  className="py-12"
                  icon={<Dumbbell size={36} className="text-text-secondary" />}
                  title="Nenhum treino atribuido"
                  description="Clique em 'Atribuir novo' para adicionar o primeiro programa ao aluno."
                />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Atribuido em</TableHead>
                        <TableHead className="text-right">{tCommon("actions")}</TableHead>
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
                        const displayName = locale === "pt-BR" ? namePt : nameEn;
                        return (
                          <TableRow key={a.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Dumbbell size={14} className="text-text-secondary shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-semibold text-text truncate max-w-[260px]">
                                    {displayName}
                                  </div>
                                  <div className="text-xs text-text-secondary truncate max-w-[260px]">
                                    {kit ? `Kit: ${(kit as any).name_pt || (kit as any).name_en}` : `Programa individual`}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{formatDateISO(a.start_date)}</TableCell>
                            <TableCell>{formatDateISO(a.end_date)}</TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant(a.status)}>
                                {statusLabel(a.status, tCommon)}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDateISO(a.assigned_at)}</TableCell>
                            <TableCell className="text-right">
                              <UnassignWorkoutButton swkId={a.id} locale={locale} />
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
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History size={18} /> Historico de sessoes
                </CardTitle>
                <CardDescription>
                  Ultimas sessoes de treino concluidas pelo aluno.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <EmptyState
                  className="py-12"
                  icon={<History size={36} className="text-text-secondary" />}
                  title="Sem sessoes concluidas"
                  description="O aluno ainda nao finalizou nenhuma sessao de treino."
                />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Iniciada</TableHead>
                        <TableHead>Finalizada</TableHead>
                        <TableHead>Duracao</TableHead>
                        <TableHead>Sentimento</TableHead>
                        <TableHead>RPE</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-semibold text-text">
                            {formatDateISO(s.scheduled_date)}
                          </TableCell>
                          <TableCell>{formatDateTime(s.started_at)}</TableCell>
                          <TableCell>{formatDateTime(s.completed_at)}</TableCell>
                          <TableCell>
                            {s.duration_min ? `${s.duration_min} min` : "-"}
                          </TableCell>
                          <TableCell>
                            {s.feeling_scale
                              ? "★".repeat(Math.max(0, Math.min(5, s.feeling_scale)))
                              : "-"}
                          </TableCell>
                          <TableCell>{s.rpe_avg != null ? String(s.rpe_avg) : "-"}</TableCell>
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
          <Card>
            <CardContent className="pt-5">
              <StudentKitsPanel
                studentId={id}
                kind="supplement"
                kits={supplementKitOptions}
                assignments={supplementAssignments}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diets" className="mt-4">
          <Card>
            <CardContent className="pt-5">
              <StudentKitsPanel
                studentId={id}
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
        "rounded-xl border border-border bg-surface-secondary/30 px-3 py-2.5 " +
        (span === 2 ? "sm:col-span-2" : "")
      }
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-0.5">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-text">{value}</div>
    </div>
  );
}

function methodLabel(method?: string | null, provider?: string | null): string {
  if (!method && !provider) return "-";
  const m: Record<string, string> = {
    credit_card: "Cartao de credito",
    pix: "PIX",
    boleto: "Boleto",
    bank_transfer: "Transferencia bancaria",
    stripe: "Stripe",
    asaas: "Asaas",
  };
  const a = method ? m[method] : null;
  const b = provider ? m[provider] : null;
  if (a && b && a !== b) return `${a} (${b})`;
  return a || b || method || provider || "-";
}
