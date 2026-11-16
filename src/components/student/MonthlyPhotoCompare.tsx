"use client";
import { useState } from "react";
import { ChevronsLeftRight, RotateCcw } from "lucide-react";
export function MonthlyPhotoCompare({
  first,
  second,
  locale,
}: {
  first: { src: string; label: string; weight: string };
  second: { src: string; label: string; weight: string };
  locale: string;
}) {
  const en = locale === "en-US",
    t = (pt: string, eng: string) => (en ? eng : pt);
  const [position, setPosition] = useState(50),
    [loaded, setLoaded] = useState({ first: false, second: false }),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const ready = loaded.first && loaded.second && !failed;
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const update = (clientX: number, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    if (rect.width)
      setPosition(clamp(((clientX - rect.left) * 100) / rect.width));
  };
  const source = (src: string) => src + (attempt ? "&retry=" + attempt : "");
  return (
    <div className="monthly-swipe-wrap">
      <div className="monthly-swipe-labels">
        <span>
          <strong>{first.label}</strong>
          <small>{first.weight}</small>
        </span>
        <span>
          <strong>{second.label}</strong>
          <small>{second.weight}</small>
        </span>
      </div>
      <div
        className="monthly-swipe"
        role="slider"
        tabIndex={0}
        aria-label={t(
          "Comparação de fotos: arraste para revelar os meses",
          "Photo comparison: drag to reveal the months",
        )}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}% ${first.label}, ${100 - Math.round(position)}% ${second.label}`}
        aria-disabled={!ready}
        onPointerDown={(event) => {
          if (!ready || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          update(event.clientX, event.currentTarget);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            update(event.clientX, event.currentTarget);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (!ready) return;
          const step = event.shiftKey ? 10 : 2;
          const values: Record<string, number> = {
            ArrowLeft: position - step,
            ArrowRight: position + step,
            ArrowDown: position - step,
            ArrowUp: position + step,
            Home: 0,
            End: 100,
          };
          if (event.key in values) {
            event.preventDefault();
            setPosition(clamp(values[event.key]));
          }
        }}
      >
        <img
          className="monthly-swipe-image"
          src={source(second.src)}
          alt={second.label}
          width={600}
          height={800}
          draggable={false}
          onLoad={() => setLoaded((v) => ({ ...v, second: true }))}
          onError={() => setFailed(true)}
        />
        <div
          className="monthly-swipe-before"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            className="monthly-swipe-image"
            src={source(first.src)}
            alt={first.label}
            width={600}
            height={800}
            draggable={false}
            onLoad={() => setLoaded((v) => ({ ...v, first: true }))}
            onError={() => setFailed(true)}
          />
        </div>
        <div
          className="monthly-swipe-divider"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        >
          <span>
            <ChevronsLeftRight size={22} />
          </span>
        </div>
        {!ready && (
          <div className="monthly-swipe-loading" aria-hidden="true">
            {failed
              ? t(
                  "Não foi possível carregar as fotos.",
                  "Could not load the photos.",
                )
              : t("Carregando comparação…", "Loading comparison…")}
          </div>
        )}
      </div>
      {failed && (
        <button
          type="button"
          className="monthly-swipe-retry"
          onClick={() => {
            setFailed(false);
            setLoaded({ first: false, second: false });
            setAttempt((v) => v + 1);
          }}
        >
          {t("Tentar carregar novamente", "Try loading again")}
        </button>
      )}
      <div className="monthly-swipe-help">
        <p>
          {t(
            "Arraste a divisória com o dedo ou mouse para revelar a outra foto. No teclado, use as setas.",
            "Drag the divider with your finger or mouse to reveal the other photo. Use arrow keys on a keyboard.",
          )}
        </p>
        <button
          type="button"
          aria-label={t("Centralizar comparação", "Center comparison")}
          onClick={() => setPosition(50)}
        >
          <RotateCcw size={13} />
          {t("Centralizar", "Center")}
        </button>
      </div>
    </div>
  );
}
