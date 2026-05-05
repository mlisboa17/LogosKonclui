import Link from "next/link";
import { notFound } from "next/navigation";
import { getPainelContext } from "@/lib/painel-context";
import { getSessionContext } from "@/lib/data/memberships";
import { RunExecutionClient } from "@/components/painel/RunExecutionClient";

type Params = { id: string };

export default async function ExecucaoPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const p = await getPainelContext();

  if (p.mode === "json") {
    if (!p.orgId) notFound();
    const bundle = p.queries.getRun(p.orgId, id);
    if (!bundle) notFound();
    const { run, checklist, unit, items, responses } = bundle;
    const itemsUi = items.map((i) => ({
      id: i.id,
      title: i.title,
      is_critical: i.isCritical,
      item_type: i.itemType,
    }));
    const responsesUi = responses.map((r) => ({
      checklist_item_id: r.checklistItemId,
      completed: r.completed,
      numeric_value: r.numericValue ?? null,
      text_value: r.textValue ?? null,
      photo_path: r.photoPath ?? null,
    }));
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/operador"
            className="font-medium text-emerald-800 hover:underline dark:text-emerald-400"
          >
            ← Modo operador
          </Link>
          <Link href="/painel/minhas-tarefas" className="text-zinc-500 hover:underline">
            Lista no painel
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">{checklist?.name ?? "Execução"}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {unit?.name ?? "Unidade"} · Prazo: {new Date(run.dueAt).toLocaleString("pt-BR")}
        </p>
        <div className="mt-8">
          <RunExecutionClient
            runId={run.id}
            organizationId={p.orgId}
            status={run.status}
            items={itemsUi}
            responses={responsesUi}
            usePhotoStorage={false}
          />
        </div>
      </div>
    );
  }

  const supabase = p.supabase;
  if (!supabase) notFound();

  const ctx = await getSessionContext(supabase);
  if (!ctx.organizations.length) notFound();

  const orgId = ctx.organizations[0].id;

  const { data: run, error } = await supabase
    .from("checklist_runs")
    .select("id, status, due_at, checklist_id, organization_id, units(name), checklists(name)")
    .eq("id", id)
    .single();

  if (error || !run || run.organization_id !== orgId) notFound();

  const { data: items } = await supabase
    .from("checklist_items")
    .select("id, title, is_critical, item_type, sort_order")
    .eq("checklist_id", run.checklist_id)
    .order("sort_order", { ascending: true });

  const { data: responses } = await supabase
    .from("checklist_run_responses")
    .select("checklist_item_id, completed, numeric_value, text_value, photo_path")
    .eq("run_id", id);

  const un = run.units as unknown as { name: string } | null;
  const cl = run.checklists as unknown as { name: string } | null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/operador"
          className="font-medium text-emerald-800 hover:underline dark:text-emerald-400"
        >
          ← Modo operador
        </Link>
        <Link href="/painel/minhas-tarefas" className="text-zinc-500 hover:underline">
          Lista no painel
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">{cl?.name ?? "Execução"}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {un?.name ?? "Unidade"} · Prazo: {new Date(run.due_at).toLocaleString("pt-BR")}
      </p>
      <div className="mt-8">
        <RunExecutionClient
          runId={run.id}
          organizationId={orgId}
          status={run.status}
          items={items ?? []}
          responses={responses ?? []}
          usePhotoStorage
        />
      </div>
    </div>
  );
}
