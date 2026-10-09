"use client";

import { useState } from "react";
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

  const handleLanguageChange = (newLocale: string) => {
    const pathname = window.location.pathname;
    const segments = pathname.split("/").filter(Boolean);
    segments[0] = newLocale;
    const newPath = `/${segments.join("/")}`;
    router.push(newPath);
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="flex flex-col md:flex-row">
        {/* Sidebar - Desktop */}
        <div className="hidden md:block">
          <AdminSidebar locale={locale} onLogout={onLogout} />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
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
          />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 md:py-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
