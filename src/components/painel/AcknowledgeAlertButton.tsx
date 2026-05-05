"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeAlert } from "@/actions/alerts";

export function AcknowledgeAlertButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const r = await acknowledgeAlert(alertId);
          if ("error" in r && r.error) alert(r.error);
          else router.refresh();
        });
      }}
      className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {pending ? "…" : "Reconhecer"}
    </button>
  );
}
