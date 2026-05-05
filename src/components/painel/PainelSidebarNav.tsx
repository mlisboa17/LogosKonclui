"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PainelNavItem } from "@/lib/painel-nav";

const EMOJI_BY_LABEL: Record<string, string> = {
  "Visão geral": "📊",
  Unidades: "🏬",
  Modelos: "🧩",
  Checklists: "✅",
  "Minhas tarefas": "📝",
  Operador: "📱",
  Agendamentos: "🗓️",
  Equipe: "👥",
  Telegram: "🔔",
  Conta: "⚙️",
  Configuração: "⚙️",
  Site: "↩️",
};

function itemIcon(label: string) {
  return EMOJI_BY_LABEL[label] ?? "•";
}

function isActive(pathname: string, href: string) {
  if (href === "/painel") return pathname === "/painel";
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PainelSidebarNav({ items }: { items: PainelNavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      <nav className="md:hidden">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {items.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="hidden md:block">
        <ul className="space-y-1">
          {items.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className={`${active ? "" : "opacity-80 group-hover:opacity-100"}`}>
                    {itemIcon(n.label)}
                  </span>
                  <span>{n.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
