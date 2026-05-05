"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteUnit, updateUnit, type UnitType } from "@/actions/units";

const types: { value: UnitType; label: string }[] = [
  { value: "convenience", label: "Loja de conveniência" },
  { value: "gas_station", label: "Posto de combustível" },
  { value: "restaurant", label: "Restaurante" },
  { value: "other", label: "Outro" },
];

const typeLabel: Record<string, string> = {
  convenience: "Conveniência",
  gas_station: "Posto",
  restaurant: "Restaurante",
  other: "Outro",
};

export function UnitRowEditor({
  organizationId,
  unit,
  canManage,
}: {
  organizationId: string;
  unit: { id: string; name: string; unit_type: string; city: string | null };
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-4">
        <div>
          <p className="font-medium">{unit.name}</p>
          <p className="text-sm text-zinc-500">
            {typeLabel[unit.unit_type] ?? unit.unit_type}
            {unit.city ? ` · ${unit.city}` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{unit.name}</p>
          <p className="text-sm text-zinc-500">
            {typeLabel[unit.unit_type] ?? unit.unit_type}
            {unit.city ? ` · ${unit.city}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-sm text-emerald-800 hover:underline dark:text-emerald-400"
        >
          {open ? "Fechar" : "Editar"}
        </button>
      </div>

      {open && (
        <form
          className="mt-4 grid max-w-lg gap-3 rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-600"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const res = await updateUnit({
                organizationId,
                unitId: unit.id,
                name: String(fd.get("name") ?? ""),
                unitType: String(fd.get("unit_type")) as UnitType,
                city: String(fd.get("city") ?? ""),
              });
              if ("error" in res && res.error) setError(res.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Nome
            <input
              name="name"
              required
              defaultValue={unit.name}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Tipo
            <select
              name="unit_type"
              defaultValue={unit.unit_type}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
            Cidade
            <input
              name="city"
              defaultValue={unit.city ?? ""}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Guardar"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm("Apagar esta unidade? Checklists e execuções associadas podem ser removidas."))
                  return;
                start(async () => {
                  const res = await deleteUnit({ organizationId, unitId: unit.id });
                  if ("error" in res && res.error) setError(res.error);
                  else router.refresh();
                });
              }}
              className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
            >
              Apagar unidade
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
