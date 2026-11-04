"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { prepareProductImageUploadAction, completeProductImageUploadAction } from "@/app/actions/content";
import { createClientBrowser } from "@/lib/supabase/client";
import { useAsyncTransition } from "@/hooks/useAsyncTransition";
import { productImageSchema, PRODUCT_IMAGE_MAX_BYTES } from "@/lib/uploads/product-image";

interface ProductImageFieldProps {
  value: string;
  onChange: (url: string) => void;
}

export function ProductImageField({ value, onChange }: ProductImageFieldProps) {
  const locale = useLocale();
  const [isPending, startTransition] = useAsyncTransition();
  const [error, setError] = useState<string | null>(null);

  const label = (pt: string, en: string) => (locale === "pt-BR" ? pt : en);

  const handleFiles = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setError(null);
    void startTransition(async () => {
      try {
        const metadata = { size: file.size, type: file.type };
        if (!productImageSchema.safeParse(metadata).success)
          throw new Error(label("Use PNG, JPG ou WEBP de até 5 MiB.", "Use PNG, JPG or WEBP up to 5 MiB."));
        const prepared = await prepareProductImageUploadAction(metadata);
        if (!prepared.success) throw new Error(prepared.message);
        const { bucket, path, token } = prepared.data;
        const { error: uploadError } = await createClientBrowser().storage.from(bucket)
          .uploadToSignedUrl(path, token, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error(label("Falha ao enviar a imagem. Tente novamente.", "Image upload failed. Please try again."));
        const result = await completeProductImageUploadAction(path);
        if (!result.success) throw new Error(result.message);
        onChange(result.url);
      } catch (error) {
        setError(error instanceof Error ? error.message : label("Falha ao enviar a imagem.", "Image upload failed."));
      }
    });
  };

  return (
    <fieldset disabled={isPending} data-upload-pending={isPending} aria-busy={isPending} className="space-y-2">
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
          maxSize={PRODUCT_IMAGE_MAX_BYTES}
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

      {isPending && <p role="status">{label("Enviando imagem…", "Uploading image…")}</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    </fieldset>
  );
}

export default ProductImageField;
