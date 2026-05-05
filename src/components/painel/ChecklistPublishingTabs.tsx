"use client";

import { useState } from "react";
import { CreateChecklistFromTemplateForm } from "@/components/painel/CreateChecklistFromTemplateForm";
import { CreateChecklistScratchForm } from "@/components/painel/CreateChecklistScratchForm";
import { DuplicatePublishedChecklistForm } from "@/components/painel/DuplicatePublishedChecklistForm";

type Unit = { id: string; name: string };
type Template = { id: string; name: string };
type Published = { id: string; name: string };

const tabs = [
  { id: "template" as const, label: "A partir de modelo" },
  { id: "scratch" as const, label: "Do zero" },
  { id: "duplicate" as const, label: "Copiar checklist" },
];

export function ChecklistPublishingTabs({
  organizationId,
  units,
  templates,
  published,
  canPublish = true,
}: {
  organizationId: string;
  units: Unit[];
  templates: Template[];
  published: Published[];
  canPublish?: boolean;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>(() =>
    templates.length ? "template" : "scratch",
  );

  if (!canPublish) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        Não tem permissão para criar ou publicar checklists. Peça ao proprietário em Conta → permissões do
        gestor.
      </div>
    );
  }

  if (!units.length) {
    return (
      <p className="text-sm text-zinc-500">
        Cadastre pelo menos uma unidade antes de publicar checklists operacionais.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-white text-emerald-900 shadow dark:bg-zinc-900 dark:text-emerald-300"
                : "text-zinc-600 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-zinc-900/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "template" && (
        <CreateChecklistFromTemplateForm
          organizationId={organizationId}
          units={units}
          templates={templates}
          canPublish
        />
      )}

      {tab === "scratch" && (
        <CreateChecklistScratchForm organizationId={organizationId} units={units} />
      )}

      {tab === "duplicate" && (
        <DuplicatePublishedChecklistForm
          organizationId={organizationId}
          units={units}
          published={published}
        />
      )}
    </div>
  );
}
