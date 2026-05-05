import Link from "next/link";
import { ensureProfile } from "@/actions/profile";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { PrototypeBanner } from "@/components/painel/PrototypeBanner";
import { isJsonStoreMode } from "@/lib/data-mode";

export default async function OperadorLayout({ children }: { children: React.ReactNode }) {
  if (!isJsonStoreMode()) {
    await ensureProfile();
  }

  return (
    <div className="flex min-h-full flex-col bg-emerald-950/5 dark:bg-zinc-950">
      <PrototypeBanner />
      <header className="sticky top-0 z-10 border-b border-emerald-900/10 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
              Modo operador
            </p>
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">Logos Koncui</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <Link
                href="/painel"
                className="rounded-lg px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              >
                Painel
              </Link>
              <LogoutButton emphasize />
            </div>
            {!isJsonStoreMode() && (
              <p className="max-w-[11rem] text-right text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                Celular partilhado: <strong className="text-zinc-700 dark:text-zinc-300">Sair</strong> ao
                terminar.
              </p>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {children}
      </main>
    </div>
  );
}
