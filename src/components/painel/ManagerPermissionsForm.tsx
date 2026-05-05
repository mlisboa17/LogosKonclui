"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationManagerPermissions } from "@/actions/org-settings";
import type { ManagerPermissionKey, ManagerPermissions } from "@/lib/org-access";

const LABELS: Record<ManagerPermissionKey, string> = {
  manage_units: "Gerir unidades (criar, editar, apagar)",
  manage_team: "Gerir equipa (adicionar, funções, remover)",
  manage_templates: "Gerir modelos de checklist",
  manage_checklists: "Publicar checklists a partir de modelos",
  manage_schedules: "Gerir agendamentos",
  view_equipe_score: "Ver métricas da equipa (página Equipe)",
  manage_org_settings: "Aceder a Configuração (nome da org. e estas opções)",
};

const ORDER: ManagerPermissionKey[] = [
  "manage_units",
  "manage_team",
  "manage_templates",
  "manage_checklists",
  "manage_schedules",
  "view_equipe_score",
  "manage_org_settings",
];

export function ManagerPermissionsForm({
  organizationId,
  initial,
}: {
  organizationId: string;
  initial: ManagerPermissions;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<ManagerPermissions>(initial);

  function toggle(key: ManagerPermissionKey) {
    setState((s) => ({ ...s, [key]: !s[key] }));
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await updateOrganizationManagerPermissions({
            organizationId,
            permissions: state,
          });
          if ("error" in res && res.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        O que o gestor pode fazer
      </h2>
      <p className="text-xs text-zinc-500">
        O proprietário mantém acesso total. Ajuste o que os utilizadores com função <strong>gestor</strong>{" "}
        podem fazer no painel.
      </p>
      <ul className="space-y-3">
        {ORDER.map((key) => (
          <li key={key} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={key}
              checked={state[key]}
              onChange={() => toggle(key)}
              className="mt-1 accent-emerald-700"
            />
            <label htmlFor={key} className="text-sm text-zinc-800 dark:text-zinc-200">
              {LABELS[key]}
            </label>
          </li>
        ))}
      </ul>
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
        {pending ? "Guardando…" : "Guardar permissões"}
      </button>
    </form>
  );
}
