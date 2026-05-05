"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isJsonStoreMode } from "@/lib/data-mode";
import { getSupabasePublicEnv } from "@/lib/env";

export function LogoutButton({ emphasize = false }: { emphasize?: boolean }) {
  const router = useRouter();
  if (isJsonStoreMode()) return null;

  async function logout() {
    if (!getSupabasePublicEnv().isConfigured) {
      router.push("/");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className={`rounded-md px-3 py-2 text-sm font-medium transition ${
        emphasize
          ? "border border-amber-600/70 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-500/60 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950/80"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      Sair
    </button>
  );
}
