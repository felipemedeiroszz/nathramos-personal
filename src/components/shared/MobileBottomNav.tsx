"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Grid2X2 } from "lucide-react";
import {
  studentNavigation,
  studentPrimaryPaths,
} from "@/components/student/navigation";
import { MaisDrawer } from "./MaisDrawer";
import { cn } from "@/lib/utils";
export function MobileBottomNav({ locale }: { locale: string }) {
  const pathname = usePathname(),
    en = locale === "en-US";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const items = studentPrimaryPaths.map((path) =>
    studentNavigation.flatMap((g) => g.items).find((i) => i.path === path)!,
  );
  const moreActive = !items.some(
    (i) =>
      pathname === `/${locale}/${i.path}` ||
      pathname.startsWith(`/${locale}/${i.path}/`),
  );
  return (
    <>
      <nav
        className="student-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#101215]/95 px-2 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
        aria-label={en ? "Main navigation" : "Navegação principal"}
      >
        <div className="mx-auto grid h-[68px] max-w-lg grid-cols-5 items-center gap-1">
          {items.map((item) => {
            const active =
              pathname === `/${locale}/${item.path}` ||
              pathname.startsWith(`/${locale}/${item.path}/`);
            const name =
              item.path === "dashboard"
                ? en
                  ? "Today"
                  : "Hoje"
                : item.path === "treino"
                  ? en
                    ? "Workout"
                    : "Treino"
                  : item.path === "dieta"
                    ? en
                      ? "Nutrition"
                      : "Dieta"
                    : en
                      ? "Progress"
                      : "Evolução";
            return (
              <Link
                key={item.path}
                href={`/${locale}/${item.path}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-medium transition",
                  active
                    ? "bg-yellow-400/[0.08] text-yellow-300"
                    : "text-zinc-500 hover:text-white",
                )}
              >
                <item.icon size={20} strokeWidth={active ? 2 : 1.7} />
                {name}
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label={en ? "More options" : "Mais opções"}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1.5 rounded-xl text-[10px] font-medium",
              open || moreActive
                ? "bg-yellow-400/[0.08] text-yellow-300"
                : "text-zinc-500",
            )}
          >
            <Grid2X2 size={20} strokeWidth={1.7} />
            {en ? "More" : "Mais"}
          </button>
        </div>
      </nav>
      <MaisDrawer
        locale={locale}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
