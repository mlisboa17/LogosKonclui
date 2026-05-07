import Link from "next/link";
import type { Metadata } from "next";
import { getPainelContext } from "@/lib/painel-context";
import { getSessionContext } from "@/lib/data/memberships";

export const metadata: Metadata = {
  title: "Operador — Logos Konclui",
  description: "Tarefas e checklists otimizados para telemóvel.",
};

const statusPt: Record<string, string> = {
  scheduled: "Agendado",
  in_progress: "Em andamento",
  completed: "Concluído",
  late: "Atrasado",
  missed: "Perdido",
};

export default async function OperadorPage() {
  const p = await getPainelContext();

  if (p.mode === "json") {
    if (!p.orgId) {
      return <p className="text-center text-sm text-zinc-600">Estado JSON inválido.</p>;
    }
    const rows = p.queries.runsForList(p.orgId);
    return (
      <>
        <p className="mb-6 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Toque numa tarefa para abrir o checklist. Áreas grandes para uso em loja.
        </p>
        <ul className="flex flex-col gap-3">
          {rows.length ? (
            rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/painel/execucoes/${r.id}`}
                  className="flex min-h-14 flex-col justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                    {r.checklistName}
                  </span>
                  <span className="mt-1 text-sm text-zinc-500">
                    {r.unitName} · {new Date(r.due_at).toLocaleString("pt-BR")}
                  </span>
                  <span className="mt-2 inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    {statusPt[r.status] ?? r.status}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="rounded-2xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
              Nenhuma execução. Crie uma no painel → Checklists.
            </li>
          )}
        </ul>
      </>
    );
  }

  const supabase = p.supabase;
  if (!supabase) {
    return (
      <p className="text-center text-sm text-zinc-600">
        Configure o Supabase ou use <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">NEXT_PUBLIC_DATA_MODE=json</code>.
      </p>
    );
  }

  const ctx = await getSessionContext(supabase);
  if (!ctx.organizations.length) {
    return (
      <p className="text-center text-sm">
        <Link href="/painel/organizacao/nova" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Crie uma organização
        </Link>
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
    <>
      <p className="mb-6 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Toque numa tarefa para abrir o checklist. Use “Adicionar ao ecrã inicial” no browser para instalar
        como app.
      </p>
      <ul className="flex flex-col gap-3">
        {runs?.length ? (
          runs.map((r: (typeof runs)[number]) => {
            const cl = r.checklists as unknown as { name: string } | null;
            const un = r.units as unknown as { name: string } | null;
            return (
              <li key={r.id}>
                <Link
                  href={`/painel/execucoes/${r.id}`}
                  className="flex min-h-[4.5rem] flex-col justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <span className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                    {cl?.name ?? "Checklist"}
                  </span>
                  <span className="mt-1 text-sm text-zinc-500">
                    {un?.name ?? "Unidade"} · {new Date(r.due_at).toLocaleString("pt-BR")}
                  </span>
                  <span className="mt-2 inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
                    {statusPt[r.status] ?? r.status}
                  </span>
                </Link>
              </li>
            );
          })
        ) : (
          <li className="rounded-2xl border border-dashed border-zinc-300 px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nenhuma execução. Crie uma no painel → Checklists.
          </li>
        )}
      </ul>
    </>
  );
}
