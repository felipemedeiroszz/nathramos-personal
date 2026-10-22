"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Activity, Dumbbell } from "lucide-react";

interface AdminTreinosTabsProps {
  defaultTab: "own" | "catalog";
  ownCatalogContent: ReactNode;
  catalogContent: ReactNode;
}

export function AdminTreinosTabs({
  defaultTab,
  ownCatalogContent,
  catalogContent,
}: AdminTreinosTabsProps) {
  const t = useTranslations("adminExerciseCatalog");

  return (
    <Tabs defaultValue={defaultTab} className="space-y-5">
      <TabsList className="h-11 gap-1">
        <TabsTrigger value="own" className="gap-2 px-4">
          <Dumbbell size={16} />
          {t("tabOwnCatalog")}
        </TabsTrigger>
        <TabsTrigger value="catalog" className="gap-2 px-4">
          <Activity size={16} />
          {t("tabCatalog")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="own">{ownCatalogContent}</TabsContent>
      <TabsContent value="catalog">{catalogContent}</TabsContent>
    </Tabs>
  );
}
