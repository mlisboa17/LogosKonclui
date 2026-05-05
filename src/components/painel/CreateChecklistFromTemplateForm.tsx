"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChecklistFromTemplate } from "@/actions/checklists";

type Unit = { id: string; name: string };
type Template = { id: string; name: string };

export function CreateChecklistFromTemplateForm({
  organizationId,
  units,
  templates,
  canPublish = true,
}: {
  organizationId: string;
  units: Unit[];
  templates: Template[];
  /** Gestores sem permissão ou operadores: formulário oculto */
  canPublish?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!units.length || !templates.length) {
    return (
      <p className="text-sm text-zinc-500">
        Cadastre pelo menos uma unidade e importe modelos na aba Modelos.
      </p>
    );
  }

  if (!canPublish) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        Vista só leitura: não tem permissão para publicar checklists a partir de modelos. Peça ao proprietário
        para ativar em Conta → permissões do gestor.
      </div>
    );
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await createChecklistFromTemplate({
            organizationId,
            unitId: String(fd.get("unit_id")),
            templateId: String(fd.get("template_id")),
          });
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <h2 className="text-sm font-semibold">Publicar checklist a partir de um modelo</h2>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Unidade
        <select
          name="unit_id"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Modelo
        <select
          name="template_id"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Criando…" : "Criar checklist"}
      </button>
    </form>
  );
}
