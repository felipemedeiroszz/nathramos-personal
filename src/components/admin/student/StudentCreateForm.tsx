"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createStudentAction } from "@/app/actions/students";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function Fields({ en }: { en: boolean }) {
  const { pending } = useFormStatus();
  return <fieldset disabled={pending} aria-busy={pending} className="space-y-4 min-w-0">
    <label className="block text-sm space-y-2"><span>{en ? "Full name" : "Nome completo"}</span>
      <Input name="name" autoComplete="name" required minLength={2} maxLength={150} /></label>
    <label className="block text-sm space-y-2"><span>E-mail</span>
      <Input name="email" type="email" autoComplete="off" required maxLength={254} /></label>
    <label className="block text-sm space-y-2"><span>{en ? "Phone (optional)" : "Telefone (opcional)"}</span>
      <Input name="phone" type="tel" autoComplete="tel" maxLength={30} /></label>
    <label className="block text-sm space-y-2"><span>{en ? "Initial password" : "Senha inicial"}</span>
      <Input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="student-password-help" /></label>
    <p id="student-password-help" className="text-xs text-text-secondary">{en ? "Use a unique password with 12–128 characters." : "Use uma senha exclusiva de 12 a 128 caracteres."}</p>
    <label className="block text-sm space-y-2"><span>{en ? "Confirm password" : "Confirmar senha"}</span>
      <Input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
    <Button type="submit" className="w-full">{pending ? (en ? "Creating…" : "Criando…") : (en ? "Create student" : "Cadastrar aluno")}</Button>
  </fieldset>;
}

export function StudentCreateForm({ locale }: { locale: string }) {
  const [state, action] = useFormState(createStudentAction, null);
  const form = useRef<HTMLFormElement>(null);
  const en = locale === "en-US";
  useEffect(() => { if (state?.success) form.current?.reset(); }, [state]);
  return <form ref={form} action={action} className="space-y-4">
    <input type="hidden" name="locale" value={locale} />
    <Fields en={en} />
    {state?.success && state.studentId && <Link className="block text-sm text-primary underline" href={`/${locale}/admin/alunos/${state.studentId}`}>{en ? "Open profile to assign plan and record payment" : "Abrir ficha para definir plano e registrar pagamento"}</Link>}
    {state && <p role={state.success ? "status" : "alert"} className={state.success ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{state.message}</p>}
  </form>;
}
