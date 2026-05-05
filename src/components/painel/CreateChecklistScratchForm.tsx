"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChecklistFromScratch } from "@/actions/checklists";
import type { ChecklistItemDraftInput } from "@/lib/checklist-item-draft";

const ITEM_TYPES: { value: ChecklistItemDraftInput["item_type"]; label: string }[] = [
  { value: "boolean", label: "Sim / Não" },
  { value: "number", label: "Número" },
  { value: "text", label: "Texto" },
  { value: "photo", label: "Só foto" },
];

type Row = ChecklistItemDraftInput;

export function CreateChecklistScratchForm({
  organizationId,
  units,
}: {
  organizationId: string;
  units: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>([
    { title: "", item_type: "boolean", is_critical: false, weight: 1, requires_photo: false },
  ]);

  if (!units.length) {
    return (
      <p className="text-sm text-zinc-500">Cadastre pelo menos uma unidade.</p>
    );
  }

  function addRow() {
    setRows((r) => [
      ...r,
      { title: "", item_type: "boolean", is_critical: false, weight: 1, requires_photo: false },
    ]);
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, j) => j !== i));
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const cleaned = rows
          .map((x) => ({
            ...x,
            title: x.title.trim(),
          }))
          .filter((x) => x.title.length > 0);
        if (!name.trim()) {
          setError("Informe o nome do checklist.");
          return;
        }
        if (!cleaned.length) {
          setError("Adicione pelo menos um item com texto.");
          return;
        }
        start(async () => {
          const res = await createChecklistFromScratch({
            organizationId,
            unitId: unitId || units[0].id,
            name: name.trim(),
            items: cleaned,
          });
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Nome do checklist
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex.: Abastecimento freezers — manhã"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Itens</h3>
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
        >
          + Item
        </button>
      </div>

      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li
            key={i}
            className="flex flex-wrap items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <span className="mt-2 w-6 text-sm text-zinc-400">{i + 1}.</span>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={row.title}
                onChange={(e) => updateRow(i, { title: e.target.value })}
                placeholder="Tarefa (ex.: Conferir expositor de snacks)"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex flex-col gap-0.5 text-zinc-500">
                  Tipo
                  <select
                    value={row.item_type}
                    onChange={(e) =>
                      updateRow(i, { item_type: e.target.value as Row["item_type"] })
                    }
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-5 text-sm">
                  <input
                    type="checkbox"
                    checked={row.is_critical}
                    onChange={(e) => updateRow(i, { is_critical: e.target.checked })}
                    className="accent-emerald-700"
                  />
                  Crítico
                </label>
                <label className="flex items-center gap-2 pt-5 text-sm">
                  <input
                    type="checkbox"
                    checked={row.requires_photo}
                    onChange={(e) => updateRow(i, { requires_photo: e.target.checked })}
                    className="accent-emerald-700"
                  />
                  Exige foto
                </label>
                <label className="flex flex-col gap-0.5 text-zinc-500">
                  Peso 1–10
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={row.weight ?? 1}
                    onChange={(e) =>
                      updateRow(i, {
                        weight: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-16 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

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
        {pending ? "Criando…" : "Publicar checklist"}
      </button>
    </form>
  );
}
