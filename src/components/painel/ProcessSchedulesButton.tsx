"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runScheduleJobForCurrentUser } from "@/actions/schedule-job";

export function ProcessSchedulesButton({ canRun = true }: { canRun?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (!canRun) {
    return (
      <p className="text-xs text-zinc-500">
        O botão “processar agendamentos” requer permissão de gestão de agendamentos.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const r = await runScheduleJobForCurrentUser();
            const err = r.errors.length ? ` Avisos: ${r.errors.join("; ")}` : "";
            setMsg(`Execuções criadas: ${r.runsCreated}. Alertas de atraso: ${r.lateAlerts}.${err}`);
            router.refresh();
          });
        }}
        className="w-fit rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "A processar…" : "Processar agendamentos agora"}
      </button>
      {msg && <p className="max-w-xl text-sm text-zinc-700 dark:text-zinc-300">{msg}</p>}
    </div>
  );
}
