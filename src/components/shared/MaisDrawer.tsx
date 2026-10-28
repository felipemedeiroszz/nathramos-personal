"use client";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/Drawer";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Pill,
  Droplets,
  FileText,
  BookOpen,
  ShoppingCart,
  MessageSquare,
  Calendar,
  Bell,
  User,
  CreditCard,
  LogOut,
} from "lucide-react";

interface MaisDrawerProps {
  locale: string;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => Promise<void> | void;
}

type MenuItemKey =
  | "supplements"
  | "hydration"
  | "exams"
  | "ebooks"
  | "shoppingList"
  | "mentoring"
  | "meetings"
  | "notifications"
  | "account"
  | "membership";

const labelKey: Record<MenuItemKey, string> = {
  account: "account",
  membership: "membership",
  supplements: "supplements",
  hydration: "hydration",
  exams: "exams",
  ebooks: "ebooks",
  shoppingList: "shoppingList",
  mentoring: "mentoring",
  meetings: "meetings",
  notifications: "notifications",
};

const routeForKey: Record<MenuItemKey, string> = {
  account: "/account",
  membership: "/assinatura",
  supplements: "/suplementos",
  hydration: "/hidratacao",
  exams: "/exames",
  ebooks: "/ebooks",
  shoppingList: "/lista-compras",
  mentoring: "/conversas",
  meetings: "/reunioes",
  notifications: "/notificacoes",
};

export function MaisDrawer({ locale, isOpen, onClose, onLogout }: MaisDrawerProps) {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");

  const sections: {
    titleKey: string;
    items: { key: MenuItemKey; icon: React.ReactNode }[];
  }[] = [
    {
      titleKey: "sectionAccount",
      items: [
        { key: "account", icon: <User size={20} /> },
        { key: "membership", icon: <CreditCard size={20} /> },
      ],
    },
    {
      titleKey: "sectionHealth",
      items: [
        { key: "supplements", icon: <Pill size={20} /> },
        { key: "hydration", icon: <Droplets size={20} /> },
        { key: "exams", icon: <FileText size={20} /> },
      ],
    },
    {
      titleKey: "sectionContent",
      items: [
        { key: "ebooks", icon: <BookOpen size={20} /> },
        { key: "shoppingList", icon: <ShoppingCart size={20} /> },
      ],
    },
    {
      titleKey: "sectionCommunication",
      items: [
        { key: "mentoring", icon: <MessageSquare size={20} /> },
        { key: "meetings", icon: <Calendar size={20} /> },
        { key: "notifications", icon: <Bell size={20} /> },
      ],
    },
  ];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} position="right">
      <DrawerHeader>
        <DrawerTitle>{t("moreOptions")}</DrawerTitle>
        <DrawerClose onClick={onClose} />
      </DrawerHeader>
      <DrawerContent>
        <nav className="space-y-6">
          {sections.map((section) => (
            <div key={section.titleKey} className="space-y-1">
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {t(section.titleKey)}
              </p>
              {section.items.map((item) => {
                const href = `/${locale}${routeForKey[item.key]}`;
                const basePath = `/${locale}${routeForKey[item.key].split("?")[0]}`;
                const isAccountArea = basePath.endsWith("/account");
                const isActive = isAccountArea
                  ? pathname === basePath &&
                    (item.key === "membership"
                      ? activeTab === "subscription"
                      : activeTab !== "subscription")
                  : pathname === basePath || pathname === basePath + "/";
                return (
                  <Link
                    key={item.key}
                    href={href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-secondary hover:bg-surface-secondary hover:text-text"
                    )}
                  >
                    <span className={cn(isActive ? "text-primary" : "text-text-secondary")}>
                      {item.icon}
                    </span>
                    <span className="font-medium">{t(labelKey[item.key])}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {onLogout && (
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text"
              >
                <LogOut size={20} />
                <span className="font-medium">{t("logout")}</span>
              </button>
            </div>
          )}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
