"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChecklistRun } from "@/actions/runs";

type Checklist = { id: string; name: string };

export function CreateRunForm({
  organizationId,
  checklists,
  assignees,
}: {
  organizationId: string;
  checklists: (Checklist & { unit_id: string | null })[];
  /** Supabase: membros para atribuir a execução (estilo Koncluí) */
  assignees?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!checklists.length) {
    return null;
  }

  return (
    <form
      className="flex max-w-lg flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      action={(fd) => {
        setError(null);
        start(async () => {
          const checklistId = String(fd.get("checklist_id"));
          const dueLocal = String(fd.get("due_at"));
          const cl = checklists.find((c) => c.id === checklistId);
          if (!cl?.unit_id) {
            setError("Checklist sem unidade.");
            return;
          }
          const assignRaw = String(fd.get("assigned_user_id") ?? "").trim();
          const res = await createChecklistRun({
            organizationId,
            unitId: cl.unit_id,
            checklistId,
            dueAtIso: new Date(dueLocal).toISOString(),
            assignedUserId: assignRaw || null,
          });
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <h2 className="text-sm font-semibold">Nova execução (prazo)</h2>
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
        Prazo (data e hora local)
        <input
          name="due_at"
          type="datetime-local"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
      {assignees?.length ? (
        <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Responsável (opcional)
          <select
            name="assigned_user_id"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base normal-case dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="">— Equipa (sem atribuição) —</option>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
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
        {pending ? "Agendando…" : "Abrir execução"}
      </button>
    </form>
  );
}
