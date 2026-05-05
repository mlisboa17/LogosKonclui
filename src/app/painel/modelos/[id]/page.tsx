import Link from "next/link";
import { notFound } from "next/navigation";
import { TemplateEditorClient } from "@/components/painel/TemplateEditorClient";
import { getPainelContext } from "@/lib/painel-context";
import { getSessionContext } from "@/lib/data/memberships";
import { assertOrgManagementPermission } from "@/lib/org-access";
import type { TemplateItemInput } from "@/actions/template-edit";
import { createClient } from "@/lib/supabase/server";

type Params = { id: string };

export default async function ModeloEditPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const p = await getPainelContext();

  if (p.mode === "json") {
    if (!p.orgId) notFound();
    const tpl = p.queries.templates(p.orgId).find((t) => t.id === id);
    if (!tpl) notFound();
    const items = p.queries.state.checklistTemplateItems
      .filter((i) => i.templateId === id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return (
      <div>
        <Link
          href="/painel/modelos"
          className="mb-6 inline-block text-sm text-emerald-800 hover:underline dark:text-emerald-400"
        >
          ← Modelos
        </Link>
        <h1 className="text-2xl font-semibold">{tpl.name}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{tpl.description ?? tpl.sector}</p>
        <ul className="mt-6 list-decimal space-y-2 pl-6 text-sm text-zinc-800 dark:text-zinc-200">
          {items.map((it) => (
            <li key={it.id}>
              {it.title}{" "}
              <span className="text-zinc-500">
                ({it.itemType}
                {it.isCritical ? ", crítico" : ""})
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-8 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          Modo protótipo JSON: vista só leitura. Para editar modelos na base de dados, use Supabase (
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">NEXT_PUBLIC_DATA_MODE</code> sem{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">json</code>).
        </p>
      </div>
    );
  }

  const supabase = p.supabase ?? (await createClient());
  if (!supabase) {
    return (
      <p className="text-sm text-zinc-600">
        Configure o Supabase ou use <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">NEXT_PUBLIC_DATA_MODE=json</code>.
      </p>
    );
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

  const { data: tpl, error } = await supabase
    .from("checklist_templates")
    .select("id, name, sector, description, organization_id")
    .eq("id", id)
    .single();

  if (error || !tpl || tpl.organization_id !== orgId) notFound();

  const tplGate = await assertOrgManagementPermission(supabase, orgId, "manage_templates");
  const canEdit = "ok" in tplGate;

  const { data: itemRows } = await supabase
    .from("checklist_template_items")
    .select("title, item_type, is_critical, weight, sort_order")
    .eq("template_id", id)
    .order("sort_order", { ascending: true });

  const initialItems: TemplateItemInput[] = (itemRows ?? []).map((r) => ({
    title: r.title as string,
    item_type: r.item_type as TemplateItemInput["item_type"],
    is_critical: Boolean(r.is_critical),
    weight: (r.weight as number) ?? 1,
  }));

  return (
    <div>
      <Link
        href="/painel/modelos"
        className="mb-6 inline-block text-sm text-emerald-800 hover:underline dark:text-emerald-400"
      >
        ← Modelos
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">{canEdit ? "Editar modelo" : "Modelo"}</h1>
      <p className="mb-8 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Tipos de item (como no Koncluí): <strong>Sim/Não</strong>, <strong>número</strong> (temperaturas,
        contagens), <strong>texto</strong> e <strong>foto</strong> (evidência). Crítico aumenta peso nos
        alertas; o gestor pode renomear itens e republicar o checklist na unidade quando quiser.
      </p>

      {canEdit ? (
        <TemplateEditorClient
          organizationId={orgId}
          templateId={id}
          initialName={tpl.name}
          initialSector={tpl.sector ?? ""}
          initialDescription={tpl.description ?? ""}
          initialItems={initialItems}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Vista só leitura: precisa de permissão para gerir modelos (proprietário ou gestor autorizado em
            Conta → permissões).
          </div>
          <ul className="list-decimal space-y-2 pl-6 text-sm text-zinc-800 dark:text-zinc-200">
            {initialItems.map((it, i) => (
              <li key={`${it.title}-${i}`}>
                {it.title}{" "}
                <span className="text-zinc-500">
                  ({it.item_type}
                  {it.is_critical ? ", crítico" : ""})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
