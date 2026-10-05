"use client";

import { AdminSidebar } from "@/components/shared/AdminSidebar";

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
  return (
    <div className="min-h-dvh bg-background">
      <div className="flex">
        <AdminSidebar locale={locale} onLogout={onLogout} />
        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 md:py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
