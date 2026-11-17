"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { scheduleWorkoutKitsAction } from "@/app/actions/workouts";
import { followingDate } from "@/lib/workout-schedule";
type Kit = { id: string; name_pt: string; name_en: string };
type Period = { kit_id: string; start_date: string; end_date: string };
export function WorkoutScheduleModal({
  studentId,
  kits,
  locale,
  today,
  nextStart,
  capacity = 6,
  edit,
  onClose,
}: {
  studentId: string;
  kits: Kit[];
  locale: string;
  today: string;
  nextStart: string;
  capacity?: number;
  edit?: Period & { id: string };
  onClose: () => void;
}) {
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<Period[]>([
    edit
      ? {
          kit_id: edit.kit_id,
          start_date: edit.start_date,
          end_date: edit.end_date,
        }
      : { kit_id: "", start_date: nextStart, end_date: "" },
  ]);
  function change(index: number, key: keyof Period, value: string) {
    setEntries((previous) =>
      previous.map((entry, i) =>
        i === index ? { ...entry, [key]: value } : entry,
      ),
    );
    setError("");
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        const result = await scheduleWorkoutKitsAction({
          student_id: studentId,
          assignment_id: edit?.id,
          entries,
        });
        if (!result.success) {
          setError(result.message);
          return;
        }
        router.refresh();
        onClose();
      } catch {
        setError(
          t(
            "Não foi possível salvar. Seus dados foram mantidos.",
            "Unable to save. Your entries have been preserved.",
          ),
        );
      }
    });
  }
  return (
    <Modal
      isOpen
      onClose={() => {
        if (!pending) onClose();
      }}
      aria-label={
        edit
          ? t("Editar período do kit", "Edit kit period")
          : t("Programar kits em sequência", "Schedule sequential kits")
      }
      className="max-h-[90dvh] max-w-3xl overflow-y-auto"
    >
      <ModalHeader>
        <ModalTitle>
          {edit
            ? t("Editar período do kit", "Edit kit period")
            : t("Programar kits em sequência", "Schedule sequential kits")}
        </ModalTitle>
        <ModalClose
          onClick={() => {
            if (!pending) onClose();
          }}
          disabled={pending}
        />
      </ModalHeader>
      <form onSubmit={submit}>
        <ModalBody className="space-y-4">
          <p className="text-sm text-text-secondary">
            {t(
              "Cada kit reúne os treinos da semana. A data final é inclusiva; o próximo kit começa no dia seguinte. O aluno recebe automaticamente o kit do período, no fuso horário da conta.",
              "Each kit contains the weekly workouts. The end date is inclusive; the next kit starts the following day. Students automatically receive the kit for the current period in their account time zone.",
            )}
          </p>
          <fieldset disabled={pending} className="space-y-4">
            {entries.map((entry, index) => (
              <section
                key={index}
                className="space-y-3 rounded-xl border border-border bg-white/[0.02] p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {t("Período", "Period")} {index + 1}
                  </h3>
                  {!edit && entries.length > 1 && (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-rose-400"
                      aria-label={t(
                        `Remover período ${index + 1}`,
                        `Remove period ${index + 1}`,
                      )}
                      onClick={() =>
                        setEntries((previous) =>
                          previous.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <label className="block text-sm">
                  {t("Kit de treino", "Workout kit")}
                  <select
                    name={`kit-${index}`}
                    required
                    disabled={Boolean(edit)}
                    value={entry.kit_id}
                    onChange={(event) =>
                      change(index, "kit_id", event.target.value)
                    }
                    className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3"
                  >
                    <option value="">
                      {t("Selecione um kit", "Select a kit")}
                    </option>
                    {kits.map((kit) => (
                      <option key={kit.id} value={kit.id}>
                        {en ? kit.name_en : kit.name_pt}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    {t("Data inicial", "Start date")}
                    <Input
                      name={`start-${index}`}
                      className="mt-2"
                      type="date"
                      required
                      readOnly={Boolean(edit && edit.start_date < today)}
                      min={
                        edit && edit.start_date < today
                          ? edit.start_date
                          : index
                            ? followingDate(entries[index - 1].end_date)
                            : today
                      }
                      value={entry.start_date}
                      onChange={(event) =>
                        change(index, "start_date", event.target.value)
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("Data final (inclusive)", "End date (inclusive)")}
                    <Input
                      name={`end-${index}`}
                      className="mt-2"
                      type="date"
                      required
                      min={entry.start_date > today ? entry.start_date : today}
                      value={entry.end_date}
                      onChange={(event) =>
                        change(index, "end_date", event.target.value)
                      }
                    />
                  </label>
                </div>
                {index > 0 &&
                  entry.start_date >
                    followingDate(entries[index - 1].end_date) && (
                    <p className="text-xs text-amber-300">
                      {t(
                        "Há um intervalo entre os kits. Nesse intervalo não haverá kit de treino liberado.",
                        "There is a gap between kits. No workout kit will be available during that gap.",
                      )}
                    </p>
                  )}
              </section>
            ))}
            {!edit && entries.length < capacity && (
              <Button
                type="button"
                variant="outline"
                disabled={!entries.at(-1)?.end_date}
                onClick={() =>
                  setEntries((previous) => [
                    ...previous,
                    {
                      kit_id: "",
                      start_date: followingDate(
                        previous.at(-1)?.end_date || "",
                      ),
                      end_date: "",
                    },
                  ])
                }
              >
                <Plus size={15} className="mr-2" />
                {t("Adicionar próximo kit", "Add next kit")} ({entries.length}/
                {capacity})
              </Button>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-300"
            >
              {error}
            </p>
          )}
          {!kits.length && (
            <p className="text-sm text-amber-300">
              {t(
                "Cadastre e publique um kit de treino antes de programar.",
                "Create and publish a workout kit before scheduling.",
              )}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={onClose}
          >
            {t("Cancelar", "Cancel")}
          </Button>
          <Button
            type="submit"
            disabled={pending || !kits.length || capacity < 1}
            aria-busy={pending}
          >
            {pending
              ? t("Salvando…", "Saving…")
              : edit
                ? t("Salvar período", "Save period")
                : t("Salvar sequência", "Save sequence")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
export function WorkoutPeriodEditor({
  studentId,
  kitId,
  namePt,
  nameEn,
  start,
  end,
  assignmentId,
  locale,
  today,
}: {
  studentId: string;
  kitId: string;
  namePt: string;
  nameEn: string;
  start: string;
  end: string | null;
  assignmentId: string;
  locale: string;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        {locale === "en-US" ? "Edit dates" : "Editar datas"}
      </Button>
      {open && (
        <WorkoutScheduleModal
          studentId={studentId}
          kits={[{ id: kitId, name_pt: namePt, name_en: nameEn }]}
          locale={locale}
          today={today}
          nextStart={start}
          edit={{
            id: assignmentId,
            kit_id: kitId,
            start_date: start,
            end_date: end || "",
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
