"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Droplets,
  Plus,
  Minus,
  RotateCcw,
  Target,
  Bell,
  History,
  Flame,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const GLASS_ML = 250;
const DAILY_GLASSES = 8;
const DAILY_ML = DAILY_GLASSES * GLASS_ML;

const timelineHistory = [
  { time: "07:15", ml: 250, label: "Copo 1" },
  { time: "09:30", ml: 250, label: "Copo 2" },
  { time: "11:00", ml: 250, label: "Copo 3" },
  { time: "13:45", ml: 250, label: "Copo 4, após almoço" },
  { time: "15:20", ml: 250, label: "Copo 5" },
  { time: "17:10", ml: 250, label: "Copo 6" },
];

const tips = [
  "Beber 1 copo ao acordar ativa metabolismo",
  "Antes das refeições (15 min) ajuda saciedade",
  "Durante treino, 150ml a cada 15 min",
  "Beba água mesmo sem sede",
];

const weeklyData = [
  { day: "Seg", ml: 1800, max: 2000 },
  { day: "Ter", ml: 2000, max: 2000, meta: true },
  { day: "Qua", ml: 1500, max: 2000 },
  { day: "Qui", ml: 2200, max: 2000, excedente: true },
  { day: "Sex", ml: 1750, max: 2000 },
  { day: "Sáb", ml: 1600, max: 2000 },
  { day: "Dom", ml: 1500, max: 2000, hoje: true },
];

export default function HydrationPage() {
  const t = useTranslations();
  const [currentGlass, setCurrentGlass] = useState(6);
  const [customMl, setCustomMl] = useState("");
  const [remindersOn, setRemindersOn] = useState(true);
  const [frequency, setFrequency] = useState("60");
  const [silentMode, setSilentMode] = useState(true);

  const currentMl = currentGlass * GLASS_ML;
  const percentage = Math.min((currentMl / DAILY_ML) * 100, 100);

  const addGlass = () => {
    if (currentGlass < DAILY_GLASSES + 4) {
      setCurrentGlass((g) => g + 1);
    }
  };

  const removeGlass = () => {
    if (currentGlass > 0) {
      setCurrentGlass((g) => g - 1);
    }
  };

  const resetDay = () => {
    setCurrentGlass(0);
  };

  const toggleGlass = (index: number) => {
    if (index + 1 <= currentGlass) {
      setCurrentGlass(index);
    } else {
      setCurrentGlass(index + 1);
    }
  };

  const addCustomMl = () => {
    const ml = parseInt(customMl);
    if (!isNaN(ml) && ml > 0) {
      const glasses = Math.ceil(ml / GLASS_ML);
      setCurrentGlass((g) => Math.min(g + glasses, DAILY_GLASSES + 8));
      setCustomMl("");
    }
  };

  return (
    <div className="space-y-6 w-full pb-24 md:pb-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-text">Hidratação</h1>
        <p className="text-sm md:text-base text-text-secondary">
          Beba água regularmente para saúde e desempenho
        </p>
      </header>

      <Card className="bg-gradient-to-br from-primary/5 via-surface to-surface border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="text-primary" size={22} />
                Progresso de hoje
              </CardTitle>
              <CardDescription>
                Cada copo corresponde a {GLASS_ML}ml
              </CardDescription>
            </div>
            <Badge variant="default" className="gap-1">
              <Target size={12} />
              Meta diária
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 rounded-full border-[12px] border-primary/20" />
              <svg
                className="absolute inset-0 -rotate-90 w-48 h-48"
                viewBox="0 0 192 192"
              >
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 84}
                  strokeDashoffset={
                    2 * Math.PI * 84 * (1 - percentage / 100)
                  }
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-text">
                  {currentMl}
                </span>
                <span className="text-sm text-text-secondary">
                  / {DAILY_ML} ml
                </span>
                <span className="text-lg font-semibold text-primary mt-1">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md">
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: DAILY_GLASSES }).map((_, i) => {
                  const filled = i < currentGlass;
                  return (
                    <button
                      key={i}
                      onClick={() => toggleGlass(i)}
                      className={cn(
                        "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 border-2",
                        filled
                          ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 shadow-lg shadow-primary/20"
                          : "bg-surface border-border text-text-secondary hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                      )}
                    >
                      <Droplets size={24} />
                      <span className="text-xs font-semibold">{i + 1}</span>
                    </button>
                  );
                })}
              </div>
              <Progress
                value={currentMl}
                max={DAILY_ML}
                className="h-3 mt-5"
              />
              <div className="flex justify-between mt-2 text-xs text-text-secondary">
                <span>0 ml</span>
                <span>
                  {currentGlass} / {DAILY_GLASSES} copos
                </span>
                <span>{DAILY_ML} ml</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ações rápidas</CardTitle>
              <CardDescription>
                Registre sua ingestão de água
              </CardDescription>
            </div>
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Plus size={22} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button size="lg" onClick={addGlass} className="gap-2">
              <Plus size={20} />
              Adicionar copo
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={removeGlass}
              className="gap-2"
            >
              <Minus size={20} />
              Remover último
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={resetDay}
              className="gap-2 text-text-secondary hover:text-red-600 hover:bg-red-600/10"
            >
              <RotateCcw size={20} />
              Redefinir dia
            </Button>
          </div>

          <div className="flex gap-3 pt-2">
            <Input
              type="number"
              placeholder="Quantidade customizada (ml)"
              value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              min={1}
            />
            <Button onClick={addCustomMl} className="shrink-0 gap-2">
              <Plus size={18} />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History size={22} className="text-primary" />
                  Histórico de hoje
                </CardTitle>
                <CardDescription>
                  Registros do consumo diário
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-5">
                {timelineHistory.map((item, i) => (
                  <div key={i} className="relative flex gap-4 pl-10">
                    <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-primary border-4 border-surface shadow-sm" />
                    <div className="flex-1 flex items-center justify-between bg-surface-secondary rounded-lg p-3">
                      <div>
                        <p className="text-sm font-semibold text-text">
                          {item.ml} ml
                        </p>
                        <p className="text-xs text-text-secondary">
                          {item.label}
                        </p>
                      </div>
                      <span className="text-xs font-mono text-text-secondary">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="relative flex gap-4 pl-10">
                  <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-yellow-500 border-4 border-surface shadow-sm animate-pulse" />
                  <div className="flex-1 flex items-center justify-between bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-semibold text-text">
                        Próximo copo
                      </p>
                      <p className="text-xs text-text-secondary">
                        Horário sugerido
                      </p>
                    </div>
                    <Badge variant="warning" className="gap-1">
                      <Bell size={12} />
                      19:00
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={22} className="text-primary" />
                  Lembretes
                </CardTitle>
                <CardDescription>
                  Não se esqueça de beber água
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between bg-surface-secondary rounded-lg p-4">
              <div>
                <p className="text-sm font-semibold text-text">
                  Lembretes ativos
                </p>
                <p className="text-xs text-text-secondary">
                  Receba notificações para beber água
                </p>
              </div>
              <button
                onClick={() => setRemindersOn((v) => !v)}
                className={cn(
                  "relative w-14 h-8 rounded-full transition-colors duration-200",
                  remindersOn ? "bg-primary" : "bg-border"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200",
                    remindersOn ? "translate-x-7" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-text">
                Frequência
              </label>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                disabled={!remindersOn}
              >
                <option value="30">A cada 30 minutos</option>
                <option value="45">A cada 45 minutos</option>
                <option value="60">A cada 60 minutos</option>
                <option value="90">A cada 90 minutos</option>
              </Select>
            </div>

            <div className="flex items-center justify-between bg-surface-secondary rounded-lg p-4">
              <div>
                <p className="text-sm font-semibold text-text">
                  Modo silencioso
                </p>
                <p className="text-xs text-text-secondary">
                  Das 22:00 às 07:00
                </p>
              </div>
              <button
                onClick={() => setSilentMode((v) => !v)}
                className={cn(
                  "relative w-14 h-8 rounded-full transition-colors duration-200",
                  silentMode ? "bg-primary" : "bg-border"
                )}
                disabled={!remindersOn}
              >
                <span
                  className={cn(
                    "absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200",
                    silentMode ? "translate-x-7" : "translate-x-1"
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Flame size={22} className="text-orange-500" />
                  Dicas de hidratação
                </CardTitle>
                <CardDescription>
                  Hábitos para melhorar seu consumo
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-start bg-surface-secondary rounded-lg p-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                    {i + 1}
                  </div>
                  <p className="text-sm text-text leading-relaxed pt-1">
                    {tip}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Últimos 7 dias</CardTitle>
                <CardDescription>
                  Acompanhe sua consistência
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {weeklyData.map((day, i) => {
              const pct = Math.min((day.ml / day.max) * 100, 120);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          day.hoje ? "text-primary" : "text-text"
                        )}
                      >
                        {day.day}
                      </span>
                      {day.meta && (
                        <Badge variant="success" className="text-[10px] py-0 px-2">
                          Meta
                        </Badge>
                      )}
                      {day.excedente && (
                        <Badge variant="default" className="text-[10px] py-0 px-2">
                          Excedente
                        </Badge>
                      )}
                      {day.hoje && (
                        <Badge variant="outline" className="text-[10px] py-0 px-2">
                          Hoje
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-text-secondary font-mono">
                      {day.ml} / {day.max} ml ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="relative h-4 w-full rounded-full bg-surface-secondary overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        day.excedente
                          ? "bg-gradient-to-r from-primary to-purple-500"
                          : pct >= 100
                          ? "bg-green-500"
                          : "bg-primary"
                      )}
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
