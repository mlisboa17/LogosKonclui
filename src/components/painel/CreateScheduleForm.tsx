"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSchedule } from "@/actions/schedules";

const dayOpts: { value: number; label: string }[] = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

export function CreateScheduleForm({
  checklists,
  canManage = true,
}: {
  checklists: { id: string; name: string }[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  function toggleDay(v: number) {
    setDays((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v].sort((a, b) => a - b)));
  }

  if (!checklists.length) {
    return <p className="text-sm text-zinc-500">Publique pelo menos um checklist na aba Checklists.</p>;
  }

  if (!canManage) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Sem permissão para criar agendamentos. Apenas quem tem permissão de agendamentos pode definir
        recorrência (Conta → permissões).
      </p>
    );
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await createSchedule({
            checklistId: String(fd.get("checklist_id")),
            timeLocal: String(fd.get("time_local")),
            daysOfWeek: days,
          });
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <h2 className="text-sm font-semibold">Novo agendamento</h2>
      <p className="text-xs text-zinc-500">
        Gera uma execução por dia nos dias marcados, à hora indicada (fuso{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">SCHEDULE_TIMEZONE</code>, padrão
        América/São_Paulo).
      </p>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Checklist
        <select
          name="checklist_id"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        >
          {checklists.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Hora local
        <input
          name="time_local"
          type="time"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
      <fieldset>
        <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dias da semana</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {dayOpts.map((d) => (
            <label key={d.value} className="flex cursor-pointer items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={days.includes(d.value)}
                onChange={() => toggleDay(d.value)}
                className="accent-emerald-700"
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "A guardar…" : "Guardar agendamento"}
      </button>
    </form>
  );
}
