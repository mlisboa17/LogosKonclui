import { getSessionContext } from "@/lib/data/memberships";
import { isJsonStoreMode } from "@/lib/data-mode";
import type { ProcessorResult } from "@/lib/schedule-processor";
import { runJsonScheduleProcessor, runSupabaseScheduleProcessor } from "@/lib/schedule-processor";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function runScheduleJobGlobalCore(): Promise<ProcessorResult> {
  if (isJsonStoreMode()) {
    return runJsonScheduleProcessor();
  }
  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      runsCreated: 0,
      lateAlerts: 0,
      errors: [
        "Modo Supabase: defina SUPABASE_SERVICE_ROLE_KEY no servidor para o cron processar todas as organizações.",
      ],
    };
  }
  return runSupabaseScheduleProcessor(admin, null);
}

export async function runScheduleJobForUserCore(): Promise<ProcessorResult> {
  if (isJsonStoreMode()) {
    return runJsonScheduleProcessor();
  }
  const supabase = await createClient();
  if (!supabase) {
    return { runsCreated: 0, lateAlerts: 0, errors: ["Supabase não configurado."] };
  }
  const ctx = await getSessionContext(supabase);
  const orgIds = ctx.organizations.map((o) => o.id);
  if (!orgIds.length) {
    return { runsCreated: 0, lateAlerts: 0, errors: [] };
  }
  return runSupabaseScheduleProcessor(supabase, orgIds);
}
