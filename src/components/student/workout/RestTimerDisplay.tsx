"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Play, Pause, RotateCcw, SkipForward, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RestTimerDisplayProps {
  seconds: number;
  autoStart?: boolean;
  onComplete?: () => void;
  onExtendSeconds?: number;
  compact?: boolean;
  className?: string;
}

function beep(freq = 880, duration = 200, count = 3) {
  try {
    const Ctx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    const times = Array.from({ length: count });
    times.forEach((_, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = 0.1;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * (duration / 1000 + 0.05);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration / 1000);
      osc.start(start);
      osc.stop(start + duration / 1000 + 0.05);
    });
    setTimeout(() => ctx.close(), (count * (duration + 60)));
  } catch {}
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

function formatTime(total: number): string {
  if (total <= 0) return "00:00";
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function RestTimerDisplay({
  seconds,
  autoStart = true,
  onComplete,
  onExtendSeconds = 30,
  compact = false,
  className,
}: RestTimerDisplayProps) {
  const [remaining, setRemaining] = useState<number>(seconds);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);
  const [finished, setFinished] = useState<boolean>(false);
  const firedRef = useRef<boolean>(false);
  const initialRef = useRef<number>(seconds);

  useEffect(() => {
    setRemaining(seconds);
    initialRef.current = seconds;
    setIsRunning(autoStart);
    setFinished(false);
    firedRef.current = false;
  }, [seconds, autoStart]);

  useEffect(() => {
    if (!isRunning || remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
      if (r <= 1) {
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRunning, remaining]);

  useEffect(() => {
    if (remaining <= 0 && isRunning && !firedRef.current) {
      firedRef.current = true;
      setIsRunning(false);
      setFinished(true);
      beep();
      vibrate([200, 100, 200, 100, 200]);
      onComplete?.();
    }
  }, [remaining, isRunning, onComplete]);

  const toggle = useCallback(() => {
    if (finished) {
      setRemaining(initialRef.current);
      setFinished(false);
      firedRef.current = false;
    }
    setIsRunning((r) => !r);
  }, [finished]);

  const reset = useCallback(() => {
    setRemaining(initialRef.current);
    setFinished(false);
    firedRef.current = false;
    setIsRunning(true);
  }, []);

  const extend = useCallback(() => {
    setRemaining((r) => Math.max(0, r + onExtendSeconds));
    setFinished(false);
    firedRef.current = false;
  }, [onExtendSeconds]);

  const skip = useCallback(() => {
    setRemaining(0);
    setIsRunning(false);
    setFinished(true);
    firedRef.current = false;
  }, []);

  const progress = initialRef.current > 0
    ? Math.max(0, Math.min(1, remaining / initialRef.current))
    : 0;
  const size = compact ? 44 : 88;
  const stroke = compact ? 3 : 6;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - progress);

  const urgent = remaining <= 10 && remaining > 0 && isRunning;

  if (compact) {
    return (
      <div
        className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-2",
        className
      )}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--primary))"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-linear"
          />
        </svg>
        <div className="flex flex-col min-w-[56px]">
          <span
            className={cn(
              "text-lg font-bold tabular-nums leading-none",
              urgent ? "text-red-400 animate-pulse" : "text-text",
              finished && "text-primary"
            )}
          >
            {formatTime(remaining)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-text-secondary">
            descanso
          </span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="h-8 w-8 p-0"
            title={isRunning ? "Pausar" : "Iniciar"}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={extend}
            className="h-8 w-8 p-0"
            title={`+${onExtendSeconds}s`}
          >
            <Plus size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={skip}
            className="h-8 w-8 p-0"
            title="Pular"
          >
            <SkipForward size={14} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-4 sm:p-5",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="relative mx-auto sm:mx-0 shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="hsl(var(--border))"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "text-2xl sm:text-3xl font-bold tabular-nums",
                urgent ? "text-red-400 animate-pulse" : "text-text",
                finished && "text-primary"
              )}
            >
              {formatTime(remaining)}
            </span>
            <span className="text-xs uppercase tracking-wider text-text-secondary">
              {finished ? "Concluido" : "Descanso"}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text mb-1">
            {finished ? "Descanso finalizado. Proxima serie!" : "Cronometro de descanso"}
          </div>
          <div className="text-xs text-text-secondary mb-3">
            Quando o tempo acabar, tocara um aviso sonoro e o dispositivo vibrara.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={toggle}>
              {isRunning ? (
                <>
                  <Pause size={14} className="mr-1.5" /> Pausar
                </>
              ) : (
                <>
                  <Play size={14} className="mr-1.5" /> {finished ? "Reiniciar" : "Iniciar"}
                </>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={reset}>
              <RotateCcw size={14} className="mr-1.5" /> Resetar
            </Button>
            <Button variant="secondary" size="sm" onClick={extend}>
              <Plus size={14} className="mr-1.5" /> +{onExtendSeconds}s
            </Button>
            <Button variant="ghost" size="sm" onClick={skip}>
              <SkipForward size={14} className="mr-1.5" /> Pular
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
