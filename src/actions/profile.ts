"use server";

import { revalidatePath } from "next/cache";
import { isJsonStoreMode } from "@/lib/data-mode";
import { createClient } from "@/lib/supabase/server";

/** Garante linha em `profiles` se o trigger em auth.users não tiver rodado. */
export async function ensureProfile() {
  if (isJsonStoreMode()) return;

  const supabase = await createClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name:
        (typeof user.user_metadata?.full_name === "string" &&
          user.user_metadata.full_name) ||
        user.email?.split("@")[0] ||
        "Usuário",
    },
    { onConflict: "id" },
  );

  if (error) console.error("ensureProfile", error.message);
}

export async function updateMyProfile(input: { fullName: string; phone?: string }) {
  if (isJsonStoreMode()) {
    return { error: "Perfil editável apenas com Supabase." };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const full_name = input.fullName.trim();
  if (!full_name) return { error: "Nome obrigatório." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone: input.phone?.trim() || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/painel/configuracao");
  revalidatePath("/painel/equipe");
  return { ok: true as const };
}
