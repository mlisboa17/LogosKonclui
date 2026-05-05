import type { PainelKpisToday } from "@/lib/painel-kpis";

export function PainelKpiCards({ k }: { k: PainelKpisToday }) {
  const pct = k.completionRate != null ? `${k.completionRate}%` : "—";
  const cards: { label: string; value: string }[] = [
    { label: "Conclusão (hoje)", value: pct },
    { label: "Alertas abertos", value: String(k.openAlerts) },
    { label: "Com prazo hoje", value: String(k.totalDueToday) },
    { label: "No prazo (concl.)", value: String(k.onTime) },
    { label: "Atrasadas / fora do prazo", value: String(k.late) },
    { label: "Falhas (perdidas)", value: String(k.missed) },
    { label: "Por iniciar", value: String(k.scheduled) },
    { label: "Em curso", value: String(k.inProgress) },
  ];

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Operação hoje</h2>
          <p className="mt-1 text-xs text-zinc-500">{k.label} — visão estilo painel do gestor</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li
            key={c.label}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-2xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-400">
              {c.value}
            </p>
            <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">{c.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
