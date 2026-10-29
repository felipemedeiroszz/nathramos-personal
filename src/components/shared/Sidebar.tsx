"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpRight, Loader2, LogOut } from "lucide-react";
import { studentNavigation } from "@/components/student/navigation";
import { logoutAction } from "@/app/actions/account";
import { cn } from "@/lib/utils";
export function Sidebar({ locale }: { locale: string }) {
  const pathname = usePathname(),
    en = locale === "en-US";
  const [pending, startTransition] = useTransition();
  return (
    <aside
      className="student-sidebar sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#0e1012] md:flex"
      aria-label={en ? "Student navigation" : "Navegação do aluno"}
    >
      <Link
        href={`/${locale}/dashboard`}
        className="flex h-24 shrink-0 items-center gap-3 px-6"
      >
        <div className="relative h-11 w-11">
          <Image
            src="/logo.png"
            alt="Nath Ramos"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-zinc-100">
            NATH RAMOS
          </p>
          <p className="mt-1 text-[9px] tracking-[0.18em] text-zinc-500">
            {en ? "YOUR PERSONAL JOURNEY" : "SUA JORNADA, SEU RITMO"}
          </p>
        </div>
      </Link>
      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {studentNavigation.map((group) => (
          <section key={group.en}>
            <h2 className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {en ? group.en : group.pt}
            </h2>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === `/${locale}/${item.path}` ||
                  pathname.startsWith(`/${locale}/${item.path}/`);
                return (
                  <li key={item.path}>
                    <Link
                      href={`/${locale}/${item.path}`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-xs font-medium transition-colors",
                        active
                          ? "bg-yellow-400/10 text-yellow-300"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
                      )}
                    >
                      <item.icon size={17} strokeWidth={1.7} />
                      {en ? item.en : item.pt}
                      {active && (
                        <span className="ml-auto h-1 w-1 rounded-full bg-yellow-400" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <Link
          href={`/${locale}/conversas`}
          className="mb-2 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-xs text-zinc-400"
        >
          {en ? "Need some guidance?" : "Precisa de orientação?"}
          <ArrowUpRight size={13} />
        </Link>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await logoutAction();
            })
          }
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}{" "}
          {en ? "Sign out" : "Sair da conta"}
        </button>
      </div>
    </aside>
  );
}
