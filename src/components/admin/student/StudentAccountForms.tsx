"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setStudentSuspensionAction, updateStudentProfileAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type StudentDetails = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  country?: string | null;
  language?: string | null;
};

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{children}</Button>;
}

export function StudentAccountForms({
  studentId, locale, profile, suspended,
}: {
  studentId: string;
  locale: string;
  profile: StudentDetails;
  suspended: boolean | null;
}) {
  const [profileState, profileAction] = useFormState(updateStudentProfileAction, null);
  const [accessState, accessAction] = useFormState(setStudentSuspensionAction, null);
  const label = (pt: string, en: string) => locale === "en-US" ? en : pt;
  const fields = [
    { name: "first_name", title: label("Nome", "First name"), required: true, maxLength: 100 },
    { name: "last_name", title: label("Sobrenome", "Last name"), required: true, maxLength: 100 },
    { name: "phone", title: label("Telefone", "Phone"), type: "tel", maxLength: 50 },
    { name: "birth_date", title: label("Nascimento", "Date of birth"), type: "date" },
    { name: "height_cm", title: label("Altura (cm)", "Height (cm)"), type: "number", min: 50, max: 260 },
    { name: "weight_kg", title: label("Peso (kg)", "Weight (kg)"), type: "number", min: 20, max: 400, step: "0.01" },
    { name: "country", title: label("País", "Country"), maxLength: 100 },
  ] as const;

  return (
    <>
      <Card>
        <CardHeader><CardTitle>{label("Dados cadastrais", "Profile details")}</CardTitle></CardHeader>
        <CardContent>
          <form action={profileAction} className="space-y-4">
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="locale" value={locale} />
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map(({ name, title, ...props }) => (
                <label key={name} className="block text-sm">
                  {title}
                  <Input name={name} defaultValue={profile[name] ?? ""} {...props} />
                </label>
              ))}
              <label className="block text-sm">
                {label("Gênero", "Gender")}
                <select name="gender" defaultValue={profile.gender ?? ""} className="block w-full rounded-md border border-border bg-surface p-2">
                  <option value="">{label("Não informado", "Not specified")}</option>
                  <option value="female">{label("Feminino", "Female")}</option>
                  <option value="male">{label("Masculino", "Male")}</option>
                  <option value="other">{label("Outro", "Other")}</option>
                </select>
              </label>
              <label className="block text-sm">
                {label("Idioma", "Language")}
                <select name="language" defaultValue={profile.language ?? "pt-BR"} className="block w-full rounded-md border border-border bg-surface p-2">
                  <option value="pt-BR">Português</option>
                  <option value="en-US">English</option>
                </select>
              </label>
            </div>
            <Submit>{label("Salvar cadastro", "Save profile")}</Submit>
            <p role="status" className="text-sm">{profileState?.message}</p>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{label("Acesso à conta", "Account access")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {suspended === null ? (
            <p>{label("Não foi possível consultar a conta.", "Could not check account status.")}</p>
          ) : (
            <form action={accessAction} className="space-y-3">
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="operation" value={suspended ? "reactivate" : "suspend"} />
              <p>{suspended ? label("Conta suspensa", "Account suspended") : label("Conta habilitada", "Account enabled")}</p>
              <p className="text-sm text-text-secondary">
                {label("Esta ação altera o acesso à conta. A assinatura e as cobranças seguem as condições do plano.", "This action changes account access. Subscription and billing follow the plan terms.")}
              </p>
              <Submit>{suspended ? label("Reativar conta", "Reactivate account") : label("Suspender conta", "Suspend account")}</Submit>
              <p role="status" className="text-sm">{accessState?.message}</p>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}
