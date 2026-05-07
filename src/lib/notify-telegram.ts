import { isJsonStoreMode } from "@/lib/data-mode";
import { readAppState } from "@/lib/store/file-store";
import { getTelegramConfig, sendTelegramMessage } from "@/lib/telegram";
import { createClient } from "@/lib/supabase/server";

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Notificação ao agendar uma execução (não bloqueia o fluxo se falhar). */
export async function notifyTelegramRunScheduled(runId: string): Promise<void> {
  if (!getTelegramConfig().enabled) return;

  try {
    let checklist = "Checklist";
    let unit = "Unidade";
    let when = "";

    if (isJsonStoreMode()) {
      const s = await readAppState();
      const run = s.checklistRuns.find((r) => r.id === runId);
      if (!run) return;
      when = fmtWhen(run.dueAt);
      checklist = s.checklists.find((c) => c.id === run.checklistId)?.name ?? checklist;
      unit = s.units.find((u) => u.id === run.unitId)?.name ?? unit;
    } else {
      const supabase = await createClient();
      if (!supabase) return;
      const { data: row } = await supabase
        .from("checklist_runs")
        .select("due_at, checklists(name), units(name)")
        .eq("id", runId)
        .single();
      if (!row) return;
      when = fmtWhen(row.due_at as string);
      const cl = row.checklists as unknown as { name: string } | null;
      const un = row.units as unknown as { name: string } | null;
      checklist = cl?.name ?? checklist;
      unit = un?.name ?? unit;
    }

    const text =
      `📋 Logos Konclui — nova execução\n` +
      `• Checklist: ${checklist}\n` +
      `• Unidade: ${unit}\n` +
      `• Prazo: ${when}\n` +
      `• ID: ${runId}`;

    const res = await sendTelegramMessage(text);
    if (!res.ok) {
      console.error("[notifyTelegramRunScheduled] Telegram", { runId, error: res.error });
    }
  } catch (e) {
    console.error("[notifyTelegramRunScheduled]", e);
  }
}

export async function notifyTelegramRunCompleted(runId: string): Promise<void> {
  if (!getTelegramConfig().enabled) return;

  try {
    let checklist = "Checklist";
    let unit = "Unidade";

    if (isJsonStoreMode()) {
      const s = await readAppState();
      const run = s.checklistRuns.find((r) => r.id === runId);
      if (!run) return;
      checklist = s.checklists.find((c) => c.id === run.checklistId)?.name ?? checklist;
      unit = s.units.find((u) => u.id === run.unitId)?.name ?? unit;
    } else {
      const supabase = await createClient();
      if (!supabase) return;
      const { data: row } = await supabase
        .from("checklist_runs")
        .select("checklists(name), units(name)")
        .eq("id", runId)
        .single();
      if (!row) return;
      const cl = row.checklists as unknown as { name: string } | null;
      const un = row.units as unknown as { name: string } | null;
      checklist = cl?.name ?? checklist;
      unit = un?.name ?? unit;
    }

    const text =
      `✅ Logos Konclui — execução concluída\n` +
      `• Checklist: ${checklist}\n` +
      `• Unidade: ${unit}\n` +
      `• ID: ${runId}`;

    const res = await sendTelegramMessage(text);
    if (!res.ok) {
      console.error("[notifyTelegramRunCompleted] Telegram", { runId, error: res.error });
    }
  } catch (e) {
    console.error("[notifyTelegramRunCompleted]", e);
  }
}
