"use client";

import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/Drawer";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Pill,
  Droplet,
  FileText,
  BookOpen,
  ShoppingCart,
  MessageSquare,
  Calendar,
  Bell,
  User,
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
  | "account";

const routeForKey: Record<MenuItemKey, string> = {
  supplements: "/suplementos",
  hydration: "/hidratacao",
  exams: "/exames",
  ebooks: "/ebooks",
  shoppingList: "/lista-compras",
  mentoring: "/conversas",
  meetings: "/reunioes",
  notifications: "/notificacoes",
  account: "/account",
};

export function MaisDrawer({ locale, isOpen, onClose, onLogout }: MaisDrawerProps) {
  const t = useTranslations("navigation");

  const menuItems: {
    key: MenuItemKey;
    icon: React.ReactNode;
  }[] = [
    { key: "supplements", icon: <Pill size={20} /> },
    { key: "hydration", icon: <Droplet size={20} /> },
    { key: "exams", icon: <FileText size={20} /> },
    { key: "ebooks", icon: <BookOpen size={20} /> },
    { key: "shoppingList", icon: <ShoppingCart size={20} /> },
    { key: "mentoring", icon: <MessageSquare size={20} /> },
    { key: "meetings", icon: <Calendar size={20} /> },
    { key: "notifications", icon: <Bell size={20} /> },
    { key: "account", icon: <User size={20} /> },
  ];

  const labelForKey = (key: MenuItemKey) => {
    switch (key) {
      case "supplements": return t("supplements");
      case "hydration": return t("hydration");
      case "exams": return t("exams");
      case "ebooks": return t("ebooks");
      case "shoppingList": return t("shoppingList");
      case "mentoring": return t("mentoring");
      case "meetings": return t("meetings");
      case "notifications": return t("notifications");
      case "account": return t("account");
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} position="right">
      <DrawerHeader>
        <DrawerTitle>{t("moreOptions")}</DrawerTitle>
        <DrawerClose onClick={onClose} />
      </DrawerHeader>
      <DrawerContent>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.key}
              href={`/${locale}${routeForKey[item.key]}`}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:text-text hover:bg-surface-secondary transition-colors"
            >
              {item.icon}
              <span className="font-medium">{labelForKey(item.key)}</span>
            </Link>
          ))}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-surface-secondary transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">{t("logout")}</span>
            </button>
          )}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
