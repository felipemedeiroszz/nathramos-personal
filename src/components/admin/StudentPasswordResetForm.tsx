"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Lock, KeyRound, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { resetStudentPasswordAction } from "@/app/actions/admin";

interface StudentPasswordResetFormProps {
  studentId: string;
  studentName: string;
}

export function StudentPasswordResetForm({
  studentId,
  studentName,
}: StudentPasswordResetFormProps) {
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [state, formAction] = useFormState(resetStudentPasswordAction, null);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock size={18} /> Senha de acesso
        </CardTitle>
        <CardDescription>
          Redefina a senha de {studentName} para o padrão ou defina uma nova senha.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state?.success ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-start gap-3 text-sm text-emerald-400">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>
              {state.defaultUsed
                ? "Senha redefinida para o padrão (Alunonathramos)."
                : "Senha alterada com sucesso."}
            </span>
          </div>
        ) : state?.success === false && state.message && state.message !== "validation" ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3 text-sm text-red-400">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{state.message}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === "default" ? "primary" : "outline"}
            size="sm"
            onClick={() => setMode("default")}
          >
            <RotateCcw size={16} className="mr-2" />
            Redefinir para padrão
          </Button>
          <Button
            type="button"
            variant={mode === "custom" ? "primary" : "outline"}
            size="sm"
            onClick={() => setMode("custom")}
          >
            <KeyRound size={16} className="mr-2" />
            Definir nova senha
          </Button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="studentId" value={studentId} />

          {mode === "custom" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text">Nova senha</label>
              <Input
                name="newPassword"
                type="text"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
              <p className="text-xs text-text-secondary">
                A senha deve ter entre 8 e 128 caracteres.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface-secondary/30 px-4 py-3 flex items-center gap-3">
              <KeyRound size={18} className="text-text-secondary" />
              <div>
                <p className="text-sm font-medium text-text">Senha padrão</p>
                <p className="text-sm font-mono text-primary">Alunonathramos</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border">
            <Button type="submit" variant="primary" size="lg">
              <Loader2 size={18} className="mr-2 animate-spin hidden" />
              {mode === "default" ? "Redefinir senha" : "Alterar senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
