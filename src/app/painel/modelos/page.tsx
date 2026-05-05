import Link from "next/link";
import { SeedTemplatesButton } from "@/components/painel/SeedTemplatesButton";
import { getPainelContext } from "@/lib/painel-context";
import { getSessionContext } from "@/lib/data/memberships";
import { assertOrgManagementPermission } from "@/lib/org-access";

export default async function ModelosPage() {
  const p = await getPainelContext();

  if (p.mode === "json") {
    if (!p.orgId) return <p className="text-sm text-zinc-600">Estado JSON inválido.</p>;
    const templates = p.queries.templates(p.orgId);
    const countMap = p.queries.templateItemCounts(p.orgId);
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Modelos</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Modelos reutilizáveis para abertura, fechamento, turno de bombas, etc.
            </p>
          </div>
          <SeedTemplatesButton organizationId={p.orgId} />
        </div>
        <ul className="mt-8 space-y-3">
          {templates.length ? (
            templates.map((t) => (
              <li
                key={t.id}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-zinc-500">
                      {t.sector ?? "Setor não informado"} · {countMap.get(t.id) ?? 0} itens
                    </p>
                    {t.description && (
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.description}</p>
                    )}
                  </div>
                  <Link
                    href={`/painel/modelos/${t.id}`}
                    className="shrink-0 text-sm text-emerald-800 hover:underline dark:text-emerald-400"
                  >
                    Ver
                  </Link>
                </div>
              </li>
            ))
          ) : (
            <li className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
              Nenhum modelo. Use o botão acima para importar exemplos (conveniência, posto, restaurante).
            </li>
          )}
        </ul>
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
  const tplGate = await assertOrgManagementPermission(supabase, orgId, "manage_templates");
  const canManageTemplates = "ok" in tplGate;

  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("id, name, sector, description")
    .eq("organization_id", orgId)
    .order("name");

  const tplIds = (templates ?? []).map((t: { id: string }) => t.id);
  const { data: itemsByTpl } =
    tplIds.length > 0
      ? await supabase.from("checklist_template_items").select("template_id, id").in("template_id", tplIds)
      : { data: [] as { template_id: string; id: string }[] };

  const countMap = new Map<string, number>();
  for (const row of itemsByTpl ?? []) {
    countMap.set(row.template_id, (countMap.get(row.template_id) ?? 0) + 1);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Modelos</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Modelos reutilizáveis para abertura, fechamento, turno de bombas, etc.
          </p>
        </div>
        {canManageTemplates ? (
          <SeedTemplatesButton organizationId={orgId} />
        ) : (
          <span className="text-xs text-zinc-500">Sem permissão para importar modelos.</span>
        )}
      </div>
      <ul className="mt-8 space-y-3">
        {templates?.length ? (
          templates.map((t: { id: string; name: string; sector: string | null; description: string | null }) => (
            <li
              key={t.id}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-zinc-500">
                    {t.sector ?? "Setor não informado"} · {countMap.get(t.id) ?? 0} itens
                  </p>
                  {t.description && (
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t.description}</p>
                  )}
                </div>
                <Link
                  href={`/painel/modelos/${t.id}`}
                  className="shrink-0 text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-400"
                >
                  {canManageTemplates ? "Editar" : "Ver"}
                </Link>
              </div>
            </li>
          ))
        ) : (
          <li className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nenhum modelo. Use o botão acima para importar exemplos (conveniência, posto, restaurante).
          </li>
        )}
      </ul>
    </div>
  );
}
