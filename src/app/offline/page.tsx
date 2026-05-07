import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Você está offline
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Sem internet no momento. Assim que a conexão voltar, atualize para continuar os checklists.
      </p>
      <Link
        href="/operador"
        className="mt-6 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
      >
        Tentar novamente
      </Link>
    </main>
  );
}
