import { getSessionContext } from "@/lib/data/memberships";
import { isJsonStoreMode } from "@/lib/data-mode";
import { jsonReadQueries } from "@/lib/store/json-repository";
import { createClient } from "@/lib/supabase/server";

export type PainelContext =
  | {
      mode: "json";
      orgId: string;
      orgName: string;
      queries: Awaited<ReturnType<typeof jsonReadQueries>>;
    }
  | {
      mode: "json";
      orgId: null;
      orgName: null;
      queries: Awaited<ReturnType<typeof jsonReadQueries>>;
    }
  | {
      mode: "supabase";
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: Awaited<ReturnType<typeof getSessionContext>>["user"];
      organizations: { id: string; name: string }[];
    };

export async function getPainelContext(): Promise<PainelContext> {
  if (isJsonStoreMode()) {
    const queries = await jsonReadQueries();
    const o = queries.defaultOrg;
    if (!o) return { mode: "json", orgId: null, orgName: null, queries };
    return { mode: "json", orgId: o.id, orgName: o.name, queries };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { mode: "supabase", supabase: null, user: null, organizations: [] };
  }
  const ctx = await getSessionContext(supabase);
  if (!ctx.user) {
    return { mode: "supabase", supabase, user: null, organizations: [] };
  }
  return {
    mode: "supabase",
    supabase,
    user: ctx.user,
    organizations: ctx.organizations,
  };
}
