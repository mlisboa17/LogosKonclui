"use server";

import { revalidatePath } from "next/cache";
import { isJsonStoreMode } from "@/lib/data-mode";
import { jsonCreateOrganization } from "@/lib/store/json-repository";
import { createClient } from "@/lib/supabase/server";

export async function createOrganization(name: string) {
  if (isJsonStoreMode()) {
    const res = await jsonCreateOrganization(name);
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel");
    return { data: res.data };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe o nome da organização." };

  const { data: sessionUser } = await supabase.auth.getUser();
  if (!sessionUser.user) {
    return { error: "Sessão inválida. Saia e entre de novo em /entrar." };
  }

  const { data: orgId, error } = await supabase.rpc("create_organization_with_owner", {
    org_name: trimmed,
  });

  if (error) {
    if (error.message.includes("not_authenticated") || error.code === "P0001") {
      return { error: "Sessão expirada. Entre novamente em /entrar." };
    }
    if (error.message.includes("Could not find") && error.message.includes("create_organization_with_owner")) {
      return {
        error:
          "Base desatualizada: execute no SQL Editor a migration 20260508200000_create_organization_rpc.sql (Supabase).",
      };
    }
    return { error: error.message };
  }

  const data = orgId ? { id: orgId as string } : null;
  revalidatePath("/painel");
  return { data };
}
