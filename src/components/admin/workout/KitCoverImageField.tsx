"use client";
import { useId, useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { uploadWorkoutKitCoverAction } from "@/app/actions/workout-covers";
import { productImageSchema } from "@/lib/uploads/product-image";
export function KitCoverImageField({
  value,
  onChange,
  onUploadingChange,
  locale,
  disabled = false,
}: {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange: (pending: boolean) => void;
  locale: string;
  disabled?: boolean;
}) {
  const en = locale === "en-US",
    t = (pt: string, english: string) => (en ? english : pt);
  const id = useId(),
    input = useRef<HTMLInputElement>(null),
    running = useRef(false);
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file || disabled || running.current) return;
    setError("");
    if (
      !productImageSchema.safeParse({ size: file.size, type: file.type })
        .success
    ) {
      setError(
        t(
          "Use PNG, JPG ou WEBP de até 5 MiB.",
          "Use PNG, JPG or WEBP up to 5 MiB.",
        ),
      );
      return;
    }
    running.current = true;
    setPending(true);
    onUploadingChange(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const result = await uploadWorkoutKitCoverAction(form);
      if (!result.success) {
        setError(result.message);
        return;
      }
      onChange(result.url);
    } catch {
      setError(
        t(
          "Não foi possível enviar a foto. Tente novamente.",
          "Unable to upload the photo. Please try again.",
        ),
      );
    } finally {
      running.current = false;
      setPending(false);
      onUploadingChange(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <fieldset
      disabled={disabled || pending}
      aria-busy={pending}
      data-upload-pending={pending}
      className="space-y-3 rounded-xl border border-border p-4"
    >
      <legend className="px-1 text-sm font-medium">
        {t("Capa do kit", "Kit cover")}
      </legend>
      {value && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-black/10">
          <div className="h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={t("Prévia da capa do kit", "Kit cover preview")}
              className="h-full w-full object-contain"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 bg-black/70"
            onClick={() => onChange("")}
          >
            <X size={14} className="mr-1" />
            {t("Remover", "Remove")}
          </Button>
        </div>
      )}
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void upload(event.dataTransfer.files[0]);
        }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border p-4"
      >
        <div>
          <p className="text-sm">
            {t("Anexe ou arraste uma foto", "Attach or drop a photo")}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            PNG, JPG, WEBP · {t("até 5 MiB", "up to 5 MiB")}
          </p>
        </div>
        <input
          ref={input}
          type="file"
          aria-label={t("Selecionar foto da capa", "Select cover photo")}
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => void upload(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => input.current?.click()}
        >
          {pending ? (
            <Loader2 size={15} className="mr-2 animate-spin" />
          ) : (
            <Upload size={15} className="mr-2" />
          )}
          {pending
            ? t("Enviando…", "Uploading…")
            : value
              ? t("Trocar foto", "Change photo")
              : t("Anexar foto", "Attach photo")}
        </Button>
      </div>
      <label htmlFor={id} className="block text-xs text-text-secondary">
        {t("Ou use uma URL de imagem", "Or use an image URL")}
      </label>
      <Input
        id={id}
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://..."
      />
      <p className="text-xs text-text-secondary">
        {t(
          "Depois de enviar, salve o kit para aplicar a capa.",
          "After uploading, save the kit to apply the cover.",
        )}
      </p>
      {pending && (
        <p role="status" className="text-sm">
          {t(
            "Enviando e validando a foto…",
            "Uploading and validating the photo…",
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}
    </fieldset>
  );
}
