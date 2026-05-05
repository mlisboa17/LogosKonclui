import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type { AppState, ChecklistRun } from "@/lib/store/types";
import { luxonWeekdayToOur, scheduleTimezone, todayDueUtcIso, utcIsoToLocalDateKey } from "@/lib/schedule-helpers";
import { readAppState, withAppStateLock } from "@/lib/store/file-store";
import { getTelegramConfig, sendTelegramMessage } from "@/lib/telegram";

export type ProcessorResult = {
  runsCreated: number;
  lateAlerts: number;
  errors: string[];
};

function uuid() {
  return crypto.randomUUID();
}

export function processJsonState(
  s: AppState,
  zone: string,
): { state: AppState; runsCreated: number; newLates: ChecklistRun[] } {
  const schedules = s.checklistSchedules ?? [];
  const alerts = [...(s.alerts ?? [])];
  let checklistRuns = [...s.checklistRuns];
  const todayOurDow = luxonWeekdayToOur(DateTime.now().setZone(zone));
  const nowUtc = DateTime.now().toUTC();
  const nowIso = nowUtc.toISO() ?? new Date().toISOString();
  const prevLen = checklistRuns.length;

  for (const sch of schedules.filter((x) => x.isActive)) {
    const ch = s.checklists.find((c) => c.id === sch.checklistId);
    if (!ch?.isActive || !ch.unitId) continue;
    if (!sch.daysOfWeek.includes(todayOurDow)) continue;
    const dueIso = todayDueUtcIso(sch.timeLocal, zone);
    const dayKey = utcIsoToLocalDateKey(dueIso, zone);
    const exists = checklistRuns.some(
      (r) => r.checklistId === sch.checklistId && utcIsoToLocalDateKey(r.dueAt, zone) === dayKey,
    );
    if (exists) continue;
    checklistRuns.push({
      id: uuid(),
      organizationId: ch.organizationId,
      unitId: ch.unitId,
      checklistId: ch.id,
      dueAt: dueIso,
      status: "scheduled",
      lateAlertSentAt: null,
    });
  }

  const runsCreated = checklistRuns.length - prevLen;
  const newLates: ChecklistRun[] = [];

  checklistRuns = checklistRuns.map((r) => {
    if (r.status === "completed" || r.status === "missed") return r;
    const due = DateTime.fromISO(r.dueAt);
    if (due >= nowUtc) return r;
    if (r.lateAlertSentAt) return r;

    const checklistName = s.checklists.find((c) => c.id === r.checklistId)?.name ?? "Checklist";
    const unitName = s.units.find((u) => u.id === r.unitId)?.name ?? "Unidade";
    const whenLocal = due.setZone(zone).toFormat("dd/LL/yyyy HH:mm");
    const msg = `Execução atrasada: ${checklistName} (${unitName}) — prazo ${whenLocal}`;

    alerts.push({
      id: uuid(),
      organizationId: r.organizationId,
      runId: r.id,
      message: msg,
      severity: "warning",
      createdAt: nowIso,
    });

    const updated: ChecklistRun = {
      ...r,
      status: "late",
      lateAlertSentAt: nowIso,
    };
    newLates.push(updated);
    return updated;
  });

  return {
    state: { ...s, checklistRuns, alerts, checklistSchedules: schedules },
    runsCreated,
    newLates,
  };
}

export async function runJsonScheduleProcessor(): Promise<ProcessorResult> {
  const zone = scheduleTimezone();
  const { runsCreated, newLates } = await withAppStateLock(async (s) => {
    const out = processJsonState(s, zone);
    return { next: out.state, result: { runsCreated: out.runsCreated, newLates: out.newLates } };
  });

  const s2 = await readAppState();
  const errors: string[] = [];
  if (getTelegramConfig().enabled && newLates.length) {
    for (const r of newLates) {
      const checklist = s2.checklists.find((c) => c.id === r.checklistId)?.name ?? "Checklist";
      const unit = s2.units.find((u) => u.id === r.unitId)?.name ?? "Unidade";
      const when = DateTime.fromISO(r.dueAt, { zone: "utc" }).setZone(zone).toFormat("dd/LL/yyyy HH:mm");
      const text =
        `⚠️ Logos Koncui — execução ATRASADA\n` +
        `• Checklist: ${checklist}\n` +
        `• Unidade: ${unit}\n` +
        `• Prazo: ${when}\n` +
        `• ID: ${r.id}`;
      const res = await sendTelegramMessage(text);
      if (!res.ok) errors.push(res.error);
    }
  }

  return { runsCreated, lateAlerts: newLates.length, errors };
}

type SchRow = {
  id: string;
  time_local: string;
  days_of_week: number[];
  checklist_id: string;
  checklists: {
    id: string;
    organization_id: string;
    unit_id: string | null;
    is_active: boolean;
    name: string;
  } | null;
};

export async function runSupabaseScheduleProcessor(
  client: SupabaseClient,
  orgFilter: string[] | null,
): Promise<ProcessorResult> {
  const errors: string[] = [];
  const zone = scheduleTimezone();
  let runsCreated = 0;
  let lateAlerts = 0;

  const { data: schedules, error: e1 } = await client
    .from("checklist_schedules")
    .select(
      "id, time_local, days_of_week, checklist_id, is_active, checklists(id, organization_id, unit_id, is_active, name)",
    )
    .eq("is_active", true);

  if (e1) {
    return { runsCreated: 0, lateAlerts: 0, errors: [e1.message] };
  }

  const todayOurDow = luxonWeekdayToOur(DateTime.now().setZone(zone));
  const nowIso = new Date().toISOString();

  for (const row of (schedules ?? []) as unknown as SchRow[]) {
    const ch = row.checklists;
    if (!ch?.is_active || !ch.unit_id) continue;
    if (orgFilter && !orgFilter.includes(ch.organization_id)) continue;
    if (!row.days_of_week?.includes(todayOurDow)) continue;

    const dueIso = todayDueUtcIso(row.time_local, zone);

    const { data: existing } = await client
      .from("checklist_runs")
      .select("id")
      .eq("checklist_id", ch.id)
      .eq("due_at", dueIso)
      .maybeSingle();

    if (existing) continue;

    const { error: insE } = await client.from("checklist_runs").insert({
      organization_id: ch.organization_id,
      unit_id: ch.unit_id,
      checklist_id: ch.id,
      due_at: dueIso,
      status: "scheduled",
    });
    if (insE) errors.push(insE.message);
    else runsCreated++;
  }

  let overdueQuery = client
    .from("checklist_runs")
    .select("id, organization_id, unit_id, checklist_id, due_at, status, late_alert_sent_at")
    .in("status", ["scheduled", "in_progress"])
    .lt("due_at", nowIso)
    .is("late_alert_sent_at", null);

  if (orgFilter?.length) {
    overdueQuery = overdueQuery.in("organization_id", orgFilter);
  }

  const { data: overdue, error: e2 } = await overdueQuery;
  if (e2) {
    errors.push(e2.message);
    return { runsCreated, lateAlerts, errors };
  }

  const newLateMeta: { id: string; checklistId: string; unitId: string; dueAt: string }[] = [];

  for (const r of overdue ?? []) {
    const { data: ch } = await client.from("checklists").select("name").eq("id", r.checklist_id).single();
    const { data: un } = await client.from("units").select("name").eq("id", r.unit_id).single();
    const checklistName = ch?.name ?? "Checklist";
    const unitName = un?.name ?? "Unidade";
    const whenLocal = DateTime.fromISO(r.due_at as string, { zone: "utc" }).setZone(zone).toFormat("dd/LL/yyyy HH:mm");
    const msg = `Execução atrasada: ${checklistName} (${unitName}) — prazo ${whenLocal}`;

    const { error: aE } = await client.from("alerts").insert({
      organization_id: r.organization_id,
      run_id: r.id,
      message: msg,
      severity: "warning",
    });
    if (aE) {
      errors.push(aE.message);
      continue;
    }

    const { error: uE } = await client
      .from("checklist_runs")
      .update({ status: "late", late_alert_sent_at: nowIso })
      .eq("id", r.id);
    if (uE) errors.push(uE.message);
    else {
      lateAlerts++;
      newLateMeta.push({
        id: r.id as string,
        checklistId: r.checklist_id as string,
        unitId: r.unit_id as string,
        dueAt: r.due_at as string,
      });
    }
  }

  if (getTelegramConfig().enabled && newLateMeta.length) {
    for (const r of newLateMeta) {
      const { data: ch } = await client.from("checklists").select("name").eq("id", r.checklistId).single();
      const { data: un } = await client.from("units").select("name").eq("id", r.unitId).single();
      const checklist = ch?.name ?? "Checklist";
      const unit = un?.name ?? "Unidade";
      const when = DateTime.fromISO(r.dueAt, { zone: "utc" }).setZone(zone).toFormat("dd/LL/yyyy HH:mm");
      const text =
        `⚠️ Logos Koncui — execução ATRASADA\n` +
        `• Checklist: ${checklist}\n` +
        `• Unidade: ${unit}\n` +
        `• Prazo: ${when}\n` +
        `• ID: ${r.id}`;
      const res = await sendTelegramMessage(text);
      if (!res.ok) errors.push(res.error);
    }
  }

  return { runsCreated, lateAlerts, errors };
}
