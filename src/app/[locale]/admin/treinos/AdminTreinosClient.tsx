"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import {
  FolderKanban,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  CalendarDays,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { deleteProgramAction } from "@/app/actions/workouts";
import type {
  WorkoutProgramRow,
  WorkoutDayRow,
  WorkoutExerciseRow,
  ExerciseRow,
} from "@/types";

const ProgramUpsertModal = dynamic(
  () => import("@/components/admin/workout/ProgramUpsertModal").catch(() => () => null),
  { ssr: false }
);

const DayUpsertModal = dynamic(
  () => import("@/components/admin/workout/DayUpsertModal").catch(() => () => null),
  { ssr: false }
);

interface DayWithExercises extends WorkoutDayRow {
  exercises: Array<WorkoutExerciseRow & { exercise?: ExerciseRow | null }>;
}

interface ProgramWithDays extends WorkoutProgramRow {
  category_name_pt?: string;
  category_name_en?: string;
  days: DayWithExercises[];
}

interface TranslatorFn {
  (key: string): string;
}

interface AdminTreinosClientProps {
  locale: string;
  userId: string;
  title: string;
  subtitle: string;
  programs: ProgramWithDays[];
  categoryOptions: { id: string; name_pt: string; name_en: string }[];
  translateDifficulty: TranslatorFn;
}

function statusBadgeVariant(status: string): "default" | "success" | "warning" | "error" | "outline" {
  switch (status) {
    case "active":
      return "success";
    case "completed":
      return "default";
    case "paused":
      return "warning";
    case "archived":
      return "outline";
    default:
      return "outline";
  }
}

function formatRest(sec?: number | null): string {
  if (!sec) return "-";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m${s}s` : `${m}m`;
}

export function AdminTreinosClient({
  locale,
  userId,
  title,
  subtitle,
  programs,
  categoryOptions,
  translateDifficulty,
}: AdminTreinosClientProps) {
  const router = useRouter();
  const t = useTranslations("adminWorkouts");
  const tCommon = useTranslations("common");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramWithDays | null>(null);
  const [editingDay, setEditingDay] = useState<{ programId: string; day?: DayWithExercises } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredPrograms = programs.filter((p) => {
    const matchCat = !categoryFilter || p.category_id === categoryFilter;
    const matchSearch =
      !search.trim() ||
      p.title_pt.toLowerCase().includes(search.toLowerCase()) ||
      p.title_en.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function openCreateProgram() {
    setEditingProgram(null);
    setProgramModalOpen(true);
  }

  function openEditProgram(p: ProgramWithDays) {
    setEditingProgram(p);
    setProgramModalOpen(true);
  }

  function openCreateDay(programId: string) {
    setEditingDay({ programId });
    setDayModalOpen(true);
  }

  function openEditDay(programId: string, day: DayWithExercises) {
    setEditingDay({ programId, day });
    setDayModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteProgramAction(deleteConfirm.id);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
      router.refresh();
    }
  }

  function onProgramSaved() {
    setProgramModalOpen(false);
    setEditingProgram(null);
    router.refresh();
  }

  function onDaySaved() {
    setDayModalOpen(false);
    setEditingDay(null);
    router.refresh();
  }

  const showcaseProgram = filteredPrograms[0] ?? programs[0] ?? null;
  const showcaseDays = showcaseProgram?.days ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{subtitle}</CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderKanban size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <Select
                className="w-full sm:max-w-[200px]"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">{t("allCategories")}</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {locale === "pt-BR" ? c.name_pt : c.name_en}
                  </option>
                ))}
              </Select>
              <div className="relative flex-1 sm:max-w-sm">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <Input
                  placeholder={t("searchPlaceholder")}
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button variant="primary" size="md" className="shrink-0" onClick={openCreateProgram}>
              <Plus size={18} className="mr-2" />
              {t("newProgram")}
            </Button>
          </div>

          {filteredPrograms.length === 0 ? (
            <EmptyState
              icon={<FolderKanban size={28} className="text-text-secondary" />}
              title={t("noPrograms")}
              description={t("noProgramsDesc")}
              action={
                <Button variant="primary" size="sm" onClick={openCreateProgram}>
                  <Plus size={16} className="mr-2" />
                  {t("newProgram")}
                </Button>
              }
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("titlePtEn")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("difficulty")}</TableHead>
                    <TableHead>{t("weeks")}</TableHead>
                    <TableHead>{t("daysPerWeek")}</TableHead>
                    <TableHead>{t("minSession")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrograms.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-text">{p.title_pt}</span>
                          <span className="text-xs text-text-secondary">{p.title_en}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text">
                        {locale === "pt-BR" ? p.category_name_pt : p.category_name_en || (
                          <span className="text-text-secondary">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-text">
                        {translateDifficulty(p.difficulty)}
                      </TableCell>
                      <TableCell className="text-text">{p.total_weeks}</TableCell>
                      <TableCell className="text-text">{p.days_per_week}</TableCell>
                      <TableCell className="text-text">{p.est_minutes_per_session}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(p.status)}>
                          {t(`status${p.status.charAt(0).toUpperCase()}${p.status.slice(1)}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t("openEditor")}
                            asChild
                          >
                            <Link href={`/${locale}/admin/treinos/${p.id}`}>
                              <ArrowUpRight size={16} />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={tCommon("edit")}
                            onClick={() => openEditProgram(p)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t("archive")}
                            className="text-red-500 hover:text-red-500"
                            onClick={() =>
                              setDeleteConfirm({ id: p.id, name: p.title_pt })
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>{t("assemblyTitle")}</CardTitle>
                  <CardDescription>
                    {showcaseProgram ? (
                      <>
                        {t("assemblyProgram")}{" "}
                        <span className="font-semibold text-text">
                          {showcaseProgram.title_pt}
                        </span>{" "}
                        · {showcaseDays.length} {t("assemblyLoaded")}
                      </>
                    ) : (
                      t("noProgramSelectedDesc")
                    )}
                  </CardDescription>
                </div>
                {showcaseProgram && (
                  <Button variant="secondary" size="sm" onClick={() => openCreateDay(showcaseProgram.id)}>
                    <Plus size={16} className="mr-2" />
                    {t("newDay")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!showcaseProgram ? (
                <EmptyState
                  icon={<CalendarDays size={28} className="text-text-secondary" />}
                  title={t("noProgramSelected")}
                  description={t("noProgramSelectedDesc")}
                />
              ) : showcaseDays.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays size={28} className="text-text-secondary" />}
                  title={t("noDays")}
                  description={t("noDaysDesc")}
                  action={
                    <Button variant="primary" size="sm" onClick={() => openCreateDay(showcaseProgram.id)}>
                      <Plus size={16} className="mr-2" />
                      {t("addDay")}
                    </Button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {showcaseDays.map((dia) => (
                    <div
                      key={dia.id}
                      className="border border-border rounded-xl overflow-hidden"
                    >
                      <div className="bg-surface-secondary px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-text">{dia.name_pt}</span>
                          {dia.focus_pt && (
                            <span className="text-sm text-text-secondary">
                              · {dia.focus_pt}
                            </span>
                          )}
                          <Badge variant="outline" className="ml-1">
                            {t("week")} {dia.week_number}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            <Clock size={12} className="mr-1" />
                            {dia.est_minutes} min
                          </Badge>
                          <Badge variant="outline">
                            {dia.exercises.length} {dia.exercises.length === 1 ? t("exercisesCount") : t("exercisesCountPlural")}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={t("editDay")}
                            onClick={() => openEditDay(showcaseProgram.id, dia)}
                          >
                            <Edit size={15} />
                          </Button>
                        </div>
                      </div>
                      {dia.exercises.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-text-secondary text-center">
                          {t("noExercises")}
                        </div>
                      ) : (
                        <div className="w-full overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>{t("exercise")}</TableHead>
                                <TableHead>{t("sets")}</TableHead>
                                <TableHead>{t("reps")}</TableHead>
                                <TableHead>{t("rest")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dia.exercises.map((ex, i) => {
                                const exName =
                                  ex.exercise?.name_pt ||
                                  ex.exercise?.name_en ||
                                  `Exercise #${ex.exercise_id}`;
                                return (
                                  <TableRow key={ex.id}>
                                    <TableCell className="text-text-secondary">
                                      {i + 1}
                                    </TableCell>
                                    <TableCell className="font-semibold text-text">
                                      {exName}
                                    </TableCell>
                                    <TableCell className="text-text">
                                      {ex.sets}
                                    </TableCell>
                                    <TableCell className="text-text">
                                      {ex.reps || "-"}
                                    </TableCell>
                                    <TableCell className="text-text">
                                      {formatRest(ex.rest_seconds)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {ProgramUpsertModal && programModalOpen && (
        <ProgramUpsertModal
          isOpen={programModalOpen}
          onClose={() => {
            setProgramModalOpen(false);
            setEditingProgram(null);
          }}
          onSaved={onProgramSaved}
          program={editingProgram ?? undefined}
          userId={userId}
        />
      )}

      {DayUpsertModal && dayModalOpen && editingDay && (
        <DayUpsertModal
          isOpen={dayModalOpen}
          onClose={() => {
            setDayModalOpen(false);
            setEditingDay(null);
          }}
          onSaved={onDaySaved}
          day={editingDay.day}
          programId={editingDay.programId}
        />
      )}

      <Dialog
        isOpen={!!deleteConfirm}
        onClose={() => !deleting && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <DialogTitle>{t("confirmArchive")}</DialogTitle>
            </div>
            <DialogDescription>
              {t("confirmArchiveDesc")}{" "}
              <span className="font-semibold text-text">{deleteConfirm?.name}</span>
              {t("archiveSuffix")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              <Trash2 size={16} className="mr-2" />
              {deleting ? t("archiving") : t("archive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
