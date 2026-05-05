import Link from "next/link";
import { CreateScheduleForm } from "@/components/painel/CreateScheduleForm";
import { DeleteScheduleButton } from "@/components/painel/DeleteScheduleButton";
import { ProcessSchedulesButton } from "@/components/painel/ProcessSchedulesButton";
import { getSessionContext } from "@/lib/data/memberships";
import { getPainelContext } from "@/lib/painel-context";
import { assertOrgManagementPermission } from "@/lib/org-access";
import { scheduleTimezone } from "@/lib/schedule-helpers";

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDays(days: number[]) {
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => dayNames[d] ?? d)
    .join(", ");
}

export default async function AgendamentosPage() {
  const p = await getPainelContext();
  const tz = scheduleTimezone();

  if (p.mode === "json") {
    if (!p.orgId) return <p className="text-sm text-zinc-600">Estado JSON inválido.</p>;
    const schedules = p.queries.schedulesForOrg(p.orgId);
    const alerts = p.queries.alertsForOrg(p.orgId, 25);
    const checklists = p.queries.checklists(p.orgId).map((c) => ({ id: c.id, name: c.name }));

    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-2xl font-semibold">Agendamentos</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Recorrência por dia da semana e hora local ({tz}). O botão abaixo gera execuções e trata atrasos; em
            produção use também o cron HTTP.
          </p>
        </div>
        <ProcessSchedulesButton canRun />
        <CreateScheduleForm checklists={checklists} canManage />
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Agendamentos ativos</h2>
          <ul className="mt-3 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {schedules.length ? (
              schedules.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{s.checklistName}</p>
                    <p className="text-zinc-500">
                      {String(s.timeLocal).slice(0, 5)} · {formatDays(s.daysOfWeek)}
                    </p>
                  </div>
                  <DeleteScheduleButton scheduleId={s.id} canDelete />
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-sm text-zinc-500">Nenhum agendamento.</li>
            )}
          </ul>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Alertas recentes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {alerts.length ? (
              alerts.map((a) => (
                <li key={a.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="text-zinc-400">{new Date(a.createdAt).toLocaleString("pt-BR")}</span> — {a.message}
                </li>
              ))
            ) : (
              <li className="text-zinc-500">Sem alertas registados.</li>
            )}
          </ul>
        </section>
        <section className="rounded-xl border border-dashed border-zinc-300 p-4 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">Cron (opcional)</p>
          <p className="mt-1">
            GET <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">/api/cron/process-schedules?secret=…</code>{" "}
            com <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">CRON_SECRET</code> no .env — em modo JSON
            não precisa de Supabase service role.
          </p>
        </section>
      </div>
    );
  }

  const supabase = p.supabase;
  if (!supabase) {
    return (
      <p className="text-sm text-zinc-600">
        Configure Supabase ou use <code className="rounded bg-zinc-100 px-1">NEXT_PUBLIC_DATA_MODE=json</code>.
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

  const schedGate = await assertOrgManagementPermission(supabase, orgId, "manage_schedules");
  const canManageSchedules = "ok" in schedGate;

  const { data: checklists } = await supabase
    .from("checklists")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("name");
  const ids = (checklists ?? []).map((c: { id: string }) => c.id);
  const { data: schedules } =
    ids.length > 0
      ? await supabase
          .from("checklist_schedules")
          .select("id, time_local, days_of_week, checklist_id, checklists(name)")
          .in("checklist_id", ids)
          .eq("is_active", true)
      : { data: [] as unknown[] };

  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, message, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Agendamentos</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Recorrência por dia da semana e hora local ({tz}). Aplique a migration que adiciona{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">late_alert_sent_at</code> em{" "}
          <code className="rounded bg-zinc-100 px-1">checklist_runs</code> para alertas de atraso.
        </p>
      </div>
      <ProcessSchedulesButton canRun={canManageSchedules} />
      <CreateScheduleForm checklists={checklists ?? []} canManage={canManageSchedules} />
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Agendamentos ativos</h2>
        <ul className="mt-3 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {(schedules ?? []).length ? (
            (schedules as { id: string; time_local: string; days_of_week: number[]; checklist_id: string; checklists: { name: string } | null }[]).map(
              (s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{s.checklists?.name ?? "Checklist"}</p>
                    <p className="text-zinc-500">
                      {String(s.time_local).slice(0, 5)} · {formatDays(s.days_of_week ?? [])}
                    </p>
                  </div>
                  <DeleteScheduleButton scheduleId={s.id} canDelete={canManageSchedules} />
                </li>
              ),
            )
          ) : (
            <li className="px-4 py-8 text-center text-sm text-zinc-500">Nenhum agendamento.</li>
          )}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Alertas recentes</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(alerts ?? []).length ? (
            (alerts as { id: string; message: string; created_at: string }[]).map((a) => (
              <li key={a.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="text-zinc-400">{new Date(a.created_at).toLocaleString("pt-BR")}</span> — {a.message}
              </li>
            ))
          ) : (
            <li className="text-zinc-500">Sem alertas registados.</li>
          )}
        </ul>
      </section>
      <section className="rounded-xl border border-dashed border-zinc-300 p-4 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        <p className="font-medium text-zinc-800 dark:text-zinc-200">Cron em produção</p>
        <p className="mt-1">
          Defina <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">CRON_SECRET</code> e{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">SUPABASE_SERVICE_ROLE_KEY</code> (só servidor).
          Chame periodicamente{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">/api/cron/process-schedules?secret=…</code>.
        </p>
      </section>
    </div>
  );
}
