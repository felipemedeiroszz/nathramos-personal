"use client";
import { useFormState, useFormStatus } from "react-dom";
import { assignStudentCoachAction } from "@/app/actions/admin";
function Submit({ en }: { en: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50"
    >
      {pending
        ? en
          ? "Saving…"
          : "Salvando…"
        : en
          ? "Save coach"
          : "Salvar responsável"}
    </button>
  );
}
export function StudentCoachForm({
  studentId,
  coaches,
  current,
  locale,
}: {
  studentId: string;
  coaches: { id: string; full_name: string }[];
  current: string;
  locale: string;
}) {
  const [state, action] = useFormState(assignStudentCoachAction, null);
  const en = locale === "en-US";
  return (
    <form
      action={action}
      className="rounded-xl border border-border p-4 space-y-3"
    >
      <input type="hidden" name="studentId" value={studentId} />
      <label htmlFor="coachId" className="block font-medium">
        {en ? "Responsible coach" : "Coach responsável"}
      </label>
      <select
        id="coachId"
        name="coachId"
        defaultValue={current}
        required
        className="w-full bg-surface border border-border rounded-lg p-2"
      >
        <option value="">{en ? "Select" : "Selecione"}</option>
        {coaches.map((coach) => (
          <option key={coach.id} value={coach.id}>
            {coach.full_name}
          </option>
        ))}
      </select>
      <Submit en={en} />
      {state && (
        <p role={state.success ? "status" : "alert"}>
          {en
            ? state.success
              ? "Coach updated."
              : "Could not update the coach. Check the selected account and try again."
            : state.message}
        </p>
      )}
    </form>
  );
}
