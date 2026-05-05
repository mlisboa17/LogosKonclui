"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addOrganizationMember,
  addOrganizationMemberByUserId,
  removeOrganizationMember,
  updateOrganizationMemberRole,
  type MemberRole,
} from "@/actions/team";
import type { OrgRole } from "@/lib/org-access";

const roleLabel: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gestor",
  operator: "Operador",
};

export function TeamMembersClient({
  organizationId,
  members,
  actorUserId,
  actorRole,
  canManageTeam,
}: {
  organizationId: string;
  members: {
    userId: string;
    fullName: string;
    role: OrgRole;
  }[];
  actorUserId: string;
  actorRole: OrgRole | null;
  canManageTeam: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<MemberRole>("operator");
  const [uuid, setUuid] = useState("");
  const [showUuid, setShowUuid] = useState(false);

  const isOwner = actorRole === "owner";

  return (
    <div className="space-y-8">
      {canManageTeam && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Cadastro de operadores (e restante equipa)
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Um <strong>operador</strong> é um utilizador que já existe no sistema: primeiro cria conta em{" "}
            <strong>Cadastrar</strong> (site) ou recebe convite; depois o gestor acrescenta aqui pelo{" "}
            <strong>email</strong> e escolhe a função &quot;Operador&quot;. Com{" "}
            <code className="rounded bg-zinc-100 px-0.5 dark:bg-zinc-800">SUPABASE_SERVICE_ROLE_KEY</code> pode
            enviar convite por email mesmo sem conta prévia.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Função <strong>proprietário</strong> só o proprietário atual pode atribuir.
          </p>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await addOrganizationMember({
                  organizationId,
                  email,
                  role: newRole,
                });
                if ("error" in res && res.error) setError(res.error);
                else {
                  setEmail("");
                  router.refresh();
                }
              });
            }}
          >
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Função
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as MemberRole)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              >
                <option value="operator">Operador</option>
                <option value="manager">Gestor</option>
                {isOwner && <option value="owner">Proprietário</option>}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Adicionar
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowUuid((s) => !s)}
            className="mt-3 text-xs text-zinc-500 underline"
          >
            {showUuid ? "Ocultar" : "Avançado: adicionar por UUID do utilizador"}
          </button>

          {showUuid && (
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                start(async () => {
                  const res = await addOrganizationMemberByUserId({
                    organizationId,
                    userId: uuid,
                    role: newRole,
                  });
                  if ("error" in res && res.error) setError(res.error);
                  else {
                    setUuid("");
                    router.refresh();
                  }
                });
              }}
            >
              <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
                UUID (Supabase Auth)
                <input
                  value={uuid}
                  onChange={(e) => setUuid(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
              >
                Adicionar por UUID
              </button>
            </form>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </section>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Função</th>
              {canManageTeam && <th className="px-4 py-3 font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {m.fullName}
                  {m.userId === actorUserId && (
                    <span className="ml-2 text-xs font-normal text-zinc-400">(você)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {canManageTeam ? (
                    <select
                      value={m.role}
                      disabled={pending || (m.role === "owner" && !isOwner)}
                      onChange={(e) => {
                        const next = e.target.value as MemberRole;
                        start(async () => {
                          const res = await updateOrganizationMemberRole({
                            organizationId,
                            userId: m.userId,
                            role: next,
                          });
                          if ("error" in res && res.error) setError(res.error);
                          else router.refresh();
                        });
                      }}
                      className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                    >
                      <option value="operator">{roleLabel.operator}</option>
                      <option value="manager">{roleLabel.manager}</option>
                      {(isOwner || m.role === "owner") && (
                        <option value="owner">{roleLabel.owner}</option>
                      )}
                    </select>
                  ) : (
                    roleLabel[m.role] ?? m.role
                  )}
                </td>
                {canManageTeam && (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={pending || m.userId === actorUserId}
                      onClick={() => {
                        if (!confirm("Remover este membro da organização?")) return;
                        start(async () => {
                          const res = await removeOrganizationMember({
                            organizationId,
                            userId: m.userId,
                          });
                          if ("error" in res && res.error) setError(res.error);
                          else router.refresh();
                        });
                      }}
                      className="text-sm text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
