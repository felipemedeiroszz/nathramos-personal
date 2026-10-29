"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Globe2,
  LogOut,
  Menu,
  Search,
  UserRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { adminNavigation } from "@/components/admin/navigation";

interface AdminHeaderProps {
  locale: string;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  role: string;
  onLogout: () => Promise<void> | void;
  onLanguageChange?: (locale: string) => void;
  onMenuToggle?: () => void;
  onSearch?: () => void;
  sidebarOpen?: boolean;
}
export function AdminHeader({
  locale,
  firstName,
  lastName,
  photoUrl,
  role,
  onLogout,
  onLanguageChange,
  onMenuToggle,
  onSearch,
  sidebarOpen,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null),
    triggerRef = useRef<HTMLButtonElement>(null);
  const en = locale === "en-US";
  const current = adminNavigation
    .flatMap((group) => group.items)
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (item) =>
        pathname === `/${locale}/admin/${item.path}` ||
        pathname.startsWith(`/${locale}/admin/${item.path}/`),
    );
  const title = current
    ? en
      ? current.en
      : current.pt
    : en
      ? "Administration"
      : "Administração";
  const detail = current && pathname !== `/${locale}/admin/${current.path}`;
  useEffect(() => {
    setUserOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!userOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setUserOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [userOpen]);
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0c0d0f]/95 backdrop-blur-xl">
      <div className="flex h-[72px] items-center gap-3 px-4 lg:px-8">
        <button
          aria-label={en ? "Open navigation" : "Abrir navegação"}
          aria-expanded={sidebarOpen}
          aria-controls="admin-mobile-navigation"
          onClick={onMenuToggle}
          className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-white/5 md:hidden"
        >
          <Menu size={19} />
        </button>
        <nav
          aria-label={en ? "Breadcrumb" : "Caminho da página"}
          className="flex min-w-0 items-center gap-2 text-xs"
        >
          <Link
            href={`/${locale}/admin/dashboard`}
            className="hidden text-zinc-500 hover:text-zinc-300 sm:block"
          >
            {en ? "Workspace" : "Painel"}
          </Link>
          <ChevronRight
            size={12}
            className="hidden shrink-0 text-zinc-700 sm:block"
          />
          {detail ? (
            <>
              <Link
                href={`/${locale}/admin/${current.path}`}
                className="truncate text-zinc-400 hover:text-yellow-400"
              >
                {title}
              </Link>
              <ChevronRight size={12} className="shrink-0 text-zinc-700" />
              <span aria-current="page" className="truncate text-zinc-200">
                {en ? "Details" : "Detalhes"}
              </span>
            </>
          ) : (
            <span
              aria-current="page"
              className="truncate font-medium text-zinc-200"
            >
              {title}
            </span>
          )}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          <button
            onClick={onSearch}
            aria-label={
              en ? "Search pages (Ctrl+K)" : "Buscar páginas (Ctrl+K)"
            }
            className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-2.5 py-2 text-xs text-zinc-500 transition hover:border-white/20 hover:text-white"
          >
            <Search size={15} />
            <span className="hidden lg:inline">
              {en ? "Search pages" : "Buscar páginas"}
            </span>
            <kbd className="hidden rounded border border-white/10 px-1 text-[9px] lg:block">
              Ctrl K
            </kbd>
          </button>
          <label className="hidden items-center gap-1 text-zinc-500 sm:flex">
            <Globe2 size={14} />
            <select
              aria-label={en ? "Language" : "Idioma"}
              value={locale}
              onChange={(e) => onLanguageChange?.(e.target.value)}
              className="max-w-16 bg-transparent text-[10px] outline-none"
            >
              <option className="bg-zinc-900" value="pt-BR">
                PT-BR
              </option>
              <option className="bg-zinc-900" value="en-US">
                EN-US
              </option>
            </select>
          </label>
          <NotificationBell locale={locale} />
          <div
            ref={menuRef}
            className="relative border-l border-white/10 pl-2 sm:pl-3"
          >
            <button
              ref={triggerRef}
              aria-label={en ? "Account options" : "Opções da conta"}
              aria-expanded={userOpen}
              aria-controls="admin-account-menu"
              onClick={() => setUserOpen(!userOpen)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-white/5"
            >
              <Avatar
                src={photoUrl || undefined}
                alt={firstName || "Admin"}
                fallback={firstName?.[0] || "A"}
                size="sm"
              />
              <span className="hidden text-left xl:block">
                <span className="block text-xs font-medium text-zinc-200">
                  {[firstName, lastName].filter(Boolean).join(" ") || "Admin"}
                </span>
                <span className="mt-0.5 block text-[9px] text-zinc-500">
                  {role === "admin"
                    ? en
                      ? "Administrator"
                      : "Administrador"
                    : "Coach"}
                </span>
              </span>
              <ChevronDown
                size={12}
                className="hidden text-zinc-500 sm:block"
              />
            </button>
            {userOpen && (
              <div
                id="admin-account-menu"
                className="absolute right-0 top-full mt-3 w-60 rounded-xl border border-white/10 bg-[#141518] p-1.5 shadow-2xl"
              >
                <p className="px-3 py-2 text-[10px] text-zinc-500">
                  {en ? "Your account" : "Sua conta"}
                </p>
                <Link
                  href={`/${locale}/account`}
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/5"
                >
                  <UserRound size={14} />
                  {en ? "Manage account" : "Gerenciar conta"}
                </Link>
                <label className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-zinc-400">
                  <Globe2 size={14} />
                  <select
                    aria-label={en ? "Account language" : "Idioma da conta"}
                    value={locale}
                    onChange={(e) => {
                      onLanguageChange?.(e.target.value);
                      setUserOpen(false);
                    }}
                    className="min-w-0 flex-1 bg-[#141518] text-xs"
                  >
                    <option value="pt-BR">Português</option>
                    <option value="en-US">English</option>
                  </select>
                </label>
                <div className="my-1 border-t border-white/5" />
                <button
                  onClick={() => {
                    setUserOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs text-rose-400 hover:bg-rose-400/5"
                >
                  <LogOut size={14} />
                  {en ? "Sign out" : "Sair da plataforma"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
