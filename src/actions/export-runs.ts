"use server";

import { isJsonStoreMode } from "@/lib/data-mode";
import { getSessionContext } from "@/lib/data/memberships";
import { readAppState } from "@/lib/store/file-store";
import { createClient } from "@/lib/supabase/server";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportRunsCsvAction(organizationId: string): Promise<
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string }
> {
  if (isJsonStoreMode()) {
    const s = await readAppState();
    const org = s.organizations.find((o) => o.id === organizationId);
    if (!org) return { ok: false, error: "Organização não encontrada." };
    const runs = s.checklistRuns
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime());
    const header = [
      "id",
      "checklist",
      "unidade",
      "prazo",
      "status",
      "concluido_em",
    ].join(",");
    const lines = runs.map((r) => {
      const cl = s.checklists.find((c) => c.id === r.checklistId)?.name ?? "";
      const un = s.units.find((u) => u.id === r.unitId)?.name ?? "";
      return [
        csvEscape(r.id),
        csvEscape(cl),
        csvEscape(un),
        csvEscape(r.dueAt),
        csvEscape(r.status),
        csvEscape(r.completedAt ?? ""),
      ].join(",");
    });
    const csv = [header, ...lines].join("\n");
    return { ok: true, csv, filename: `execucoes-${organizationId.slice(0, 8)}.csv` };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Supabase não configurado." };
  const ctx = await getSessionContext(supabase);
  if (!ctx.user) return { ok: false, error: "Não autenticado." };
  if (!ctx.organizations.some((o) => o.id === organizationId)) {
    return { ok: false, error: "Sem acesso a esta organização." };
  }

  const { data: runs, error } = await supabase
    .from("checklist_runs")
    .select(
      "id, due_at, status, completed_at, assigned_user_id, checklists(name), units(name)",
    )
    .eq("organization_id", organizationId)
    .order("due_at", { ascending: false })
    .limit(500);

  if (error) return { ok: false, error: error.message };

  const header = [
    "id",
    "checklist",
    "unidade",
    "prazo",
    "status",
    "concluido_em",
    "atribuido_user_id",
  ].join(",");

  const lines = (runs ?? []).map((r) => {
    const cl = (r.checklists as unknown as { name: string } | null)?.name ?? "";
    const un = (r.units as unknown as { name: string } | null)?.name ?? "";
    return [
      csvEscape(r.id as string),
      csvEscape(cl),
      csvEscape(un),
      csvEscape(String(r.due_at)),
      csvEscape(String(r.status)),
      csvEscape(r.completed_at ? String(r.completed_at) : ""),
      csvEscape(r.assigned_user_id ? String(r.assigned_user_id) : ""),
    ].join(",");
  });

  const csv = [header, ...lines].join("\n");
  return { ok: true, csv, filename: `execucoes-${organizationId.slice(0, 8)}.csv` };
}
