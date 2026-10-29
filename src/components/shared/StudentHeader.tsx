"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Globe2 } from "lucide-react";
import { studentNavigation } from "@/components/student/navigation";
import { NotificationBell } from "./NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
export function StudentHeader({
  locale,
  firstName,
  photoUrl,
}: {
  locale: string;
  firstName?: string | null;
  photoUrl?: string | null;
}) {
  const pathname = usePathname(),
    router = useRouter(),
    en = locale === "en-US";
  const item = studentNavigation
    .flatMap((g) => g.items)
    .find(
      (i) =>
        pathname === `/${locale}/${i.path}` ||
        pathname.startsWith(`/${locale}/${i.path}/`),
    );
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-white/[0.06] bg-[#0d0f11]/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={`/${locale}/dashboard`}
          aria-label={en ? "Go to my day" : "Ir para meu dia"}
          className="relative h-9 w-9 shrink-0 md:hidden"
        >
          <Image
            src="/logo.png"
            alt="Nath Ramos"
            fill
            className="object-contain"
            priority
          />
        </Link>
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="hidden text-zinc-500 sm:inline">
            {en ? "Your space" : "Seu espaço"}
          </span>
          <ChevronRight size={12} className="hidden text-zinc-700 sm:block" />
          <span className="truncate font-medium text-zinc-200">
            {item
              ? en
                ? item.en
                : item.pt
              : en
                ? "Your journey"
                : "Sua jornada"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <label className="hidden items-center gap-1.5 text-zinc-500 sm:flex">
          <Globe2 size={14} />
          <select
            value={locale}
            aria-label={en ? "Language" : "Idioma"}
            onChange={(e) => {
              const parts = pathname.split("/").filter(Boolean);
              parts[0] = e.target.value;
              router.push("/" + parts.join("/") + window.location.search);
            }}
            className="max-w-16 bg-transparent text-[10px] outline-none"
          >
            <option value="pt-BR" className="bg-surface">
              PT-BR
            </option>
            <option value="en-US" className="bg-surface">
              EN-US
            </option>
          </select>
        </label>
        <NotificationBell
          locale={locale}
          namespace="studentNotifications"
          viewAllHref={`/${locale}/notificacoes`}
        />
        <Link
          href={`/${locale}/account`}
          aria-label={en ? "Open my profile" : "Abrir meu perfil"}
          className="flex items-center gap-2 border-l border-white/10 pl-3"
        >
          <Avatar
            src={photoUrl || undefined}
            alt={firstName || (en ? "Profile" : "Perfil")}
            fallback={firstName?.[0] || "N"}
            size="sm"
          />
          <span className="hidden text-xs font-medium text-zinc-300 lg:block">
            {firstName || (en ? "My profile" : "Meu perfil")}
          </span>
        </Link>
      </div>
    </header>
  );
}
