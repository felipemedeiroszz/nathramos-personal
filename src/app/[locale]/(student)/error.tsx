"use client";
import Link from "next/link";
import { useLocale } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
export default function StudentError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const locale = useLocale(),
    en = locale === "en-US";
  return (
    <section
      role="alert"
      className="mx-auto max-w-xl rounded-[20px] border border-rose-400/15 bg-surface p-6 sm:p-8"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/5 text-rose-300">
        <AlertCircle size={24} />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        {en
          ? "We couldn't load your coaching plan"
          : "Não foi possível carregar seu acompanhamento"}
      </h2>
      <p className="mb-6 mt-3 text-sm leading-relaxed text-zinc-400">
        {en
          ? "Check your connection and try again. You can also check your account details."
          : "Confira sua conexão e tente novamente. Você também pode consultar os dados da sua conta."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>{en ? "Try again" : "Tentar novamente"}</Button>
        <Button variant="secondary" asChild>
          <Link href={`/${locale}/account`}>
            {en ? "My account" : "Minha conta"}
          </Link>
        </Button>
      </div>
    </section>
  );
}
