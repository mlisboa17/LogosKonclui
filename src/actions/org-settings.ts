"use server";

import { revalidatePath } from "next/cache";
import {
  DEFAULT_MANAGER_PERMISSIONS,
  type ManagerPermissionKey,
  type ManagerPermissions,
  parseOrganizationSettings,
} from "@/lib/org-access";
import { createClient } from "@/lib/supabase/server";

export async function updateOrganizationManagerPermissions(input: {
  organizationId: string;
  permissions: Partial<Record<ManagerPermissionKey, boolean>>;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const { data: mem } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mem?.role !== "owner") {
    return { error: "Apenas o proprietário pode alterar permissões dos gestores." };
  }

  const { data: org, error: oErr } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", input.organizationId)
    .single();

  if (oErr || !org) return { error: "Organização não encontrada." };

  const parsed = parseOrganizationSettings(org.settings);
  const nextPerms: ManagerPermissions = { ...parsed.manager_permissions };
  for (const [k, v] of Object.entries(input.permissions)) {
    const key = k as ManagerPermissionKey;
    if (typeof v === "boolean" && key in DEFAULT_MANAGER_PERMISSIONS) {
      nextPerms[key] = v;
    }
  }

  const nextSettings = {
    ...(typeof org.settings === "object" && org.settings !== null ? org.settings : {}),
    manager_permissions: nextPerms,
  };

  const { error } = await supabase
    .from("organizations")
    .update({ settings: nextSettings })
    .eq("id", input.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/painel/configuracao");
  revalidatePath("/painel");
  return { ok: true as const };
}

export async function updateOrganizationName(input: { organizationId: string; name: string }) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const { data: mem } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (mem?.role !== "owner" && mem?.role !== "manager") {
    return { error: "Sem permissão." };
  }

  const name = input.name.trim();
  if (!name) return { error: "Nome obrigatório." };

  const { error } = await supabase.from("organizations").update({ name }).eq("id", input.organizationId);
  if (error) return { error: error.message };
  revalidatePath("/painel/configuracao");
  revalidatePath("/painel");
  return { ok: true as const };
}
