"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationName } from "@/actions/org-settings";

export function OrgNameForm({
  organizationId,
  initialName,
}: {
  organizationId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialName);

  return (
    <form
      className="max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await updateOrganizationName({ organizationId, name });
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Organização</h2>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Nome do grupo / empresa
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-950"
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
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
      >
        {pending ? "Guardando…" : "Atualizar nome"}
      </button>
    </form>
  );
}
