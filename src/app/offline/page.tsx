import Link from "next/link";

/** Mostrada pelo service worker quando não há rede e a página não está em cache. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Sem ligação</h1>
      <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        Não foi possível carregar esta página. Verifique a rede e tente novamente.
      </p>
      <Link
        href="/operador"
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        Ir ao modo operador
      </Link>
    </div>
  );
}
