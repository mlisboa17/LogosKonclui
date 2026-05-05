import { createClient } from "@/lib/supabase/server";
import { AcknowledgeAlertButton } from "@/components/painel/AcknowledgeAlertButton";

export async function OpenAlertsSection({ organizationId }: { organizationId: string }) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: rows } = await supabase
    .from("alerts")
    .select("id, message, severity, created_at")
    .eq("organization_id", organizationId)
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(12);

  if (!rows?.length) return null;

  return (
    <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 dark:border-amber-900/60 dark:bg-amber-950/25">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
        Alertas por reconhecer
      </h2>
      <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-100/70">
        Marque como reconhecido quando a equipa tratar o assunto (não fecha a execução automaticamente).
      </p>
      <ul className="mt-4 space-y-3">
        {rows.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200/80 bg-white/90 px-3 py-3 text-sm dark:border-amber-900/40 dark:bg-zinc-900/80"
          >
            <div className="min-w-0 flex-1">
              <p className="text-zinc-900 dark:text-zinc-100">{a.message}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {new Date(a.created_at as string).toLocaleString("pt-BR")}
                {a.severity && a.severity !== "warning" ? ` · ${a.severity}` : ""}
              </p>
            </div>
            <AcknowledgeAlertButton alertId={a.id} />
          </li>
        ))}
      </ul>
    </section>
  );
}
