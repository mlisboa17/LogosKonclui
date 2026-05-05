import Link from "next/link";
import { CreateUnitForm } from "@/components/painel/CreateUnitForm";
import { UnitRowEditor } from "@/components/painel/UnitRowEditor";
import { getPainelContext } from "@/lib/painel-context";
import { getSessionContext } from "@/lib/data/memberships";
import { assertOrgManagementPermission } from "@/lib/org-access";

export default async function UnidadesPage() {
  const p = await getPainelContext();

  if (p.mode === "json") {
    if (!p.orgId) {
      return <p className="text-sm text-zinc-600">Estado JSON inválido.</p>;
    }
    const units = p.queries.units(p.orgId);
    return (
      <div>
        <h1 className="text-2xl font-semibold">Unidades</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Cadastre cada loja de conveniência, posto ou restaurante do grupo.
        </p>
        <ul className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {units.length ? (
            units.map((u) => (
              <li key={u.id}>
                <UnitRowEditor
                  organizationId={p.orgId}
                  unit={{
                    id: u.id,
                    name: u.name,
                    unit_type: u.unitType,
                    city: u.city ?? null,
                  }}
                  canManage
                />
              </li>
            ))
          ) : (
            <li className="px-4 py-8 text-center text-sm text-zinc-500">Nenhuma unidade ainda.</li>
          )}
        </ul>
        <CreateUnitForm organizationId={p.orgId} />
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
        </Link>{" "}
        primeiro.
      </p>
    );
  }

  const orgId = ctx.organizations[0].id;
  const gate = await assertOrgManagementPermission(supabase, orgId, "manage_units");
  const canManageUnits = "ok" in gate;

  const { data: units } = await supabase
    .from("units")
    .select("id, name, unit_type, city")
    .eq("organization_id", orgId)
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Unidades</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Cadastre cada loja de conveniência, posto ou restaurante do grupo (empresa / ponto de venda).
      </p>
      {!canManageUnits && (
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
          Vista só leitura: apenas proprietário, gestor autorizado ou conta com permissão de unidades pode
          alterar.
        </p>
      )}
      <ul className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {units?.length ? (
          units.map((u: { id: string; name: string; unit_type: string; city: string | null }) => (
            <li key={u.id}>
              <UnitRowEditor organizationId={orgId} unit={u} canManage={canManageUnits} />
            </li>
          ))
        ) : (
          <li className="px-4 py-8 text-center text-sm text-zinc-500">Nenhuma unidade ainda.</li>
        )}
      </ul>
      {canManageUnits && <CreateUnitForm organizationId={orgId} />}
    </div>
  );
}
