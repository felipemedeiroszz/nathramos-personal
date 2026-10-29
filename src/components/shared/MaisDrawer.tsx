"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/Drawer";
import { studentNavigation } from "@/components/student/navigation";
import { cn } from "@/lib/utils";
export function MaisDrawer({
  locale,
  isOpen,
  onClose,
  onLogout,
}: {
  locale: string;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => Promise<void> | void;
}) {
  const pathname = usePathname(),
    en = locale === "en-US";
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      aria-label={en ? "More options" : "Mais opções"}
      className="w-[min(380px,100vw)] overflow-y-auto"
      position="right"
    >
      <DrawerHeader className="sticky top-0 z-10 bg-surface">
        <div>
          <p className="mb-1 text-[9px] uppercase tracking-[0.18em] text-zinc-500">
            {en ? "YOUR SPACE" : "SEU ESPAÇO"}
          </p>
          <DrawerTitle>{en ? "Your journey" : "Sua jornada"}</DrawerTitle>
        </div>
        <DrawerClose
          onClick={onClose}
          aria-label={en ? "Close options" : "Fechar opções"}
        />
      </DrawerHeader>
      <DrawerContent className="space-y-6 p-4">
        {studentNavigation.map((group) => (
          <section key={group.en}>
            <h2 className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {en ? group.en : group.pt}
            </h2>
            {group.items.map((item) => {
              const active = pathname === `/${locale}/${item.path}`;
              return (
                <Link
                  key={item.path}
                  href={`/${locale}/${item.path}`}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-zinc-300 hover:bg-white/5",
                  )}
                >
                  <item.icon
                    size={17}
                    className={active ? "text-primary" : "text-zinc-500"}
                  />
                  {en ? item.en : item.pt}
                  <ArrowUpRight size={12} className="ml-auto text-zinc-600" />
                </Link>
              );
            })}
          </section>
        ))}
        {onLogout && (
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="min-h-11 w-full rounded-xl border border-white/10 text-sm text-zinc-400"
          >
            {en ? "Sign out" : "Sair da conta"}
          </button>
        )}
      </DrawerContent>
    </Drawer>
  );
}
