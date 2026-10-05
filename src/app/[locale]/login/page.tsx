"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { loginSchema } from "@/schemas/auth";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import Image from "next/image";

type LoginFormValues = z.input<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const navT = useTranslations("nav");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = (values) => {
    setServerError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);
      if (values.remember) formData.append("remember", "true");

      const result = await loginAction(formData);
      if (result && !result.success) {
        if (result.errors.email) {
          setError("email", { message: result.errors.email[0] });
        }
        if (result.errors.password) {
          setError("password", { message: result.errors.password[0] });
        }
        if (result.message) {
          setServerError(result.message);
        }
      } else {
        router.push(`/${locale}/dashboard`);
      }
    });
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 md:p-12 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat hidden md:block"
        style={{ backgroundImage: "url('/login-desktop-fundo.png')", backgroundSize: 'cover' }}
      />
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat block md:hidden"
        style={{ backgroundImage: "url('/login-mobile-fundo.png')", backgroundSize: 'cover' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-black/40"
      />

      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center w-full max-w-7xl gap-8 md:gap-16 relative z-20">
        <div className="hidden md:flex flex-col items-start text-left max-w-lg animate-slide-up ml-8">
          <div className="mb-8 h-40 w-40 relative drop-shadow-2xl">
            <Image
              src="/logo.png"
              alt="Nath Ramos Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-2 drop-shadow-lg">
            {t("heroTitle")}{" "}
            <span className="text-primary drop-shadow-lg">{t("heroTitleHighlight")}</span>
          </h1>
          <p className="text-base text-white/90 mb-10 font-medium drop-shadow-md">
            {t("heroSubtitle")}
          </p>
          <div className="space-y-4 text-left w-full bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="text-primary text-2xl">💪</div>
              <p className="text-white text-lg font-semibold">{t("feature1")}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-primary text-2xl">🥗</div>
              <p className="text-white text-lg font-semibold">{t("feature2")}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-primary text-2xl">📊</div>
              <p className="text-white text-lg font-semibold">{t("feature3")}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-primary text-2xl">💧</div>
              <p className="text-white text-lg font-semibold">{t("feature4")}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-primary text-2xl">🎯</div>
              <p className="text-white text-lg font-semibold">{t("feature5")}</p>
            </div>
          </div>
        </div>

        <div className="relative w-full max-w-md animate-slide-up z-10">
          <div className="rounded-2xl border border-border/40 backdrop-blur-xl p-8 shadow-2xl bg-surface/30">
            <div className="flex flex-col items-center text-center mb-8 md:hidden">
              <div className="mb-4 h-16 w-16 relative">
                <Image
                  src="/logo.png"
                  alt="Nath Ramos Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-text">
                {t("loginTitle")}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {t("loginSubtitle")}
              </p>
            </div>
            <div className="hidden md:flex flex-col items-center text-center mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-text">
                {t("loginTitle")}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {t("loginSubtitle")}
              </p>
            </div>

            {serverError && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text"
              >
                {t("email")}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                disabled={isPending}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text"
                >
                  {t("password")}
                </label>
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={isPending}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary"
                disabled={isPending}
                {...register("remember")}
              />
              <label
                htmlFor="remember"
                className="text-sm text-text-secondary cursor-pointer select-none"
              >
                {t("rememberMe")}
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Entrando..." : t("signIn")}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary">
            {t("noAccount")}{" "}
            <Link
              href={`/${locale}/cadastro`}
              className="font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {t("createAccount")}
            </Link>
          </p>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <Link
              href={`/${locale}`}
              className="text-xs text-text-secondary hover:text-text transition-colors"
            >
              &larr; Voltar para {navT("home")}
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
