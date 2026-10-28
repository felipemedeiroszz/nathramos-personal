"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { AdminHeader } from "@/components/shared/AdminHeader";

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
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [sidebarOpen]);

  const handleLanguageChange = (newLocale: string) => {
    const pathname = window.location.pathname;
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = newLocale;
    const newPath = `/${segments.join("/")}`;
    router.push(`${newPath}${window.location.search}`);
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex flex-col md:flex-row">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Desktop (hidden on mobile) */}
        <div className="hidden md:block">
          <AdminSidebar role={role} locale={locale} onLogout={onLogout} />
        </div>

        {/* Sidebar - Mobile (drawer) */}
        {sidebarOpen && (
          <div className="fixed inset-y-0 left-0 z-50 w-64 md:hidden">
            <AdminSidebar
              role={role}
              locale={locale}
              onLogout={onLogout}
              isMobile
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader
            locale={locale}
            firstName={firstName}
            lastName={lastName}
            photoUrl={photoUrl}
            role={role}
            onLogout={onLogout}
            onLanguageChange={handleLanguageChange}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 md:py-8 lg:py-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
