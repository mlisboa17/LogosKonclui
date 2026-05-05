import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "@/lib/store/types";

export type PainelKpisToday = {
  label: string;
  totalDueToday: number;
  completed: number;
  onTime: number;
  /** Atrasadas: status `late` ou concluidas depois do prazo */
  late: number;
  missed: number;
  scheduled: number;
  inProgress: number;
  /** Concluídas / total com prazo hoje (0–100) */
  completionRate: number | null;
  openAlerts: number;
};

function scheduleTz(): string {
  return process.env.SCHEDULE_TIMEZONE?.trim() || "America/Sao_Paulo";
}

export function todayUtcRange(): { startIso: string; endIso: string; label: string } {
  const tz = scheduleTz();
  const local = DateTime.now().setZone(tz);
  const start = local.startOf("day").toUTC();
  const end = local.endOf("day").toUTC();
  return {
    startIso: start.toISO()!,
    endIso: end.toISO()!,
    label: `Hoje (${tz})`,
  };
}

function runDueInWindow(dueAt: string, startIso: string, endIso: string): boolean {
  const due = DateTime.fromISO(dueAt, { zone: "utc" });
  const start = DateTime.fromISO(startIso, { zone: "utc" });
  const end = DateTime.fromISO(endIso, { zone: "utc" });
  return due >= start && due <= end;
}

export function computeKpisFromRuns(
  runs: { due_at: string; status: string; completed_at: string | null }[],
  startIso: string,
  endIso: string,
  openAlerts: number,
  label: string,
): PainelKpisToday {
  const today = runs.filter((r) => runDueInWindow(r.due_at, startIso, endIso));
  let completed = 0;
  let onTime = 0;
  let late = 0;
  let missed = 0;
  let scheduled = 0;
  let inProgress = 0;

  for (const r of today) {
    const dueMs = new Date(r.due_at).getTime();
    const caMs = r.completed_at ? new Date(r.completed_at).getTime() : null;

    if (r.status === "completed" && caMs != null) {
      completed += 1;
      if (caMs <= dueMs) onTime += 1;
      else late += 1;
      continue;
    }
    if (r.status === "missed") {
      missed += 1;
      continue;
    }
    if (r.status === "late") {
      late += 1;
      continue;
    }
    if (r.status === "scheduled") scheduled += 1;
    else if (r.status === "in_progress") inProgress += 1;
  }

  const totalDueToday = today.length;
  const completionRate =
    totalDueToday > 0 ? Math.min(100, Math.round((completed / totalDueToday) * 1000) / 10) : null;

  return {
    label,
    totalDueToday,
    completed,
    onTime,
    late,
    missed,
    scheduled,
    inProgress,
    completionRate,
    openAlerts,
  };
}

export async function fetchPainelKpisSupabase(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { unitId?: string | null },
): Promise<PainelKpisToday> {
  const { startIso, endIso, label } = todayUtcRange();
  const unitId = options?.unitId?.trim() || null;

  let runsQ = supabase
    .from("checklist_runs")
    .select("due_at, status, completed_at")
    .eq("organization_id", organizationId)
    .gte("due_at", startIso)
    .lte("due_at", endIso);
  if (unitId) {
    runsQ = runsQ.eq("unit_id", unitId);
  }

  const [{ data: runs, error: e1 }, { count: alertCount, error: e2 }] = await Promise.all([
    runsQ,
    supabase
      .from("alerts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("acknowledged_at", null),
  ]);

  if (e1) console.error(e1);
  if (e2) console.error(e2);

  const rows =
    runs?.map((r) => ({
      due_at: r.due_at as string,
      status: r.status as string,
      completed_at: (r.completed_at as string | null) ?? null,
    })) ?? [];

  const labelWithUnit = unitId ? `${label} · unidade filtrada` : label;
  return computeKpisFromRuns(rows, startIso, endIso, alertCount ?? 0, labelWithUnit);
}

export function computePainelKpisJson(
  state: AppState,
  organizationId: string,
  options?: { unitId?: string | null },
): PainelKpisToday {
  const { startIso, endIso, label } = todayUtcRange();
  const unitId = options?.unitId?.trim() || null;
  const runs = state.checklistRuns
    .filter((r) => r.organizationId === organizationId && (!unitId || r.unitId === unitId))
    .map((r) => ({
      due_at: r.dueAt,
      status: r.status,
      completed_at: r.completedAt ?? null,
    }));
  const weekAgo = DateTime.now().minus({ days: 7 }).toISO()!;
  const openAlerts = (state.alerts ?? []).filter(
    (a) => a.organizationId === organizationId && a.createdAt >= weekAgo,
  ).length;
  const labelWithUnit = unitId ? `${label} · unidade filtrada` : label;
  return computeKpisFromRuns(runs, startIso, endIso, openAlerts, labelWithUnit);
}
