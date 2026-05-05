import Link from "next/link";
import { ExportRunsButton } from "@/components/painel/ExportRunsButton";
import { OpenAlertsSection } from "@/components/painel/OpenAlertsSection";
import { PainelKpiCards } from "@/components/painel/PainelKpiCards";
import { UnitFilterPills } from "@/components/painel/UnitFilterPills";
import { getSessionContext } from "@/lib/data/memberships";
import { computePainelKpisJson, fetchPainelKpisSupabase } from "@/lib/painel-kpis";
import { getPainelContext } from "@/lib/painel-context";

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ unidade?: string }>;
}) {
  const sp = await searchParams;
  const rawUnit = typeof sp.unidade === "string" ? sp.unidade.trim() : "";

  const ctx = await getPainelContext();

  if (ctx.mode === "json") {
    if (!ctx.orgId) {
      return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600">Estado JSON inválido. Apague data/prototype-state.json e recarregue.</p>
        </div>
      );
    }
    const { unitCount, templateCount, runOpen } = ctx.queries.counts(ctx.orgId);
    const unitsJson = ctx.queries.units(ctx.orgId).map((u) => ({ id: u.id, name: u.name }));
    const unitValidJson =
      rawUnit && unitsJson.some((u) => u.id === rawUnit) ? rawUnit : null;
    const kpis = computePainelKpisJson(ctx.queries.state, ctx.orgId, {
      unitId: unitValidJson,
    });
    const cards = [
      { label: "Unidades", value: unitCount, href: "/painel/unidades" },
      { label: "Modelos de checklist", value: templateCount, href: "/painel/modelos" },
      { label: "Execuções em aberto", value: runOpen, href: "/painel/minhas-tarefas" },
    ];
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {ctx.orgName} — modo protótipo (arquivo JSON, sem custos de API).
            </p>
            <UnitFilterPills units={unitsJson} selectedId={unitValidJson} />
          </div>
          <ExportRunsButton organizationId={ctx.orgId} />
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className="block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800"
              >
                <p className="text-3xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-400">
                  {c.value}
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{c.label}</p>
              </Link>
            </li>
          ))}
        </ul>
        <PainelKpiCards k={kpis} />
        <section className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Sem WhatsApp neste modo</h2>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            APIs oficiais de WhatsApp costumam ter custo por conversa ou mensagem. Para protótipo sem verba, use só o
            painel e e-mail gratuito depois, ou um bot no Telegram (grátis para uso básico).
          </p>
        </section>
      </div>
    );
  }

  const supabase = ctx.supabase;
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">Configure o Supabase ou use modo JSON</p>
        <p className="mt-2 text-amber-900/80 dark:text-amber-100/80">
          Opção A: crie <code className="rounded bg-black/10 px-1">.env.local</code> com{" "}
          <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
          <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
        <p className="mt-2 text-amber-900/80 dark:text-amber-100/80">
          Opção B (sem banco): adicione{" "}
          <code className="rounded bg-black/10 px-1">NEXT_PUBLIC_DATA_MODE=json</code> e reinicie o servidor.
        </p>
      </div>
    );
  }

  const session = await getSessionContext(supabase);

  if (!session.user) {
    return null;
  }

  if (!session.organizations.length) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold">Bem-vindo</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Crie uma organização para cadastrar unidades, modelos de checklist e acompanhar execuções.
        </p>
        <Link
          href="/painel/organizacao/nova"
          className="mt-6 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Criar organização
        </Link>
      </div>
    );
  }

  const orgId = session.organizations[0].id;

  const { data: unitsRows } = await supabase
    .from("units")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");
  const unitsList = (unitsRows ?? []) as { id: string; name: string }[];
  const unitValid =
    rawUnit && unitsList.some((u) => u.id === rawUnit) ? rawUnit : null;

  const [{ count: unitCount }, { count: templateCount }, { count: runOpen }] = await Promise.all([
    supabase.from("units").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase
      .from("checklist_templates")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("checklist_runs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["scheduled", "in_progress", "late"]),
  ]);

  const cards = [
    { label: "Unidades", value: unitCount ?? 0, href: "/painel/unidades" },
    { label: "Modelos de checklist", value: templateCount ?? 0, href: "/painel/modelos" },
    { label: "Execuções em aberto", value: runOpen ?? 0, href: "/painel/minhas-tarefas" },
  ];

  const kpis = await fetchPainelKpisSupabase(supabase, orgId, { unitId: unitValid });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {session.organizations[0].name} — conveniência, posto e restaurante no mesmo padrão.
          </p>
          <UnitFilterPills units={unitsList} selectedId={unitValid} />
        </div>
        <ExportRunsButton organizationId={orgId} />
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800"
            >
              <p className="text-3xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-400">
                {c.value}
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">{c.label}</p>
            </Link>
          </li>
        ))}
      </ul>
      <PainelKpiCards k={kpis} />
      <OpenAlertsSection organizationId={orgId} />
      <section className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Próximos passos</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Cadastre unidades por tipo (conveniência, posto, restaurante).</li>
          <li>Crie ou importe modelos de checklist na aba Modelos.</li>
          <li>Publique checklists por unidade e abra execuções com prazo.</li>
          <li>
            Use a aba <Link href="/painel/equipe" className="text-emerald-800 underline dark:text-emerald-400">Equipe</Link>{" "}
            para pontualidade e{" "}
            <Link href="/painel/telegram" className="text-emerald-800 underline dark:text-emerald-400">Telegram</Link>{" "}
            para alertas sem custo de WhatsApp API.
          </li>
        </ol>
      </section>
    </div>
  );
}
