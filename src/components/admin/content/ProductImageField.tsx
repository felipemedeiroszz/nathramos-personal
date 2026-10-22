"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { uploadProductImageAction } from "@/app/actions/content";

interface ProductImageFieldProps {
  value: string;
  onChange: (url: string) => void;
}

export function ProductImageField({ value, onChange }: ProductImageFieldProps) {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await uploadProductImageAction(formData);
      if (result.success && result.url) {
        onChange(result.url);
      } else {
        setError(
          result.message ||
            label("Falha ao enviar a imagem.", "Failed to upload the image.")
        );
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text">
          {label("Imagem", "Image")}
        </label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => onChange("")}
          >
            <X size={14} />
            {label("Remover", "Remove")}
          </Button>
        )}
      </div>

      {value ? (
        <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-border bg-surface-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 size={20} className="animate-spin text-primary" />
            </div>
          )}
        </div>
      ) : (
        <FileUpload
          accept="image/png,image/jpeg,image/webp"
          maxSize={5 * 1024 * 1024}
          onFileSelect={handleFiles}
          className="p-4"
        />
      )}

      <Input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label("ou cole uma URL: https://...", "or paste a URL: https://...")}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default ProductImageField;
