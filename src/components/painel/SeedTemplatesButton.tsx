"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedDemoTemplates } from "@/actions/checklists";

export function SeedTemplatesButton({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await seedDemoTemplates(organizationId);
          router.refresh();
        });
      }}
      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
    >
      {pending ? "Importando…" : "Importar modelos de exemplo"}
    </button>
  );
}
