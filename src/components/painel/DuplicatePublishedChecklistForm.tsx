"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duplicatePublishedChecklist } from "@/actions/checklists";

export function DuplicatePublishedChecklistForm({
  organizationId,
  units,
  published,
}: {
  organizationId: string;
  units: { id: string; name: string }[];
  published: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState(published[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");

  if (!units.length) {
    return <p className="text-sm text-zinc-500">Cadastre pelo menos uma unidade.</p>;
  }

  if (!published.length) {
    return (
      <p className="text-sm text-zinc-500">
        Ainda não há checklists publicados para copiar. Crie um pelo modelo ou &quot;Do zero&quot; primeiro.
      </p>
    );
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await duplicatePublishedChecklist({
            organizationId,
            unitId: unitId || units[0].id,
            sourceChecklistId: sourceId,
            newName: newName.trim() || `${published.find((p) => p.id === sourceId)?.name ?? "Checklist"} (cópia)`,
          });
          if ("error" in res && res.error) setError(res.error);
          else {
            setNewName("");
            router.refresh();
          }
        });
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Copiar de
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        >
          {published.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Novo nome
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex.: Rotina freezers — loja centro"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
      <p className="text-xs text-zinc-500">Se deixar vazio, usa o nome original com sufixo &quot;(cópia)&quot;.</p>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Unidade
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
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
        {pending ? "Duplicando…" : "Criar cópia"}
      </button>
    </form>
  );
}
