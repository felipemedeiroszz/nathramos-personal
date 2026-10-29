"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { loginSchema } from "@/schemas/auth";
import { loginAction } from "@/app/actions/auth";
import { getSupportWhatsappAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthShell } from "@/components/public/AuthShell";
import { MessageCircle, X, Eye, EyeOff } from "lucide-react";

import { useDialogFocus } from "@/components/ui/useDialogFocus";

type LoginFormValues = z.input<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations("auth");
  const navT = useTranslations("nav");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(forgotOpen, () => setForgotOpen(false), dialog);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  useEffect(() => {
    let active = true;
    getSupportWhatsappAction()
      .then((result) => {
        if (active) setSupportWhatsapp(result.whatsapp);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const whatsappDigits = supportWhatsapp.replace(/\D/g, "");
  const whatsappHref = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(t("forgotPasswordRequest"))}`
    : null;

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

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    if (isPending) return;
    setServerError(null);
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);
      formData.append("locale", locale);
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
      } else if (result?.redirectTo) {
        router.push(result.redirectTo);
      } else {
        router.push(`/${locale}/treinos`);
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
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
    >
      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
        >
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
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {t("forgotPassword")}
            </button>
          </div>
          <div className="relative">
            <Input
              className="pr-12"
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isPending}
              {...register("password")}
            />
            <button
              type="button"
              aria-label={
                locale === "en-US"
                  ? showPassword
                    ? "Hide password"
                    : "Show password"
                  : showPassword
                    ? "Ocultar senha"
                    : "Mostrar senha"
              }
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-zinc-500 hover:text-yellow-300"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
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
          {isPending
            ? locale === "en-US"
              ? "Signing in..."
              : "Entrando..."
            : t("signIn")}
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
          &larr; {locale === "en-US" ? "Back to " : "Voltar para "}
          {navT("home")}
        </Link>
      </div>
      {forgotOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setForgotOpen(false)}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={t("forgotPasswordTitle")}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-slide-up"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MessageCircle size={20} />
                </span>
                <h2 className="text-lg font-bold text-text">
                  {t("forgotPasswordTitle")}
                </h2>
              </div>
              <button
                type="button"
                aria-label={t("close")}
                onClick={() => setForgotOpen(false)}
                className="text-text-secondary hover:text-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-text-secondary mb-6">
              {t("forgotPasswordMessage")}
            </p>

            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <MessageCircle size={18} />
                {t("forgotPasswordCta")}
              </a>
            ) : (
              <p className="text-sm text-amber-400">
                {t("forgotPasswordUnavailable")}
              </p>
            )}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
