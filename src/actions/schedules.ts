"use server";

import { revalidatePath } from "next/cache";
import { assertOrgManagementPermission } from "@/lib/org-access";
import { isJsonStoreMode } from "@/lib/data-mode";
import { jsonCreateSchedule, jsonDeleteSchedule } from "@/lib/store/json-repository";
import { createClient } from "@/lib/supabase/server";

export async function createSchedule(input: {
  checklistId: string;
  timeLocal: string;
  daysOfWeek: number[];
}) {
  if (isJsonStoreMode()) {
    const res = await jsonCreateSchedule(input);
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel/agendamentos");
    return { id: res.id };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const { data: ch, error: e0 } = await supabase
    .from("checklists")
    .select("id, unit_id, organization_id")
    .eq("id", input.checklistId)
    .single();
  if (e0 || !ch?.unit_id) return { error: "Checklist inválida ou sem unidade." };

  const gate = await assertOrgManagementPermission(
    supabase,
    ch.organization_id as string,
    "manage_schedules",
  );
  if ("error" in gate) return gate;
  if (!input.daysOfWeek.length) return { error: "Escolha pelo menos um dia da semana." };

  const t = input.timeLocal.trim();
  const timeSql = t.length <= 5 ? `${t}:00` : t;

  const { data, error } = await supabase
    .from("checklist_schedules")
    .insert({
      checklist_id: input.checklistId,
      time_local: timeSql,
      days_of_week: [...new Set(input.daysOfWeek)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b),
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/painel/agendamentos");
  return { id: data.id as string };
}

export async function deleteSchedule(scheduleId: string) {
  if (isJsonStoreMode()) {
    const res = await jsonDeleteSchedule(scheduleId);
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel/agendamentos");
    return { ok: true as const };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const { data: sch } = await supabase
    .from("checklist_schedules")
    .select("checklist_id")
    .eq("id", scheduleId)
    .maybeSingle();
  if (!sch?.checklist_id) return { error: "Agendamento não encontrado." };

  const { data: ch } = await supabase
    .from("checklists")
    .select("organization_id")
    .eq("id", sch.checklist_id)
    .maybeSingle();
  if (!ch?.organization_id) return { error: "Checklist inválida." };

  const gate = await assertOrgManagementPermission(
    supabase,
    ch.organization_id as string,
    "manage_schedules",
  );
  if ("error" in gate) return gate;

  const { error } = await supabase.from("checklist_schedules").delete().eq("id", scheduleId);
  if (error) return { error: error.message };
  revalidatePath("/painel/agendamentos");
  return { ok: true as const };
}
