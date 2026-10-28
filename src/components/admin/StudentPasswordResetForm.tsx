"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { resetStudentPasswordAction } from "@/app/actions/admin";
function Submit({ en }: { en: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? en
          ? "Saving…"
          : "Salvando…"
        : en
          ? "Change password"
          : "Alterar senha"}
    </Button>
  );
}
export function StudentPasswordResetForm({
  studentId,
  studentName,
  locale = "pt-BR",
}: {
  studentId: string;
  studentName: string;
  locale?: string;
}) {
  const en = locale === "en-US";
  const [state, action] = useFormState(resetStudentPasswordAction, null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <Lock size={18} />
          {en ? "Access password" : "Senha de acesso"}
        </CardTitle>
        <CardDescription>
          {en
            ? `Set a unique password for ${studentName}, with at least 12 characters.`
            : `Defina uma senha exclusiva para ${studentName}, com pelo menos 12 caracteres.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />
          <label className="block text-sm">
            {en ? "New password" : "Nova senha"}
            <Input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <label className="block text-sm">
            {en ? "Confirm password" : "Confirmar senha"}
            <Input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
          <p
            role="status"
            className={state?.success ? "text-primary" : "text-text-secondary"}
          >
            {state &&
              (en
                ? state.success
                  ? "Password updated."
                  : "Could not update the password. Check the confirmation and use 12–128 characters."
                : state.message)}
          </p>
          <Submit en={en} />
        </form>
      </CardContent>
    </Card>
  );
}
