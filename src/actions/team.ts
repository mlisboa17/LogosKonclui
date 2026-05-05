"use server";

import { revalidatePath } from "next/cache";
import { assertOrgManagementPermission } from "@/lib/org-access";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type MemberRole = "owner" | "manager" | "operator";

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;
  const norm = email.trim().toLowerCase();
  let page = 1;
  const perPage = 100;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    const hit = data.users.find((u) => u.email?.toLowerCase() === norm);
    if (hit) return hit.id;
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }
  return null;
}

export async function addOrganizationMember(input: {
  organizationId: string;
  email: string;
  role: MemberRole;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_team");
  if ("error" in gate) return gate;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const reqRole = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  const who = reqRole.data?.role as string | undefined;
  if (who !== "owner" && input.role === "owner") {
    return { error: "Apenas o proprietário pode nomear outro proprietário." };
  }

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { error: "Email inválido." };

  let targetUserId = await findAuthUserIdByEmail(email);

  const admin = createServiceRoleClient();
  if (!targetUserId) {
    if (!admin) {
      return {
        error:
          "Utilizador não encontrado. Crie a conta em /cadastro primeiro, ou defina SUPABASE_SERVICE_ROLE_KEY no servidor para convite por email.",
      };
    }
    const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: email.split("@")[0] },
    });
    if (invErr || !inv.user) {
      return { error: invErr?.message ?? "Falha ao enviar convite." };
    }
    targetUserId = inv.user.id;
  }

  if (targetUserId === user.id) {
    return { error: "Já é membro desta organização (o seu utilizador)." };
  }

  const { error: insErr } = await supabase.from("organization_members").insert({
    organization_id: input.organizationId,
    user_id: targetUserId,
    role: input.role,
  });

  if (insErr) {
    if (insErr.message.includes("duplicate") || insErr.code === "23505") {
      return { error: "Este utilizador já pertence à organização." };
    }
    return { error: insErr.message };
  }

  revalidatePath("/painel/equipe");
  return { ok: true as const };
}

export async function addOrganizationMemberByUserId(input: {
  organizationId: string;
  userId: string;
  role: MemberRole;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_team");
  if ("error" in gate) return gate;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const reqRole = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  const who = reqRole.data?.role as string | undefined;
  if (who !== "owner" && input.role === "owner") {
    return { error: "Apenas o proprietário pode nomear outro proprietário." };
  }

  const uid = input.userId.trim();
  if (!uid) return { error: "Informe o UUID do utilizador." };

  const { error: insErr } = await supabase.from("organization_members").insert({
    organization_id: input.organizationId,
    user_id: uid,
    role: input.role,
  });

  if (insErr) {
    if (insErr.message.includes("duplicate") || insErr.code === "23505") {
      return { error: "Este utilizador já pertence à organização." };
    }
    return { error: insErr.message };
  }

  revalidatePath("/painel/equipe");
  return { ok: true as const };
}

export async function updateOrganizationMemberRole(input: {
  organizationId: string;
  userId: string;
  role: MemberRole;
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_team");
  if ("error" in gate) return gate;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const actor = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", user.id)
    .maybeSingle();
  const actorRole = actor.data?.role as string | undefined;
  if (actorRole !== "owner" && input.role === "owner") {
    return { error: "Apenas o proprietário pode atribuir o papel de proprietário." };
  }

  const { data: owners } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("role", "owner");

  const ownerIds = (owners ?? []).map((r) => r.user_id as string);
  const isTargetOwner = ownerIds.includes(input.userId);
  const removingOwner =
    isTargetOwner && input.role !== "owner";

  if (removingOwner && ownerIds.length <= 1) {
    return { error: "Não pode remover o único proprietário da organização." };
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ role: input.role })
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId);

  if (error) return { error: error.message };
  revalidatePath("/painel/equipe");
  return { ok: true as const };
}

export async function removeOrganizationMember(input: { organizationId: string; userId: string }) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_team");
  if ("error" in gate) return gate;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const { data: row } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!row) return { error: "Membro não encontrado." };

  if (row.role === "owner") {
    const { data: owners } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", input.organizationId)
      .eq("role", "owner");
    if ((owners ?? []).length <= 1) {
      return { error: "Não pode remover o único proprietário." };
    }
  }

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("user_id", input.userId);

  if (error) return { error: error.message };
  revalidatePath("/painel/equipe");
  return { ok: true as const };
}
