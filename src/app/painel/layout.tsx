import Link from "next/link";
import { ensureProfile } from "@/actions/profile";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PainelSidebarNav } from "@/components/painel/PainelSidebarNav";
import { PrototypeBanner } from "@/components/painel/PrototypeBanner";
import { isJsonStoreMode } from "@/lib/data-mode";
import { getPainelNav } from "@/lib/painel-nav";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isJsonStoreMode()) {
    await ensureProfile();
  }

  const nav = await getPainelNav();

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <PrototypeBanner />
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <Link href="/painel" className="block text-base font-semibold tracking-tight text-emerald-800 dark:text-emerald-400">
              Logos Koncui
            </Link>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">Operação diária com rastreabilidade</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/operador"
              className="hidden rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 md:inline-flex"
            >
              Modo operador
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-5 md:grid-cols-[250px_minmax(0,1fr)] md:py-6">
        <aside className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:sticky md:top-20 md:h-fit">
          <div className="hidden px-2 md:block">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Navegação
            </p>
          </div>
          <PainelSidebarNav items={nav.filter((n) => n.href !== "/operador")} />
          <div className="hidden rounded-xl bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300 md:block">
            Use o menu para alternar rápido entre execução, equipe e configuração sem perder contexto.
          </div>
        </aside>

        <main className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
