import type { SupabaseClient } from "@supabase/supabase-js";

export type MembershipRow = {
  organization_id: string;
  role: string;
};

export async function getSessionContext(supabase: SupabaseClient | null) {
  if (!supabase) {
    return { user: null as null, organizations: [] as { id: string; name: string }[] };
  }
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null as null, organizations: [] as { id: string; name: string }[] };
  }

  const { data: members, error: mErr } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (mErr || !members?.length) {
    return { user, organizations: [] as { id: string; name: string }[] };
  }

  const ids = [...new Set(members.map((m) => m.organization_id))];
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", ids)
    .order("name");

  return {
    user,
    organizations: orgs ?? [],
    memberships: members as MembershipRow[],
  };
}
