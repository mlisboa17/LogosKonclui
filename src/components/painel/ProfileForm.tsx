"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile } from "@/actions/profile";

export function ProfileForm({
  initialFullName,
  initialPhone,
}: {
  initialFullName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);

  return (
    <form
      className="max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await updateMyProfile({ fullName, phone });
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Meu perfil</h2>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Nome completo
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Telefone (opcional)
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+351 …"
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
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}
