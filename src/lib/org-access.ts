import type { SupabaseClient } from "@supabase/supabase-js";

/** Chaves persistidas em organizations.settings.manager_permissions */
export type ManagerPermissionKey =
  | "manage_units"
  | "manage_team"
  | "manage_templates"
  | "manage_checklists"
  | "manage_schedules"
  | "view_equipe_score"
  | "manage_org_settings";

export type OrgRole = "owner" | "manager" | "operator";

export type ManagerPermissions = Record<ManagerPermissionKey, boolean>;

const PERMISSION_KEYS: ManagerPermissionKey[] = [
  "manage_units",
  "manage_team",
  "manage_templates",
  "manage_checklists",
  "manage_schedules",
  "view_equipe_score",
  "manage_org_settings",
];

export const DEFAULT_MANAGER_PERMISSIONS: ManagerPermissions = {
  manage_units: true,
  manage_team: true,
  manage_templates: true,
  manage_checklists: true,
  manage_schedules: true,
  view_equipe_score: true,
  manage_org_settings: false,
};

function mergeManagerPermissions(raw: unknown): ManagerPermissions {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_MANAGER_PERMISSIONS };
  for (const k of PERMISSION_KEYS) {
    if (typeof o[k] === "boolean") out[k] = o[k];
  }
  return out;
}

export type OrganizationSettings = {
  manager_permissions: ManagerPermissions;
};

export function parseOrganizationSettings(settings: unknown): OrganizationSettings {
  const s = settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};
  return {
    manager_permissions: mergeManagerPermissions(s.manager_permissions),
  };
}

export async function fetchOrganizationSettings(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrganizationSettings> {
  const { data, error } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .single();

  if (error || !data) {
    return parseOrganizationSettings({});
  }
  return parseOrganizationSettings(data.settings);
}

export async function getMembershipRole(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<OrgRole | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.role) return null;
  const r = data.role as string;
  if (r === "owner" || r === "manager" || r === "operator") return r;
  return null;
}

/** Gestores respeitam flags em settings; owner sempre; operador só leitura para estas chaves. */
export function canUseManagerPermission(
  role: OrgRole | null,
  key: ManagerPermissionKey,
  settings: OrganizationSettings,
): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  if (role === "operator") return false;
  return settings.manager_permissions[key] !== false;
}

/**
 * Verifica permissão para ações de gestão (não se aplica a operador correr checklists).
 * Retorna mensagem de erro em português ou null se OK.
 */
export async function assertOrgManagementPermission(
  supabase: SupabaseClient,
  organizationId: string,
  key: ManagerPermissionKey,
): Promise<{ ok: true } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const role = await getMembershipRole(supabase, organizationId, user.id);
  if (!role) return { error: "Sem acesso a esta organização." };

  if (role === "owner") return { ok: true };

  if (role === "operator") {
    return { error: "Sem permissão para esta ação." };
  }

  const settings = await fetchOrganizationSettings(supabase, organizationId);
  if (!canUseManagerPermission(role, key, settings)) {
    return { error: "O gestor não tem esta permissão. Peça ao proprietário para ativar em Configuração." };
  }

  return { ok: true };
}
