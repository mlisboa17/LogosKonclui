import Link from "next/link";
import { ChecklistPublishingTabs } from "@/components/painel/ChecklistPublishingTabs";
import { CreateRunForm } from "@/components/painel/CreateRunForm";
import { getSessionContext } from "@/lib/data/memberships";
import { getPainelContext } from "@/lib/painel-context";
import { assertOrgManagementPermission } from "@/lib/org-access";

export default async function ChecklistsPage() {
  const p = await getPainelContext();

  if (p.mode === "json") {
    if (!p.orgId) return <p className="text-sm text-zinc-600">Estado JSON inválido.</p>;
    const units = p.queries.units(p.orgId).map((u) => ({ id: u.id, name: u.name }));
    const templates = p.queries.templates(p.orgId).map((t) => ({ id: t.id, name: t.name }));
    const checklists = p.queries.checklists(p.orgId).map((c) => ({
      id: c.id,
      name: c.name,
      unit_id: c.unitId,
    }));
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-2xl font-semibold">Checklists</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Organização do espaço de venda: publique rotinas por unidade (modelo, do zero ou cópia). Em cada
            item pode exigir foto como evidência — ideal para freezers, gôndolas e limpeza.
          </p>
        </div>
        <ChecklistPublishingTabs
          organizationId={p.orgId}
          units={units}
          templates={templates}
          published={checklists}
          canPublish
        />
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Publicados</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {checklists.length ? (
              checklists.map((c) => (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <span className="font-medium">{c.name}</span>
                  {c.unit_id && (
                    <span className="text-zinc-500">
                      {" "}
                      · unidade {units.find((u) => u.id === c.unit_id)?.name ?? c.unit_id.slice(0, 8)}
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">Nenhum checklist publicado.</li>
            )}
          </ul>
        </div>
        <CreateRunForm organizationId={p.orgId} checklists={checklists} />
      </div>
    );
  }

  const supabase = p.supabase;
  if (!supabase) {
    return <p className="text-sm text-zinc-600">Configure o Supabase ou use NEXT_PUBLIC_DATA_MODE=json.</p>;
  }

  const ctx = await getSessionContext(supabase);
  if (!ctx.organizations.length) {
    return (
      <p className="text-sm">
        <Link href="/painel/organizacao/nova" className="text-emerald-700 underline dark:text-emerald-400">
          Crie uma organização
        </Link>
        .
      </p>
    );
  }

  const orgId = ctx.organizations[0].id;

  const publishGate = await assertOrgManagementPermission(supabase, orgId, "manage_checklists");
  const canPublishChecklists = "ok" in publishGate;

  const [{ data: units }, { data: templates }, { data: checklists }, { data: memRows }] = await Promise.all([
    supabase.from("units").select("id, name").eq("organization_id", orgId).order("name"),
    supabase.from("checklist_templates").select("id, name").eq("organization_id", orgId).order("name"),
    supabase.from("checklists").select("id, name, unit_id").eq("organization_id", orgId).order("name"),
    supabase.from("organization_members").select("user_id").eq("organization_id", orgId),
  ]);

  const memberIds = [...new Set((memRows ?? []).map((m: { user_id: string }) => m.user_id))];
  const profs =
    memberIds.length > 0
      ? (await supabase.from("profiles").select("id, full_name").in("id", memberIds)).data
      : [];
  const assignees = memberIds.map((id) => {
    const fn = (profs ?? []).find((p: { id: string }) => p.id === id)?.full_name as string | undefined;
    const name = fn?.trim();
    return { id, name: name || `Utilizador ${id.slice(0, 8)}…` };
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Checklists</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Rotinas por unidade: abastecimento de freezers e cervejeiras, prateleiras, expositores, limpeza e
          padrão de loja. Crie do zero, a partir de modelo ou copiando um checklist já publicado — com opção de
          exigir foto em cada linha.
        </p>
      </div>
      <ChecklistPublishingTabs
        organizationId={orgId}
        units={units ?? []}
        templates={templates ?? []}
        published={checklists ?? []}
        canPublish={canPublishChecklists}
      />
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Publicados</h2>
        <ul className="mt-3 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {checklists?.length ? (
            checklists.map((c: { id: string; name: string; unit_id: string | null }) => (
              <li key={c.id} className="px-4 py-3 text-sm">
                <span className="font-medium">{c.name}</span>
                {c.unit_id && (
                  <span className="text-zinc-500">
                    {" "}
                    · unidade{" "}
                    {(units ?? []).find((u: { id: string; name: string }) => u.id === c.unit_id)?.name ??
                      c.unit_id.slice(0, 8)}
                  </span>
                )}
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-sm text-zinc-500">Nenhum checklist publicado.</li>
          )}
        </ul>
      </div>
      <CreateRunForm organizationId={orgId} checklists={checklists ?? []} assignees={assignees} />
    </div>
  );
}
