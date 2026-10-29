"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { AdminHeader } from "@/components/shared/AdminHeader";
import { AdminCommandMenu } from "@/components/admin/AdminCommandMenu";
import { useDialogFocus } from "@/components/ui/useDialogFocus";

interface AdminLayoutClientProps {
  locale: string;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  role: string;
  onLogout: () => Promise<void> | void;
  children: React.ReactNode;
}
export function AdminLayoutClient({
  locale,
  firstName,
  lastName,
  photoUrl,
  role,
  onLogout,
  children,
}: AdminLayoutClientProps) {
  const router = useRouter(),
    pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false),
    [searchOpen, setSearchOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogFocus(sidebarOpen, () => setSidebarOpen(false), drawerRef);
  useEffect(() => {
    setSidebarOpen(false);
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSidebarOpen(false);
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const openSearch = () => {
    setSidebarOpen(false);
    setSearchOpen(true);
  };
  const handleLanguageChange = (newLocale: string) => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    segments[0] = newLocale;
    router.push(`/${segments.join("/")}${window.location.search}`);
  };
  return (
    <div className="admin-shell min-h-dvh bg-background text-text">
      <a
        href="#admin-main"
        className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary p-3 text-sm text-primary-foreground focus:not-sr-only"
      >
        {locale === "en-US" ? "Skip to content" : "Ir para o conteúdo"}
      </a>
      <div className="flex items-start">
        <div className="sticky top-0 hidden h-dvh shrink-0 md:block">
          <AdminSidebar
            role={role}
            locale={locale}
            onLogout={onLogout}
            onSearch={openSearch}
          />
        </div>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div
              id="admin-mobile-navigation"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label={locale === "en-US" ? "Navigation" : "Navegação"}
              tabIndex={-1}
              className="relative h-dvh w-64"
            >
              <AdminSidebar
                role={role}
                locale={locale}
                onLogout={onLogout}
                onSearch={openSearch}
                isMobile
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader
            locale={locale}
            firstName={firstName}
            lastName={lastName}
            photoUrl={photoUrl}
            role={role}
            onLogout={onLogout}
            onLanguageChange={handleLanguageChange}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
            onSearch={openSearch}
          />
          <main
            id="admin-main"
            tabIndex={-1}
            className="admin-content min-w-0 flex-1 outline-none"
          >
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 md:py-8 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      <AdminCommandMenu
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        locale={locale}
        role={role}
      />
    </div>
  );
}
