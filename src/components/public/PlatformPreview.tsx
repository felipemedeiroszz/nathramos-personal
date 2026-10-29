"use client";
import {
  Check,
  Dumbbell,
  Droplets,
  LayoutDashboard,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
export function PlatformPreview({ locale }: { locale: string }) {
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  return (
    <div>
      <Tabs defaultValue="training">
        <TabsList
          aria-label={t("Conheça a plataforma", "Explore the platform")}
          className="mb-5 flex h-auto w-fit max-w-full gap-1 rounded-xl border border-white/[0.08] bg-[#111416] p-1"
        >
          <TabsTrigger value="training">
            <Dumbbell size={14} className="mr-2" />
            {t("Treino", "Workout")}
          </TabsTrigger>
          <TabsTrigger value="routine">
            <Utensils size={14} className="mr-2" />
            {t("Rotina", "Routine")}
          </TabsTrigger>
          <TabsTrigger value="progress">
            <TrendingUp size={14} className="mr-2" />
            {t("Evolução", "Progress")}
          </TabsTrigger>
        </TabsList>
        <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#0d1012] shadow-[0_30px_100px_#00000040]">
          <div className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4">
            <div className="flex gap-1.5" aria-hidden="true">
              <i className="h-1.5 w-1.5 rounded-full bg-white/15" />
              <i className="h-1.5 w-1.5 rounded-full bg-white/10" />
              <i className="h-1.5 w-1.5 rounded-full bg-white/5" />
            </div>
            <span className="text-[8px] font-semibold tracking-[0.2em] text-zinc-600">
              NATH RAMOS · {t("SEU ESPAÇO", "YOUR SPACE")}
            </span>
            <span className="h-5 w-5 rounded-full border border-white/10 bg-white/5" />
          </div>
          <div className="flex min-h-[340px]">
            <div className="hidden w-28 shrink-0 space-y-3 border-r border-white/[0.06] p-3 sm:block">
              <p className="mb-6 text-[8px] font-medium tracking-widest text-zinc-500">
                {t("SUA JORNADA", "YOUR JOURNEY")}
              </p>
              {[
                { icon: LayoutDashboard, label: t("Meu dia", "My day") },
                { icon: Dumbbell, label: t("Treinos", "Workouts") },
                { icon: Utensils, label: t("Rotina", "Routine") },
                { icon: TrendingUp, label: t("Evolução", "Progress") },
              ].map(({ icon: Icon, label }, i) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-md px-2 py-2 text-[8px] ${i === 0 ? "bg-yellow-400/10 text-yellow-300" : "text-zinc-600"}`}
                >
                  <Icon size={11} />
                  {label}
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1 p-5 sm:p-6">
              <p className="mb-1 text-[8px] uppercase tracking-[0.2em] text-zinc-600">
                {t("UM DIA DE CADA VEZ", "ONE DAY AT A TIME")}
              </p>
              <h3 className="mb-5 text-xl font-semibold tracking-tight">
                {t("Sua rotina começa aqui.", "Your routine starts here.")}
              </h3>
              <TabsContent value="training" className="m-0">
                <div className="rounded-xl border border-yellow-400/15 bg-gradient-to-br from-yellow-400/[0.07] to-transparent p-4">
                  <span className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-widest text-yellow-300">
                    <Dumbbell size={12} />
                    {t("SEU TREINO DE HOJE", "YOUR WORKOUT TODAY")}
                  </span>
                  <h4 className="mt-3 text-sm font-medium">
                    {t("Um programa para você", "A program for you")}
                  </h4>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {t(
                      "Exercícios, orientações e registro de séries.",
                      "Exercises, guidance and set logging.",
                    )}
                  </p>
                  <div className="mt-4 space-y-2">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 text-[9px]"
                      >
                        <span className="flex items-center gap-2 text-zinc-400">
                          <span className="text-zinc-600">0{n}</span>
                          {t("Exercício orientado", "Guided exercise")}
                        </span>
                        {n === 1 ? (
                          <Check size={12} className="text-emerald-300" />
                        ) : (
                          <span className="h-1 w-9 rounded-full bg-white/5" />
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="mt-4 flex min-h-9 items-center justify-center rounded-lg bg-yellow-400 text-[9px] font-semibold text-zinc-950">
                    {t("Abrir meu treino", "Open my workout")}
                  </span>
                </div>
              </TabsContent>
              <TabsContent value="routine" className="m-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.07] p-4">
                    <Utensils size={16} className="text-yellow-300" />
                    <h4 className="mt-3 text-xs">
                      {t("Alimentação", "Nutrition")}
                    </h4>
                    <p className="mt-2 text-[9px] leading-relaxed text-zinc-500">
                      {t(
                        "Suas refeições e orientações para o dia.",
                        "Your meals and guidance for the day.",
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-400/10 bg-blue-400/[0.025] p-4">
                    <Droplets size={16} className="text-blue-300" />
                    <h4 className="mt-3 text-xs">
                      {t("Hidratação", "Hydration")}
                    </h4>
                    <p className="mt-2 text-[9px] leading-relaxed text-zinc-500">
                      {t(
                        "Meta e registros organizados.",
                        "Your goal and logs, organized.",
                      )}
                    </p>
                  </div>
                </div>
                {[
                  t("Refeição da manhã", "Morning meal"),
                  t("Refeição da tarde", "Afternoon meal"),
                ].map((label, i) => (
                  <div
                    key={label}
                    className="mt-3 flex min-h-14 items-center justify-between rounded-xl border border-white/[0.07] px-4 text-[10px] text-zinc-400"
                  >
                    {label}
                    <span
                      className={`rounded-md px-2 py-1 text-[8px] ${i === 0 ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-zinc-500"}`}
                    >
                      {i === 0
                        ? t("Registrada", "Logged")
                        : t("Pendente", "Pending")}
                    </span>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="progress" className="m-0">
                <div className="rounded-xl border border-white/[0.07] p-4">
                  <h4 className="text-xs font-medium">
                    {t("Sua evolução, visível", "Your progress, visible")}
                  </h4>
                  <p className="mt-2 text-[9px] text-zinc-500">
                    {t(
                      "Histórico de treinos e registros da sua rotina.",
                      "Workout history and daily routine logs.",
                    )}
                  </p>
                  <div
                    role="img"
                    aria-label={t(
                      "Ilustração de um gráfico de acompanhamento",
                      "Illustration of a progress chart",
                    )}
                    className="mt-5 flex h-36 items-end gap-2 border-b border-white/10 px-1"
                  >
                    {[30, 46, 39, 64, 55, 76, 67, 84, 73, 94].map(
                      (height, i) => (
                        <div
                          key={i}
                          style={{ height: `${height}%` }}
                          className="flex-1 rounded-t-md bg-yellow-400/70"
                        />
                      ),
                    )}
                  </div>
                  <div className="mt-3 flex justify-between text-[8px] text-zinc-600">
                    <span>{t("Seus registros", "Your logs")}</span>
                    <span>{t("Seu histórico", "Your history")}</span>
                  </div>
                </div>
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
      <p className="mt-3 text-[9px] leading-relaxed text-zinc-600">
        {t(
          "Interface ilustrativa. Não contém dados reais de alunos.",
          "Illustrative interface. No real student data is shown.",
        )}
      </p>
    </div>
  );
}
