import Link from "next/link";
import { getPainelContext } from "@/lib/painel-context";
import { getSessionContext } from "@/lib/data/memberships";

const statusPt: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em andamento",
  completed: "Concluído",
  late: "Atrasado",
  missed: "Perdido",
};

export default async function MinhasTarefasPage() {
  const p = await getPainelContext();

  if (p.mode === "json") {
    if (!p.orgId) return <p className="text-sm text-zinc-600">Estado JSON inválido.</p>;
    const rows = p.queries.runsForList(p.orgId);
    return (
      <div>
        <h1 className="text-2xl font-semibold">Minhas tarefas</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Execuções com prazo — abra para marcar itens (protótipo local, sem WhatsApp).
        </p>
        <ul className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {rows.length ? (
            rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
                <div>
                  <p className="font-medium">{r.checklistName}</p>
                  <p className="text-sm text-zinc-500">
                    {r.unitName} · {new Date(r.due_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {statusPt[r.status] ?? r.status}
                  </span>
                  <Link
                    href={`/painel/execucoes/${r.id}`}
                    className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Abrir
                  </Link>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-10 text-center text-sm text-zinc-500">
              Nenhuma execução. Crie uma na aba Checklists.
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
  const { data: runs } = await supabase
    .from("checklist_runs")
    .select("id, due_at, status, checklists(name), units(name)")
    .eq("organization_id", orgId)
    .order("due_at", { ascending: false })
    .limit(40);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Minhas tarefas</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Execuções com prazo — abra para marcar itens e anexar evidências (fotos em breve no storage).
      </p>
      <ul className="mt-8 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {runs?.length ? (
          runs.map((r: (typeof runs)[number]) => {
            const cl = r.checklists as unknown as { name: string } | null;
            const un = r.units as unknown as { name: string } | null;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
                <div>
                  <p className="font-medium">{cl?.name ?? "Checklist"}</p>
                  <p className="text-sm text-zinc-500">
                    {un?.name ?? "Unidade"} · {new Date(r.due_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {statusPt[r.status] ?? r.status}
                  </span>
                  <Link
                    href={`/painel/execucoes/${r.id}`}
                    className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Abrir
                  </Link>
                </div>
              </li>
            );
          })
        ) : (
          <li className="px-4 py-10 text-center text-sm text-zinc-500">
            Nenhuma execução. Crie uma na aba Checklists.
          </li>
        )}
      </ul>
    </div>
  );
}
