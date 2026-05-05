"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUnit, type UnitType } from "@/actions/units";

const types: { value: UnitType; label: string }[] = [
  { value: "convenience", label: "Loja de conveniência" },
  { value: "gas_station", label: "Posto de combustível" },
  { value: "restaurant", label: "Restaurante" },
  { value: "other", label: "Outro" },
];

export function CreateUnitForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-6 flex max-w-lg flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await createUnit({
            organizationId,
            name: String(fd.get("name") ?? ""),
            unitType: String(fd.get("unit_type")) as UnitType,
            city: String(fd.get("city") ?? ""),
          });
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Nova unidade</h2>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Nome
        <input
          name="name"
          required
          placeholder="Ex.: Posto BR-101 km 42"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Tipo
        <select
          name="unit_type"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        >
          {types.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Cidade (opcional)
        <input
          name="city"
          placeholder="Ex.: São Paulo"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Adicionar unidade"}
      </button>
    </form>
  );
}
