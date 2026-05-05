"use client";

import { useTransition } from "react";
import { exportRunsCsvAction } from "@/actions/export-runs";

export function ExportRunsButton({ organizationId }: { organizationId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await exportRunsCsvAction(organizationId);
          if (!r.ok) {
            alert(r.error);
            return;
          }
          const blob = new Blob([r.csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = r.filename;
          a.click();
          URL.revokeObjectURL(url);
        })
      }
      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {pending ? "A exportar…" : "Exportar execuções (CSV)"}
    </button>
  );
}
