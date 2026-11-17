export const studentDetailTabs = [
  { id: "profile", pt: "Dados pessoais", en: "Personal details", icon: "user" },
  { id: "workouts", pt: "Treinos", en: "Workouts", icon: "workout" },
  { id: "history", pt: "Sessões", en: "Sessions", icon: "history" },
  { id: "diets", pt: "Dietas", en: "Diets", icon: "diet" },
  {
    id: "supplements",
    pt: "Suplementos",
    en: "Supplements",
    icon: "supplement",
  },
  {
    id: "routine",
    pt: "Rotina e saúde",
    en: "Routine and health",
    icon: "routine",
  },
  {
    id: "billing",
    pt: "Financeiro",
    en: "Billing",
    icon: "billing",
    admin: true,
  },
  {
    id: "management",
    pt: "Administração",
    en: "Administration",
    icon: "settings",
    admin: true,
  },
] as const;
export type StudentDetailTab = (typeof studentDetailTabs)[number]["id"];
export function availableStudentTabs(admin: boolean) {
  return studentDetailTabs.filter((tab) => !("admin" in tab) || admin);
}
export function selectedStudentTab(
  params: Record<string, string | undefined>,
  admin: boolean,
): StudentDetailTab {
  const requested =
    params.tab ||
    (Object.keys(params).some((key) => key.startsWith("finance") && params[key])
      ? "billing"
      : "profile");
  return (
    availableStudentTabs(admin).find((tab) => tab.id === requested)?.id ||
    "profile"
  );
}
export function studentTabHref(
  base: string,
  tab: StudentDetailTab,
  params: Record<string, string | undefined> = {},
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value && key !== "tab") query.set(key, value);
  query.set("tab", tab);
  return `${base}?${query}#ficha-aluno`;
}
