"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface RestTimerDisplayProps {
  totalSeconds?: number;
  initialSeconds?: number;
  autoStart?: boolean;
  isRunning?: boolean;
  seconds?: number;
  onComplete?: () => void;
  onSkip?: () => void;
  onToggle?: (running: boolean) => void;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function playBeep() {
  try {
    const AudioCtx =
      (typeof window !== "undefined" &&
        (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)) ||
      null;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // noop
      }
    }, 250);
  } catch {
    // noop
  }
}

function triggerVibrate() {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof (navigator as Navigator & { vibrate?: (p: number[]) => boolean })
        .vibrate === "function"
    ) {
      (
        navigator as Navigator & {
          vibrate: (p: number[]) => boolean;
        }
      ).vibrate([200, 100, 200]);
    }
  } catch {
    // noop
  }
}

export function RestTimerDisplay({
  totalSeconds: totalSecondsProp = 60,
  initialSeconds,
  autoStart = false,
  isRunning: externalRunning,
  seconds: externalSeconds,
  onComplete,
  onSkip,
  onToggle,
  size = 200,
  strokeWidth = 12,
  className,
}: RestTimerDisplayProps) {
  const controlled =
    typeof externalRunning === "boolean" && typeof externalSeconds === "number";

  const [internalRunning, setInternalRunning] = useState(autoStart);
  const [internalSeconds, setInternalSeconds] = useState(
    initialSeconds ?? totalSecondsProp
  );
  const didCompleteRef = useRef(false);

  const running = controlled ? externalRunning : internalRunning;
  const seconds = controlled ? externalSeconds : internalSeconds;
  const total = totalSecondsProp;

  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const progress = useMemo(() => {
    if (total <= 0) return 0;
    const clamped = Math.max(0, Math.min(total, seconds));
    return clamped / total;
  }, [seconds, total]);

  const offset = useMemo(
    () => circumference * (1 - progress),
    [circumference, progress]
  );

  const complete = useCallback(() => {
    if (didCompleteRef.current) return;
    didCompleteRef.current = true;
    playBeep();
    triggerVibrate();
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!controlled) {
      didCompleteRef.current = false;
    }
  }, [controlled, totalSecondsProp, initialSeconds, autoStart]);

  useEffect(() => {
    if (controlled) return;
    if (!running) return;
    if (seconds <= 0) {
      setInternalRunning(false);
      complete();
      return;
    }
    const id = window.setInterval(() => {
      setInternalSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          window.setTimeout(() => {
            setInternalRunning(false);
            complete();
          }, 0);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, seconds, controlled, complete]);

  const handleToggle = () => {
    if (seconds <= 0 && !controlled) {
      setInternalSeconds(totalSecondsProp);
      didCompleteRef.current = false;
    }
    if (onToggle) {
      onToggle(!running);
    }
    if (!controlled) {
      setInternalRunning((r) => !r);
    }
  };

  const handleSkip = () => {
    if (!controlled) {
      setInternalRunning(false);
      setInternalSeconds(0);
    }
    if (onSkip) onSkip();
    complete();
  };

  const start = useCallback(
    (customTotal?: number) => {
      didCompleteRef.current = false;
      if (!controlled) {
        setInternalSeconds(
          typeof customTotal === "number" ? customTotal : totalSecondsProp
        );
        setInternalRunning(true);
      }
    },
    [controlled, totalSecondsProp]
  );

  (RestTimerDisplay as unknown as { start?: (n?: number) => void }).start =
    start;

  const center = size / 2;
  const isFinished = seconds <= 0;

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            className={cn(
              "tabular-nums font-bold tracking-tight",
              isFinished ? "text-primary" : "text-text",
              size >= 200
                ? "text-5xl"
                : size >= 150
                  ? "text-4xl"
                  : size >= 100
                    ? "text-2xl"
                    : "text-xl"
            )}
          >
            {formatTime(seconds)}
          </span>
          <span className="text-xs uppercase tracking-widest text-text-secondary">
            {running ? "descanso" : isFinished ? "concluido" : "pausado"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleToggle}
          aria-pressed={running}
        >
          {running ? (
            <>
              <Pause size={18} className="mr-2" />
              Pausar
            </>
          ) : (
            <>
              <Play size={18} className="mr-2" />
              Retomar
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={handleSkip}
        >
          <SkipForward size={18} className="mr-2" />
          Pular
        </Button>
      </div>
    </div>
  );
}

export default RestTimerDisplay;
