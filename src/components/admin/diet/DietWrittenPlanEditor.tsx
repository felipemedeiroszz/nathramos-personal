"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { DietWrittenPlan } from "@/components/shared/DietWrittenPlan";
export function DietWrittenPlanEditor({
  pt,
  en,
  locale,
  disabled,
  onChange,
  onExample,
}: {
  pt: string;
  en: string;
  locale: string;
  disabled: boolean;
  onChange: (language: "pt-BR" | "en-US", text: string) => void;
  onExample: () => void;
}) {
  const [language, setLanguage] = useState<"pt-BR" | "en-US">(
      locale === "en-US" ? "en-US" : "pt-BR",
    ),
    [replace, setReplace] = useState(false),
    [preview, setPreview] = useState(false),
    id = useId();
  const english = locale === "en-US",
    label = (a: string, b: string) => (english ? b : a),
    text = language === "pt-BR" ? pt : en;
  return (
    <fieldset
      disabled={disabled}
      className="space-y-4 rounded-xl border border-border p-4"
    >
      <legend className="px-1 text-sm font-semibold">
        {label("Plano alimentar por refeições", "Written meal plan")}
      </legend>
      <p className="text-xs leading-relaxed text-text-secondary">
        {label(
          "Escreva ou cole as refeições com alimentos, quantidades, alternativas e orientações. Pode salvar o kit somente com esse texto. Os alimentos do catálogo abaixo são opcionais e permitem registrar consumo e calcular nutrientes.",
          "Write or paste meals with foods, quantities, alternatives and guidance. The kit can contain only this text. Catalog foods below are optional and enable food logging and nutrient calculations.",
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (pt.trim() || en.trim()) setReplace(true);
            else onExample();
          }}
        >
          {label("Usar exemplo de refeições", "Use meal example")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview
            ? label("Editar texto", "Edit text")
            : label("Prévia do aluno", "Student preview")}
        </Button>
      </div>
      {replace && (
        <div
          className="space-y-2 rounded-xl border border-amber-400/20 p-3"
          role="alert"
        >
          <p className="text-xs">
            {label(
              "Substituir o texto atual nas duas línguas pelo modelo? Os alimentos do catálogo serão mantidos.",
              "Replace the current text in both languages with the example? Catalog foods will be preserved.",
            )}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onExample();
              setReplace(false);
            }}
          >
            {label("Substituir texto", "Replace text")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setReplace(false)}
          >
            {label("Cancelar", "Cancel")}
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        {(["pt-BR", "en-US"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={language === value}
            onClick={() => setLanguage(value)}
            className={`min-h-10 rounded-lg px-3 text-xs ${language === value ? "bg-primary/10 text-primary" : "text-text-secondary"}`}
          >
            {value === "pt-BR" ? "Português" : "English"}
          </button>
        ))}
      </div>
      {preview ? (
        <div
          aria-label={label("Prévia do plano alimentar", "Meal plan preview")}
        >
          {text.trim() ? (
            <DietWrittenPlan text={text} locale={language} />
          ) : (
            <p className="text-sm text-text-secondary">
              {label(
                "Adicione refeições para ver a prévia.",
                "Add meals to see the preview.",
              )}
            </p>
          )}
        </div>
      ) : (
        <>
          <label htmlFor={id} className="block text-sm">
            {label("Refeições e orientações", "Meals and guidance")} (
            {language === "pt-BR" ? "PT" : "EN"})
          </label>
          <Textarea
            id={id}
            rows={12}
            maxLength={30000}
            value={text}
            onChange={(event) => onChange(language, event.target.value)}
            placeholder={label(
              "Café da manhã\n* Ovos: 100 g\n* Aveia: 50 g\n\nAlmoço\n* Frango: 150 g\n\nOrientações adicionais\nEscreva suas observações.",
              "Breakfast\n* Eggs: 100 g\n* Oats: 50 g\n\nLunch\n* Chicken: 150 g\n\nAdditional guidance\nWrite your notes.",
            )}
          />
        </>
      )}
    </fieldset>
  );
}
