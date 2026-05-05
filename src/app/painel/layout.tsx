import Link from "next/link";
import { ensureProfile } from "@/actions/profile";
import { LogoutButton } from "@/components/auth/LogoutButton";
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
    <div className="flex min-h-full flex-col bg-zinc-50 dark:bg-zinc-950">
      <PrototypeBanner />
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/painel" className="text-lg font-semibold text-emerald-800 dark:text-emerald-400">
            Logos Koncui
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {n.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
