"use client";
import { useEffect } from "react";
export function SupportPreviewBanner({
  locale,
  name,
  expires,
}: {
  locale: string;
  name: string;
  expires: number;
}) {
  useEffect(() => {
    const timer = setTimeout(
      () => {
        window.location.href = "/api/admin/student-preview/exit";
      },
      Math.max(0, expires - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expires]);
  return (
    <aside
      className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-yellow-400/40 bg-zinc-950 p-4 text-sm text-white"
      role="status"
    >
      <span>
        {locale === "en-US"
          ? "Support view • Read only • Up to 15 minutes"
          : "Visualizando como aluno • Somente leitura • Até 15 minutos"}{" "}
        — {name}
      </span>
      {/* Full navigation clears support cookies before rendering administrator content. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        className="font-semibold text-yellow-400"
        href="/api/admin/student-preview/exit"
      >
        {locale === "en-US" ? "Return to admin" : "Voltar ao administrador"}
      </a>
    </aside>
  );
}
