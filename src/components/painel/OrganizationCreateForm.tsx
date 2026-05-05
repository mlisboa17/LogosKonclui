"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/actions/organizations";

export function OrganizationCreateForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mx-auto flex max-w-md flex-col gap-4"
      action={(fd) => {
        setError(null);
        start(async () => {
          const name = String(fd.get("name") ?? "");
          const res = await createOrganization(name);
          if ("error" in res && res.error) setError(res.error);
          else router.push("/painel");
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nome do grupo / empresa
        <input
          name="name"
          required
          placeholder="Ex.: Grupo Logos"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
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
        className="rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Criar organização"}
      </button>
    </form>
  );
}
