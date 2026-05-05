import Link from "next/link";
import { TeamMembersClient } from "@/components/painel/TeamMembersClient";
import { getPainelContext } from "@/lib/painel-context";
import { getSessionContext } from "@/lib/data/memberships";
import { fetchTeamScoresSupabase } from "@/lib/painel-team-score";
import {
  assertOrgManagementPermission,
  canUseManagerPermission,
  fetchOrganizationSettings,
  getMembershipRole,
  type OrgRole,
} from "@/lib/org-access";

export default async function EquipePage() {
  const p = await getPainelContext();

  if (p.mode === "json") {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipe e score</h1>
        <p className="mt-2 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
          No modo protótipo (JSON) não há membros nem atribuições por utilizador. Use Supabase para ver
          pontualidade por colaborador (como no Koncluí), com execuções atribuídas.
        </p>
        <Link href="/painel" className="mt-6 inline-block text-sm text-emerald-800 hover:underline dark:text-emerald-400">
          ← Visão geral
        </Link>
      </div>
    );
  }

  const supabase = p.supabase;
  if (!supabase) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Configure o Supabase para ver a equipa.
      </p>
    );
  }

  const ctx = await getSessionContext(supabase);
  if (!ctx.organizations.length || !ctx.user) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Crie uma organização primeiro.
      </p>
    );
  }

  const orgId = ctx.organizations[0].id;
  const role = await getMembershipRole(supabase, orgId, ctx.user.id);
  const settings = await fetchOrganizationSettings(supabase, orgId);

  const canViewScore =
    role === "owner" ||
    role === "operator" ||
    (role === "manager" && canUseManagerPermission("manager", "view_equipe_score", settings));

  const teamGate = await assertOrgManagementPermission(supabase, orgId, "manage_team");
  const canManageTeam = "ok" in teamGate;

  const { data: memRows } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", orgId);

  const userIds = [...new Set((memRows ?? []).map((r) => r.user_id as string))];
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };

  const nameById = new Map((profiles ?? []).map((pr) => [pr.id as string, pr.full_name as string]));

  const members = (memRows ?? []).map((m) => ({
    userId: m.user_id as string,
    fullName: nameById.get(m.user_id as string)?.trim() || `Utilizador ${(m.user_id as string).slice(0, 8)}…`,
    role: m.role as OrgRole,
  }));

  const rows = canViewScore ? await fetchTeamScoresSupabase(supabase, orgId) : [];

  return (
    <div>
      <Link href="/painel" className="mb-6 inline-block text-sm text-emerald-800 hover:underline dark:text-emerald-400">
        ← Visão geral
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Perfis, funções na organização e pontuação de pontualidade (Koncluí).
      </p>

      <div className="mt-10 space-y-10">
        <TeamMembersClient
          organizationId={orgId}
          members={members}
          actorUserId={ctx.user.id}
          actorRole={role}
          canManageTeam={canManageTeam}
        />

        {canViewScore ? (
          <>
            <h2 className="text-lg font-semibold">Pontualidade (30 dias)</h2>
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Colaborador</th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Função</th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Execuções</th>
                    <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Pontualidade</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.userId} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{r.displayName}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{r.role}</td>
                      <td className="px-4 py-3 tabular-nums text-zinc-700 dark:text-zinc-300">{r.runsConsidered}</td>
                      <td className="px-4 py-3 tabular-nums text-emerald-800 dark:text-emerald-400">
                        {r.punctualityPct != null ? `${r.punctualityPct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500">
              Atribua execuções a utilizadores para preencher a pontuação.
            </p>
          </>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            O proprietário desativou a visualização da pontuação para gestores. Operadores e proprietários
            continuam a ver os dados aplicáveis.
          </p>
        )}
      </div>
    </div>
  );
}
