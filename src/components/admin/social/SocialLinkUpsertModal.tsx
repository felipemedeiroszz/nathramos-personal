"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalClose,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { ProductImageField } from "@/components/admin/content/ProductImageField";
import type { SocialLinkRow } from "@/types";
import { SOCIAL_PLATFORMS } from "@/schemas/social";

interface SocialLinkUpsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  link?: SocialLinkRow | null;
  onSaved?: () => void;
}

export function SocialLinkUpsertModal({
  isOpen,
  onClose,
  link,
  onSaved,
}: SocialLinkUpsertModalProps) {
  const t = useTranslations("adminSocial");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    platform: "instagram",
    url: "",
    handle: "",
    icon_url: "",
    label_pt: "",
    label_en: "",
    is_active: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (link) {
      setForm({
        platform: link.platform ?? "other",
        url: link.url ?? "",
        handle: link.handle ?? "",
        icon_url: link.icon_url ?? "",
        label_pt: link.label_pt ?? "",
        label_en: link.label_en ?? "",
        is_active: link.is_active ?? true,
      });
    } else {
      setForm({
        platform: "instagram",
        url: "",
        handle: "",
        icon_url: "",
        label_pt: "",
        label_en: "",
        is_active: true,
      });
    }
  }, [isOpen, link]);

  const update = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { upsertSocialLinkAction } = await import("@/app/actions/social");
      const result = await upsertSocialLinkAction({
        id: link?.id,
        platform: form.platform as any,
        url: form.url,
        handle: form.handle || null,
        icon_url: form.icon_url || null,
        label_pt: form.label_pt || null,
        label_en: form.label_en || null,
        is_active: form.is_active,
      });
      if (!result.success) {
        setError(result.message ?? t("saveError"));
        return;
      }
      onSaved?.();
    });
  };

  const title = link ? t("editLink") : t("newLink");

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg max-h-[90vh] overflow-y-auto">
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        <ModalClose onClick={onClose} />
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("platform")}</label>
            <Select
              value={form.platform}
              onChange={(e) => update("platform", e.target.value)}
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {t(`platform_${p}` as any)}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("url")}</label>
            <Input
              value={form.url}
              onChange={(e) => update("url", e.target.value)}
              placeholder="https://instagram.com/nathramos"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text">{t("handle")}</label>
            <Input
              value={form.handle}
              onChange={(e) => update("handle", e.target.value)}
              placeholder="@nathramos"
            />
          </div>

          <ProductImageField
            value={form.icon_url}
            onChange={(url) => update("icon_url", url)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("labelPt")}
              </label>
              <Input
                value={form.label_pt}
                onChange={(e) => update("label_pt", e.target.value)}
                placeholder={locale === "pt-BR" ? "Opcional" : "Opcional"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text">
                {t("labelEn")}
              </label>
              <Input
                value={form.label_en}
                onChange={(e) => update("label_en", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
            />
            <span className="text-sm text-text">{t("active")}</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? tCommon("loading") : tCommon("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default SocialLinkUpsertModal;
