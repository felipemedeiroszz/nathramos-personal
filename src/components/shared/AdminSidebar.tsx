"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Search, UserRound, X } from "lucide-react";
import { navigationForRole } from "@/components/admin/navigation";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  locale: string;
  role?: string;
  onLogout?: () => Promise<void> | void;
  isMobile?: boolean;
  onClose?: () => void;
  onSearch?: () => void;
}
export function AdminSidebar({
  locale,
  role = "admin",
  onLogout,
  isMobile,
  onClose,
  onSearch,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const en = locale === "en-US";
  const active = (path: string) =>
    pathname === `/${locale}/admin/${path}` ||
    pathname.startsWith(`/${locale}/admin/${path}/`);
  return (
    <aside
      className={cn(
        "flex h-dvh w-64 shrink-0 flex-col border-r border-white/[0.07] bg-[#0c0d0f]",
        isMobile ? "relative" : "sticky top-0",
      )}
      aria-label={en ? "Admin navigation" : "Navegação administrativa"}
    >
      <div className="flex h-20 shrink-0 items-center justify-between px-5">
        <Link
          href={`/${locale}/admin/dashboard`}
          onClick={onClose}
          className="flex items-center gap-3"
        >
          <div className="relative h-10 w-10">
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
            <p className="mt-1 text-[9px] uppercase tracking-[0.17em] text-zinc-500">
              Management studio
            </p>
          </div>
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label={en ? "Close navigation" : "Fechar navegação"}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5"
          >
            <X size={17} />
          </button>
        )}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={onSearch}
          className="flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-xs text-zinc-500 transition hover:border-white/20 hover:text-zinc-200"
        >
          <Search size={14} />
          {en ? "Find a page…" : "Buscar página…"}
          <kbd className="ml-auto rounded border border-white/10 px-1 py-0.5 text-[9px]">
            Ctrl K
          </kbd>
        </button>
      </div>
      <nav
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-5"
        aria-label={en ? "Modules" : "Módulos"}
      >
        {navigationForRole(role).map((group) => {
          const closed = collapsed.includes(group.key);
          return (
            <section key={group.key}>
              <button
                onClick={() =>
                  setCollapsed((prev) =>
                    closed
                      ? prev.filter((key) => key !== group.key)
                      : [...prev, group.key],
                  )
                }
                aria-expanded={!closed}
                aria-controls={`${isMobile ? "mobile" : "desktop"}-admin-nav-${group.key}`}
                className="mb-2 flex w-full items-center justify-between px-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-300"
              >
                {en ? group.en : group.pt}
                <ChevronDown
                  size={11}
                  className={cn("transition-transform", closed && "-rotate-90")}
                />
              </button>
              <ul
                id={`${isMobile ? "mobile" : "desktop"}-admin-nav-${group.key}`}
                hidden={closed}
                className="space-y-0.5"
              >
                {group.items.map((item) => (
                  <li key={item.key}>
                    <Link
                      href={`/${locale}/admin/${item.path}`}
                      onClick={onClose}
                      aria-current={active(item.path) ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors",
                        active(item.path)
                          ? "bg-yellow-400/[0.09] text-yellow-400"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100",
                      )}
                    >
                      <item.icon
                        size={16}
                        strokeWidth={1.7}
                        className={
                          active(item.path)
                            ? "text-yellow-400"
                            : "text-zinc-500 group-hover:text-zinc-300"
                        }
                      />
                      <span>{en ? item.en : item.pt}</span>
                      {active(item.path) && (
                        <span className="ml-auto h-1 w-1 rounded-full bg-yellow-400" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-1 border-t border-white/[0.07] p-3">
        <Link
          href={`/${locale}/account`}
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <UserRound size={16} />
          {en ? "My account" : "Minha conta"}
        </Link>
        <button
          onClick={() => {
            onLogout?.();
            onClose?.();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-zinc-500 transition hover:bg-rose-400/5 hover:text-rose-400"
        >
          <LogOut size={16} />
          {en ? "Sign out" : "Sair da plataforma"}
        </button>
      </div>
    </aside>
  );
}
