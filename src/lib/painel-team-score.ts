import { DateTime } from "luxon";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TeamMemberScoreRow = {
  userId: string;
  displayName: string;
  role: string;
  /** Execuções atribuídas no período (com prazo nos últimos 30 dias) */
  runsConsidered: number;
  /** 0–100 estilo Koncluí: no prazo / (concluídas + falhas) */
  punctualityPct: number | null;
};

function scheduleTz(): string {
  return process.env.SCHEDULE_TIMEZONE?.trim() || "America/Sao_Paulo";
}

function since30dUtc(): string {
  const tz = scheduleTz();
  return DateTime.now().setZone(tz).minus({ days: 30 }).startOf("day").toUTC().toISO()!;
}

function punctualityFromRuns(
  rows: { status: string; due_at: string; completed_at: string | null }[],
): { runsConsidered: number; punctualityPct: number | null } {
  let onTime = 0;
  let closed = 0;
  for (const r of rows) {
    if (r.status === "completed" && r.completed_at) {
      closed += 1;
      const due = new Date(r.due_at).getTime();
      const ca = new Date(r.completed_at).getTime();
      if (ca <= due) onTime += 1;
      continue;
    }
    if (r.status === "missed") {
      closed += 1;
    }
  }
  if (closed === 0) return { runsConsidered: rows.length, punctualityPct: null };
  return {
    runsConsidered: rows.length,
    punctualityPct: Math.round((onTime / closed) * 1000) / 10,
  };
}

export async function fetchTeamScoresSupabase(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<TeamMemberScoreRow[]> {
  const since = since30dUtc();

  const { data: members, error: mErr } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", organizationId);

  if (mErr || !members?.length) return [];

  const userIds = [...new Set(members.map((m) => m.user_id as string))];

  const [{ data: profiles }, { data: runs, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds),
    supabase
      .from("checklist_runs")
      .select("assigned_user_id, status, due_at, completed_at")
      .eq("organization_id", organizationId)
      .gte("due_at", since)
      .not("assigned_user_id", "is", null),
  ]);

  if (rErr) console.error(rErr);

  const nameById = new Map<string, string>();
  for (const p of profiles ?? []) {
    const id = p.id as string;
    const fn = (p.full_name as string | null)?.trim();
    nameById.set(id, fn || `Utilizador ${id.slice(0, 8)}…`);
  }

  const runsByUser = new Map<string, { status: string; due_at: string; completed_at: string | null }[]>();
  for (const uid of userIds) runsByUser.set(uid, []);
  for (const r of runs ?? []) {
    const uid = r.assigned_user_id as string | null;
    if (!uid) continue;
    const list = runsByUser.get(uid);
    if (!list) continue;
    list.push({
      status: r.status as string,
      due_at: r.due_at as string,
      completed_at: (r.completed_at as string | null) ?? null,
    });
  }

  const roleByUser = new Map(userIds.map((id) => {
    const m = members.find((x) => x.user_id === id);
    return [id, (m?.role as string) ?? "member"] as const;
  }));

  return userIds.map((userId) => {
    const list = runsByUser.get(userId) ?? [];
    const { runsConsidered, punctualityPct } = punctualityFromRuns(list);
    return {
      userId,
      displayName: nameById.get(userId) ?? `Utilizador ${userId.slice(0, 8)}…`,
      role: roleByUser.get(userId) ?? "member",
      runsConsidered,
      punctualityPct,
    };
  });
}
