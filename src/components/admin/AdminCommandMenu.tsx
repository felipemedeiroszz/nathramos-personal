"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { navigationForRole } from "./navigation";
import { useDialogFocus } from "@/components/ui/useDialogFocus";

export function AdminCommandMenu({
  open,
  onClose,
  locale,
  role,
}: {
  open: boolean;
  onClose: () => void;
  locale: string;
  role: string;
}) {
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(open, onClose, ref);
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);
  if (!open) return null;
  const en = locale === "en-US";
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const groups = navigationForRole(role)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        normalize(`${item.pt} ${item.en} ${group.pt} ${group.en}`).includes(
          normalize(query.trim()),
        ),
      ),
    }))
    .filter((group) => group.items.length);
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={en ? "Find an admin page" : "Buscar página do painel"}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-[#101113] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <Search size={18} className="shrink-0 text-yellow-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={en ? "Page name" : "Nome da página"}
            placeholder={
              en ? "Where would you like to go?" : "Qual página você procura?"
            }
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                ref.current?.querySelector<HTMLAnchorElement>("a")?.focus();
              }
              if (e.key === "Enter") {
                ref.current?.querySelector<HTMLAnchorElement>("a")?.click();
              }
            }}
          />
          <button
            aria-label={en ? "Close search" : "Fechar busca"}
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 hover:text-white"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[55dvh] space-y-4 overflow-y-auto p-3">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
                {en ? group.en : group.pt}
              </h2>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  href={`/${locale}/admin/${item.path}`}
                  onClick={onClose}
                  onKeyDown={(e) => {
                    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
                    e.preventDefault();
                    const links = Array.from(
                      ref.current?.querySelectorAll<HTMLAnchorElement>("a") ||
                        [],
                    );
                    const index = links.indexOf(e.currentTarget);
                    links[
                      (index +
                        (e.key === "ArrowDown" ? 1 : -1) +
                        links.length) %
                        links.length
                    ]?.focus();
                  }}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs text-zinc-300 outline-none hover:bg-white/5 focus:bg-yellow-400/10 focus:text-yellow-400"
                >
                  <item.icon size={15} className="text-zinc-500" />
                  {en ? item.en : item.pt}
                  <ArrowUpRight
                    size={13}
                    className="ml-auto text-zinc-600 group-focus:text-yellow-400"
                  />
                </Link>
              ))}
            </section>
          ))}
          {!groups.length && (
            <p className="p-8 text-center text-xs text-zinc-500">
              {en
                ? "No pages found. Try a different term."
                : "Nenhuma página encontrada. Tente outro termo."}
            </p>
          )}
        </div>
        <div className="flex justify-between border-t border-white/10 px-4 py-3 text-[10px] text-zinc-500">
          <span>
            {en
              ? "↑ ↓ to navigate · Enter to open"
              : "↑ ↓ para navegar · Enter para abrir"}
          </span>
          <span>Esc {en ? "to close" : "para fechar"}</span>
        </div>
      </div>
    </div>
  );
}
