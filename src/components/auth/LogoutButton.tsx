"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isJsonStoreMode } from "@/lib/data-mode";
import { getSupabasePublicEnv } from "@/lib/env";

export function LogoutButton() {
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
      className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      Sair
    </button>
  );
}
