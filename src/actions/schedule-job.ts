"use server";

import { revalidatePath } from "next/cache";
import { assertOrgManagementPermission } from "@/lib/org-access";
import { getSessionContext } from "@/lib/data/memberships";
import { isJsonStoreMode } from "@/lib/data-mode";
import { runScheduleJobForUserCore, runScheduleJobGlobalCore } from "@/lib/schedule-job-runner";
import { createClient } from "@/lib/supabase/server";

/** Processamento disparado pelo utilizador autenticado (painel). */
export async function runScheduleJobForCurrentUser() {
  if (!isJsonStoreMode()) {
    const supabase = await createClient();
    if (supabase) {
      const ctx = await getSessionContext(supabase);
      const orgId = ctx.organizations[0]?.id;
      if (orgId) {
        const gate = await assertOrgManagementPermission(supabase, orgId, "manage_schedules");
        if ("error" in gate) {
          return { runsCreated: 0, lateAlerts: 0, errors: [gate.error] };
        }
      }
    }
  }

  const r = await runScheduleJobForUserCore();
  revalidatePath("/painel");
  revalidatePath("/painel/minhas-tarefas");
  revalidatePath("/painel/agendamentos");
  return r;
}

/** Processamento global (cron / servidor). */
export async function runScheduleJobGlobal() {
  return runScheduleJobGlobalCore();
}
