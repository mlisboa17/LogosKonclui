import Link from "next/link";
import { ManagerPermissionsForm } from "@/components/painel/ManagerPermissionsForm";
import { OrgNameForm } from "@/components/painel/OrgNameForm";
import { ProfileForm } from "@/components/painel/ProfileForm";
import { getPainelContext } from "@/lib/painel-context";
import { getSessionContext } from "@/lib/data/memberships";
import {
  canUseManagerPermission,
  DEFAULT_MANAGER_PERMISSIONS,
  fetchOrganizationSettings,
  getMembershipRole,
  type ManagerPermissions,
} from "@/lib/org-access";

export default async function ContaConfigPage() {
  const p = await getPainelContext();

  if (p.mode === "json") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Conta</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          No modo protótipo (JSON) o perfil e a organização na base de dados não estão disponíveis. Use
          Supabase no <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env</code>.
        </p>
        <Link
          href="/painel"
          className="mt-6 inline-block text-sm text-emerald-800 hover:underline dark:text-emerald-400"
        >
          ← Visão geral
        </Link>
      </div>
    );
  }

  const supabase = p.supabase;
  if (!supabase) {
    return <p className="text-sm text-zinc-600">Configure o Supabase.</p>;
  }

  const ctx = await getSessionContext(supabase);
  if (!ctx.user || !ctx.organizations.length) {
    return (
      <p className="text-sm">
        <Link href="/painel/organizacao/nova" className="text-emerald-700 underline">
          Crie ou entre numa organização
        </Link>
        .
      </p>
    );
  }

  const orgId = ctx.organizations[0].id;
  const orgName = ctx.organizations[0].name;
  const userId = ctx.user.id;

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", userId)
    .maybeSingle();

  const role = await getMembershipRole(supabase, orgId, userId);
  const settings = await fetchOrganizationSettings(supabase, orgId);
  const perms: ManagerPermissions = settings.manager_permissions ?? {
    ...DEFAULT_MANAGER_PERMISSIONS,
  };

  const isOwner = role === "owner";
  const isManager = role === "manager";
  const canEditOrgName = isOwner || isManager;
  const canEditManagerPerms = isOwner;

  return (
    <div className="space-y-10">
      <div>
        <Link
          href="/painel"
          className="mb-4 inline-block text-sm text-emerald-800 hover:underline dark:text-emerald-400"
        >
          ← Visão geral
        </Link>
        <h1 className="text-2xl font-semibold">Conta e organização</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Perfil, nome do grupo e permissões dos gestores.
        </p>
      </div>

      <ProfileForm
        initialFullName={prof?.full_name ?? ctx.user.email?.split("@")[0] ?? "Usuário"}
        initialPhone={prof?.phone ?? ""}
      />

      {canEditOrgName && <OrgNameForm organizationId={orgId} initialName={orgName} />}

      {canEditManagerPerms && (
        <ManagerPermissionsForm organizationId={orgId} initial={perms} />
      )}

      {role === "operator" && (
        <p className="text-sm text-zinc-500">
          Como operador, pode atualizar o seu perfil. O nome da organização e as permissões dos gestores são
          definidos pelo proprietário.
        </p>
      )}

      {isManager &&
        role &&
        !canUseManagerPermission(role, "manage_org_settings", settings) && (
        <p className="text-sm text-zinc-500">
          O proprietário limitou o acesso de gestores às definições avançadas. Continua a poder usar as
          áreas permitidas no menu.
        </p>
      )}
    </div>
  );
}
