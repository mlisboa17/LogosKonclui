import type { SupabaseClient } from "@supabase/supabase-js";
import { isJsonStoreMode } from "@/lib/data-mode";
import { getSessionContext } from "@/lib/data/memberships";
import {
  canUseManagerPermission,
  fetchOrganizationSettings,
  getMembershipRole,
  type ManagerPermissionKey,
  type OrganizationSettings,
  type OrgRole,
} from "@/lib/org-access";
import { createClient } from "@/lib/supabase/server";

export type PainelNavItem = { href: string; label: string };

/** Ordem fixa; visibilidade por função/permissões em `filterPainelNavForOrg`. */
const NAV_ENTRIES: Array<
  PainelNavItem & {
    /** Operador: só estes aparecem na nav (gestão escondida). */
    operatorOk: boolean;
    /** Gestor: precisa desta chave em `organizations.settings` (omitido = não filtra por chave). */
    managerKey?: ManagerPermissionKey;
    /** Gestor: basta uma destas chaves (ex.: Equipe). */
    managerAny?: ManagerPermissionKey[];
    /** Telegram e integrações: só proprietário + gestor (não operador). */
    staffOnly?: boolean;
  }
> = [
  { href: "/painel", label: "Visão geral", operatorOk: true },
  { href: "/painel/unidades", label: "Unidades", operatorOk: true, managerKey: "manage_units" },
  { href: "/painel/modelos", label: "Modelos", operatorOk: false, managerKey: "manage_templates" },
  { href: "/painel/checklists", label: "Checklists", operatorOk: true, managerKey: "manage_checklists" },
  { href: "/painel/minhas-tarefas", label: "Minhas tarefas", operatorOk: true },
  { href: "/operador", label: "Operador", operatorOk: true },
  { href: "/painel/agendamentos", label: "Agendamentos", operatorOk: false, managerKey: "manage_schedules" },
  {
    href: "/painel/equipe",
    label: "Equipe",
    operatorOk: true,
    managerAny: ["manage_team", "view_equipe_score"],
  },
  { href: "/painel/telegram", label: "Telegram", operatorOk: false, staffOnly: true },
];

function navEntryVisible(
  role: OrgRole,
  settings: OrganizationSettings,
  e: (typeof NAV_ENTRIES)[number],
): boolean {
  if (e.staffOnly && role === "operator") return false;

  if (role === "owner") return true;

  if (role === "operator") return e.operatorOk;

  if (role === "manager") {
    if (e.managerAny?.length) {
      return e.managerAny.some((k) => canUseManagerPermission("manager", k, settings));
    }
    if (e.managerKey) {
      return canUseManagerPermission("manager", e.managerKey, settings);
    }
    return true;
  }

  return false;
}

async function filterPainelNavForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<PainelNavItem[]> {
  const role = await getMembershipRole(supabase, organizationId, userId);
  const settings = await fetchOrganizationSettings(supabase, organizationId);

  if (!role) {
    return NAV_ENTRIES.map(({ href, label }) => ({ href, label }));
  }

  return NAV_ENTRIES.filter((e) => navEntryVisible(role, settings, e)).map(({ href, label }) => ({
    href,
    label,
  }));
}

/** Links da navegação superior do painel (inclui Configuração quando aplicável). */
export async function getPainelNav(): Promise<PainelNavItem[]> {
  if (isJsonStoreMode()) {
    return [
      ...NAV_ENTRIES.map(({ href, label }) => ({ href, label })),
      { href: "/painel/configuracao", label: "Configuração" },
      { href: "/", label: "Site" },
    ];
  }

  const supabase = await createClient();
  if (!supabase) {
    return [...NAV_ENTRIES.map(({ href, label }) => ({ href, label })), { href: "/", label: "Site" }];
  }

  const ctx = await getSessionContext(supabase);
  const orgId = ctx.organizations[0]?.id;
  const userId = ctx.user?.id;

  const core =
    orgId && userId
      ? await filterPainelNavForOrg(supabase, orgId, userId)
      : NAV_ENTRIES.map(({ href, label }) => ({ href, label }));

  const extra: PainelNavItem[] = [];
  if (orgId && userId) {
    extra.push({ href: "/painel/configuracao", label: "Conta" });
  }

  return [...core, ...extra, { href: "/", label: "Site" }];
}
