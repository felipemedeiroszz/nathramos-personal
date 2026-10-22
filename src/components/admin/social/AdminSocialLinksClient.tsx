"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AtSign,
  ChevronDown,
  ChevronUp,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  MessageCircle,
  Music2,
  Pencil,
  Pin,
  Plus,
  Share2,
  Trash2,
  Twitter,
  Youtube,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { SocialLinkUpsertModal } from "./SocialLinkUpsertModal";
import {
  deleteSocialLinkAction,
  reorderSocialLinksAction,
  toggleSocialLinkActiveAction,
} from "@/app/actions/social";
import type { SocialLinkRow } from "@/types";

interface AdminSocialLinksClientProps {
  title: string;
  links: SocialLinkRow[];
}

function platformIcon(platform: string) {
  switch (platform) {
    case "instagram":
      return <Instagram size={18} />;
    case "youtube":
      return <Youtube size={18} />;
    case "tiktok":
      return <Music2 size={18} />;
    case "facebook":
      return <Facebook size={18} />;
    case "whatsapp":
      return <MessageCircle size={18} />;
    case "x":
      return <Twitter size={18} />;
    case "linkedin":
      return <Linkedin size={18} />;
    case "pinterest":
      return <Pin size={18} />;
    case "threads":
      return <AtSign size={18} />;
    default:
      return <Globe size={18} />;
  }
}

export function AdminSocialLinksClient({ title, links }: AdminSocialLinksClientProps) {
  const t = useTranslations("adminSocial");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SocialLinkRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const activeCount = useMemo(() => links.filter((l) => l.is_active).length, [links]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(link: SocialLinkRow) {
    setEditing(link);
    setModalOpen(true);
  }

  const labelFor = (link: SocialLinkRow) => {
    if (locale === "pt-BR") return link.label_pt || link.label_en || link.handle || link.url;
    return link.label_en || link.label_pt || link.handle || link.url;
  };

  function handleToggle(link: SocialLinkRow) {
    setBusyId(link.id);
    startTransition(async () => {
      try {
        await toggleSocialLinkActiveAction(link.id, !link.is_active);
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleDelete(link: SocialLinkRow) {
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusyId(link.id);
    startTransition(async () => {
      try {
        await deleteSocialLinkAction(link.id);
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const ids = links.map((l) => l.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setReordering(true);
    startTransition(async () => {
      try {
        await reorderSocialLinksAction({ ids });
        router.refresh();
      } finally {
        setReordering(false);
      }
    });
  }

  return (
    <>
      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-border">
          <div className="flex-1 flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Share2 size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-text">{title}</p>
              <p className="text-xs text-text-secondary">
                {t("activeCount", { active: activeCount, total: links.length })}
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={openCreate}>
            <Plus size={16} className="mr-2" />
            {t("newLink")}
          </Button>
        </div>

        {links.length === 0 ? (
          <EmptyState
            className="py-16"
            icon={<Share2 size={36} className="text-text-secondary" />}
            title={t("emptyTitle")}
            description={t("emptyDesc")}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">{t("order")}</TableHead>
                  <TableHead>{t("network")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("url")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link, index) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === 0 || reordering}
                          aria-label={t("moveUp")}
                          onClick={() => move(index, -1)}
                        >
                          <ChevronUp size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === links.length - 1 || reordering}
                          aria-label={t("moveDown")}
                          onClick={() => move(index, 1)}
                        >
                          <ChevronDown size={15} />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-surface-secondary text-primary flex items-center justify-center shrink-0 overflow-hidden">
                          {link.icon_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={link.icon_url}
                              alt=""
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            platformIcon(link.platform)
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text truncate">
                            {labelFor(link)}
                          </p>
                          <p className="text-xs text-text-secondary truncate">
                            {t(`platform_${link.platform}` as any)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1 max-w-[280px] truncate"
                      >
                        {link.url}
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={link.is_active ? "success" : "outline"}>
                        {link.is_active ? t("activeLabel") : t("inactiveLabel")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === link.id}
                          onClick={() => handleToggle(link)}
                        >
                          {link.is_active ? t("deactivate") : t("activate")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("editLink")}
                          onClick={() => openEdit(link)}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("deleteLink")}
                          disabled={busyId === link.id}
                          onClick={() => handleDelete(link)}
                        >
                          <Trash2 size={15} className="text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <SocialLinkUpsertModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          link={editing}
          onSaved={() => {
            setModalOpen(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

export default AdminSocialLinksClient;
