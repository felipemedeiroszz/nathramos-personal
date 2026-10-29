"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { signUpSchema } from "@/schemas/auth";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AuthShell } from "@/components/public/AuthShell";
import { User, Calendar, Scale, MapPin, CheckCircle2 } from "lucide-react";

type SignUpFormValues = z.input<typeof signUpSchema>;

export default function CadastroPage() {
  const t = useTranslations("auth");
  const navT = useTranslations("nav");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    setError,
    trigger,
    getValues,
    formState: { errors },
    watch,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      birth_date: "",
      gender: undefined,
      height_cm: undefined,
      weight_kg: undefined,
      country: "",
      language: (locale === "en-US" ? "en-US" : "pt-BR") as "pt-BR" | "en-US",
      accepts_terms: false,
      accepts_privacy: false,
    },
  });

  const step1Fields = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "password",
    "confirmPassword",
  ] as const;
  const step2Fields = [
    "birth_date",
    "gender",
    "height_cm",
    "weight_kg",
    "country",
    "language",
  ] as const;
  const step3Fields = ["accepts_terms", "accepts_privacy"] as const;

  const fieldsForStep = (step: number) => {
    if (step === 1) return [...step1Fields];
    if (step === 2) return [...step2Fields];
    if (step === 3) return [...step3Fields];
    return [];
  };

  const nextStep = async () => {
    const ok = await trigger(fieldsForStep(currentStep), { shouldFocus: true });
    if (
      currentStep === 1 &&
      getValues("password") !== getValues("confirmPassword")
    ) {
      setError(
        "confirmPassword",
        {
          message:
            locale === "en-US"
              ? "Passwords do not match."
              : "As senhas não coincidem.",
        },
        { shouldFocus: true },
      );
      return;
    }
    if (!ok) return;
    setCurrentStep(Math.min(currentStep + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const countries = [
    { value: "BR", label: locale === "en-US" ? "Brazil" : "Brasil" },
    { value: "US", label: locale === "en-US" ? "United States" : "EUA" },
    { value: "OUTRO", label: locale === "en-US" ? "Other" : "Outro" },
  ];

  const gender = watch("gender");
  const acceptsTerms = watch("accepts_terms");
  const acceptsPrivacy = watch("accepts_privacy");

  const onSubmit: SubmitHandler<SignUpFormValues> = async (values) => {
    if (isPending) return;
    setServerError(null);

    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("first_name", values.first_name);
      formData.append("last_name", values.last_name);
      formData.append("phone", values.phone);
      formData.append("email", values.email);
      formData.append("password", values.password);
      formData.append("confirmPassword", values.confirmPassword);
      formData.append("birth_date", values.birth_date);
      if (values.gender) formData.append("gender", values.gender);
      formData.append(
        "height_cm",
        values.height_cm != null ? String(values.height_cm) : "",
      );
      formData.append(
        "weight_kg",
        values.weight_kg != null ? String(values.weight_kg) : "",
      );
      formData.append("country", values.country);
      formData.append(
        "language",
        values.language ?? (locale === "en-US" ? "en-US" : "pt-BR"),
      );
      formData.append("accepts_terms", values.accepts_terms ? "true" : "false");
      formData.append(
        "accepts_privacy",
        values.accepts_privacy ? "true" : "false",
      );
      const nextParam = new URLSearchParams(window.location.search).get("next");
      if (nextParam) formData.append("next", nextParam);

      const result = await signUpAction(formData);
      if (result && !result.success) {
        const fieldErrors = result.errors as Record<
          keyof SignUpFormValues,
          string[] | undefined
        >;
        (Object.keys(fieldErrors) as Array<keyof SignUpFormValues>).forEach(
          (key) => {
            const msgs = fieldErrors[key];
            if (msgs && msgs.length > 0) {
              setError(key, { message: msgs[0] });
              if (step1Fields.includes(key as any)) setCurrentStep(1);
              else if (step2Fields.includes(key as any)) setCurrentStep(2);
            }
          },
        );
        if (result.message) {
          setServerError(result.message);
        }
      } else if (result && result.success) {
        const dest =
          (result as any).redirectTo ?? `/${locale}/login?registered=true`;
        router.replace(dest);
      }
    } catch {
      setServerError(
        locale === "en-US"
          ? "Unable to connect. Please try again."
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthShell
      locale={locale}
      signup
      title={t("signupTitle")}
      subtitle={t("signupSubtitle")}
    >
      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
        >
          <p className="text-sm text-red-400">{serverError}</p>
        </div>
      )}

      <ol
        className="auth-steps"
        aria-label={
          locale === "en-US" ? "Registration progress" : "Progresso do cadastro"
        }
      >
        {(locale === "en-US"
          ? ["Your account", "Your profile", "Consent"]
          : ["Sua conta", "Seu perfil", "Consentimentos"]
        ).map((label, i) => (
          <li
            key={label}
            className="auth-step"
            aria-current={currentStep === i + 1 ? "step" : undefined}
            data-complete={currentStep > i + 1}
          >
            <span className="mb-1 block text-[9px] opacity-70">0{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <form
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            currentStep < 3 &&
            event.target instanceof HTMLInputElement &&
            !["checkbox", "radio"].includes(event.target.type)
          ) {
            event.preventDefault();
            void nextStep();
          }
        }}
        onSubmit={(event) => {
          if (currentStep < 3) {
            event.preventDefault();
            void nextStep();
            return;
          }
          void handleSubmit(onSubmit, (invalid) => {
            const keys = Object.keys(invalid);
            if (keys.some((key) => step1Fields.some((field) => field === key)))
              setCurrentStep(1);
            else if (
              keys.some((key) => step2Fields.some((field) => field === key))
            )
              setCurrentStep(2);
            setServerError(
              locale === "en-US"
                ? "Please review the highlighted fields before continuing."
                : "Revise os campos destacados antes de continuar.",
            );
          })(event);
        }}
        className="space-y-5"
      >
        {currentStep === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <p className="text-sm text-primary font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                {locale === "en-US"
                  ? "Personal Information"
                  : "Informações Pessoais"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="first_name"
                  className="block text-sm font-medium text-text"
                >
                  {t("firstName")} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  disabled={isPending}
                  {...register("first_name")}
                />
                {errors.first_name && (
                  <p className="text-xs text-red-400">
                    {errors.first_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="last_name"
                  className="block text-sm font-medium text-text"
                >
                  {t("lastName")} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="last_name"
                  type="text"
                  autoComplete="family-name"
                  disabled={isPending}
                  {...register("last_name")}
                />
                {errors.last_name && (
                  <p className="text-xs text-red-400">
                    {errors.last_name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text"
                >
                  {t("email")} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  disabled={isPending}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-text"
                >
                  {t("phone")} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+55 11 900000000"
                  disabled={isPending}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-red-400">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text"
                >
                  {t("password")} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={isPending}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-400">
                    {errors.password.message}
                  </p>
                )}
                <p className="text-xs text-text-secondary">
                  {t("passwordRequirements")}
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-text"
                >
                  {t("confirmPassword")} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  disabled={isPending}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-400">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              onClick={nextStep}
              className="w-full"
              disabled={isPending}
            >
              {locale === "en-US" ? "Next" : "Próximo"}
            </Button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <p className="text-sm text-primary font-medium flex items-center gap-2">
                <Scale className="w-4 h-4" />
                {locale === "en-US"
                  ? "Physical Information"
                  : "Informações Físicas"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="birth_date"
                  className="block text-sm font-medium text-text flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-text-secondary" />
                  {t("birthDate")} <span className="text-red-400">*</span>
                </label>
                <Input
                  id="birth_date"
                  type="date"
                  autoComplete="bday"
                  disabled={isPending}
                  {...register("birth_date")}
                />
                {errors.birth_date && (
                  <p className="text-xs text-red-400">
                    {errors.birth_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-medium text-text">
                  {t("gender")} <span className="text-red-400">*</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { v: "M", label: t("male") },
                      { v: "F", label: t("female") },
                      { v: "O", label: t("other") },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.v}
                      className={`flex items-center justify-center gap-2 h-11 rounded-xl border cursor-pointer transition-all px-3 ${
                        gender === opt.v
                          ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                          : "border-border bg-surface text-text-secondary hover:border-primary/50 hover:bg-surface/80"
                      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        value={opt.v}
                        disabled={isPending}
                        className="sr-only"
                        {...register("gender")}
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-xs text-red-400">
                    {errors.gender.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="height_cm"
                  className="block text-sm font-medium text-text flex items-center gap-2"
                >
                  <Scale className="w-4 h-4 text-text-secondary" />
                  {t("height")} (cm) <span className="text-red-400">*</span>
                </label>
                <Input
                  id="height_cm"
                  type="number"
                  min={50}
                  max={300}
                  step={1}
                  placeholder="170"
                  disabled={isPending}
                  {...register("height_cm")}
                />
                {errors.height_cm && (
                  <p className="text-xs text-red-400">
                    {errors.height_cm.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="weight_kg"
                  className="block text-sm font-medium text-text flex items-center gap-2"
                >
                  <Scale className="w-4 h-4 text-text-secondary" />
                  {t("weight")} (kg) <span className="text-red-400">*</span>
                </label>
                <Input
                  id="weight_kg"
                  type="number"
                  min={20}
                  max={400}
                  step={0.1}
                  placeholder="70.5"
                  disabled={isPending}
                  {...register("weight_kg")}
                />
                {errors.weight_kg && (
                  <p className="text-xs text-red-400">
                    {errors.weight_kg.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-text flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-text-secondary" />
                  {t("country")} <span className="text-red-400">*</span>
                </label>
                <Select
                  id="country"
                  disabled={isPending}
                  {...register("country")}
                >
                  <option value="">
                    {locale === "en-US"
                      ? "Select a country"
                      : "Selecione um país"}
                  </option>
                  {countries.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                {errors.country && (
                  <p className="text-xs text-red-400">
                    {errors.country.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="language"
                  className="block text-sm font-medium text-text"
                >
                  {t("language")} <span className="text-red-400">*</span>
                </label>
                <Select
                  id="language"
                  disabled={isPending}
                  {...register("language")}
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en-US">English (US)</option>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={prevStep}
                variant="secondary"
                className="flex-1"
                disabled={isPending}
              >
                {locale === "en-US" ? "Back" : "Voltar"}
              </Button>
              <Button
                type="button"
                onClick={nextStep}
                className="flex-1"
                disabled={isPending}
              >
                {locale === "en-US" ? "Next" : "Próximo"}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <p className="text-sm text-primary font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {locale === "en-US" ? "Final Step" : "Passo Final"}
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="relative mt-0.5">
                  <input
                    id="accepts_terms"
                    type="checkbox"
                    className="sr-only peer"
                    disabled={isPending}
                    {...register("accepts_terms")}
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      acceptsTerms
                        ? "bg-primary border-primary"
                        : "border-border bg-surface peer-hover:border-primary/50"
                    } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {acceptsTerms && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </div>
                <label
                  htmlFor="accepts_terms"
                  className={`text-sm cursor-pointer select-none leading-relaxed ${
                    acceptsTerms ? "text-text" : "text-text-secondary"
                  }`}
                >
                  {locale === "en-US" ? "I accept the " : "Eu aceito os "}
                  <Link
                    href={`/${locale}/termos`}
                    className="font-medium text-primary hover:text-primary/80 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {navT("terms")}
                  </Link>
                  {locale === "en-US" ? " of service" : " de Uso"}
                  <span className="text-red-400"> *</span>
                </label>
              </div>
              {errors.accepts_terms && (
                <p className="text-xs text-red-400 -mt-3 pl-8">
                  {errors.accepts_terms.message}
                </p>
              )}

              <div className="flex items-start gap-3">
                <div className="relative mt-0.5">
                  <input
                    id="accepts_privacy"
                    type="checkbox"
                    className="sr-only peer"
                    disabled={isPending}
                    {...register("accepts_privacy")}
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      acceptsPrivacy
                        ? "bg-primary border-primary"
                        : "border-border bg-surface peer-hover:border-primary/50"
                    } ${isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {acceptsPrivacy && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </div>
                <label
                  htmlFor="accepts_privacy"
                  className={`text-sm cursor-pointer select-none leading-relaxed ${
                    acceptsPrivacy ? "text-text" : "text-text-secondary"
                  }`}
                >
                  {locale === "en-US"
                    ? "I have read and agree to the "
                    : "Li e concordo com a "}
                  <Link
                    href={`/${locale}/privacidade`}
                    className="font-medium text-primary hover:text-primary/80 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {navT("privacy")}
                  </Link>
                  {locale === "en-US" ? " Policy" : " de Privacidade"}
                  <span className="text-red-400"> *</span>
                </label>
              </div>
              {errors.accepts_privacy && (
                <p className="text-xs text-red-400 -mt-3 pl-8">
                  {errors.accepts_privacy.message}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={prevStep}
                variant="secondary"
                className="flex-1"
                disabled={isPending}
              >
                {locale === "en-US" ? "Back" : "Voltar"}
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending
                  ? locale === "en-US"
                    ? "Creating account..."
                    : "Criando conta..."
                  : t("signUp")}
              </Button>
            </div>
          </div>
        )}
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        {t("hasAccount")}{" "}
        <Link
          href={`/${locale}/login`}
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {t("signIn")}
        </Link>
      </p>

      <div className="mt-6 pt-6 border-t border-border text-center">
        <Link
          href={`/${locale}`}
          className="text-xs text-text-secondary hover:text-text transition-colors"
        >
          &larr; {locale === "en-US" ? "Back to " : "Voltar para "}
          {navT("home")}
        </Link>
      </div>
    </AuthShell>
  );
}
