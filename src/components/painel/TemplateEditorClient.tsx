"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveChecklistTemplate,
  type TemplateItemInput,
} from "@/actions/template-edit";

const ITEM_TYPES: { value: TemplateItemInput["item_type"]; label: string }[] = [
  { value: "boolean", label: "Sim / Não" },
  { value: "number", label: "Número" },
  { value: "text", label: "Texto" },
  { value: "photo", label: "Foto" },
];

export function TemplateEditorClient({
  organizationId,
  templateId,
  initialName,
  initialSector,
  initialDescription,
  initialItems,
}: {
  organizationId: string;
  templateId: string;
  initialName: string;
  initialSector: string;
  initialDescription: string;
  initialItems: TemplateItemInput[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [sector, setSector] = useState(initialSector);
  const [description, setDescription] = useState(initialDescription);
  const [rows, setRows] = useState<TemplateItemInput[]>(
    initialItems.length
      ? initialItems
      : [{ title: "", item_type: "boolean", is_critical: false, weight: 1, requires_photo: false }],
  );

  function addRow() {
    setRows((r) => [
      ...r,
      { title: "", item_type: "boolean", is_critical: false, weight: 1, requires_photo: false },
    ]);
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, j) => j !== i));
  }

  function updateRow(i: number, patch: Partial<TemplateItemInput>) {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  return (
    <form
      className="mx-auto max-w-4xl space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const cleaned = rows
            .map((x) => ({
              title: x.title.trim(),
              item_type: x.item_type,
              is_critical: x.is_critical,
              weight: x.weight ?? 1,
              requires_photo: x.requires_photo === true,
            }))
            .filter((x) => x.title.length > 0);
          if (!cleaned.length) {
            setError("Adicione pelo menos um item com texto.");
            return;
          }
          const res = await saveChecklistTemplate({
            organizationId,
            templateId,
            name,
            sector,
            description,
            items: cleaned,
          });
          if ("error" in res && res.error) setError(res.error);
          else router.push("/painel/modelos");
        });
      }}
    >
      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nome do modelo
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Setor / etiqueta
          <input
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Conveniência, Posto…"
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Descrição (opcional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </label>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Itens do checklist</h2>
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
              className="flex flex-wrap items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="mt-2 w-8 tabular-nums text-sm text-zinc-400">{i + 1}.</span>
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  value={row.title}
                  onChange={(e) => updateRow(i, { title: e.target.value })}
                  placeholder="Descrição da tarefa"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                    Tipo de resposta
                    <select
                      value={row.item_type}
                      onChange={(e) =>
                        updateRow(i, { item_type: e.target.value as TemplateItemInput["item_type"] })
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
                      checked={row.requires_photo === true}
                      onChange={(e) => updateRow(i, { requires_photo: e.target.checked })}
                      className="accent-emerald-700"
                    />
                    Exige foto
                  </label>
                  <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                    Peso (1–10)
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
                      className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
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
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Guardar modelo"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/painel/modelos")}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-600"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
