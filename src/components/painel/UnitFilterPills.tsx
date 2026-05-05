import Link from "next/link";

export function UnitFilterPills({
  units,
  selectedId,
}: {
  units: { id: string; name: string }[];
  selectedId: string | null;
}) {
  const base =
    "rounded-full border px-3 py-1.5 text-xs font-medium transition";
  const active =
    "border-emerald-600 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100";
  const idle =
    "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-zinc-500">Operação (hoje) por unidade:</span>
      <Link href="/painel" className={`${base} ${!selectedId ? active : idle}`}>
        Todas
      </Link>
      {units.map((u) => (
        <Link
          key={u.id}
          href={`/painel?unidade=${encodeURIComponent(u.id)}`}
          className={`${base} ${selectedId === u.id ? active : idle}`}
        >
          {u.name}
        </Link>
      ))}
    </div>
  );
}
