"use server";

import { revalidatePath } from "next/cache";
import { isJsonStoreMode } from "@/lib/data-mode";
import { notifyTelegramRunCompleted, notifyTelegramRunScheduled } from "@/lib/notify-telegram";
import { readAppState } from "@/lib/store/file-store";
import {
  jsonCreateRun,
  jsonSetRunStatus,
  jsonUpsertResponse,
} from "@/lib/store/json-repository";
import type { ChecklistItem, ChecklistRunResponse } from "@/lib/store/types";
import {
  firstUnsatisfiedItemTitle,
  type RunResponseForValidation,
} from "@/lib/run-item-validation";
import { createClient } from "@/lib/supabase/server";

async function validateCompletionSupabase(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  runId: string,
): Promise<{ ok: true } | { error: string }> {
  const { data: run, error: rErr } = await supabase
    .from("checklist_runs")
    .select("checklist_id")
    .eq("id", runId)
    .single();
  if (rErr || !run) return { error: "Execução não encontrada." };

  const [{ data: items }, { data: responses }] = await Promise.all([
    supabase
      .from("checklist_items")
      .select("id, title, item_type, is_critical, requires_photo")
      .eq("checklist_id", run.checklist_id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("checklist_run_responses")
      .select("checklist_item_id, completed, numeric_value, text_value, photo_path")
      .eq("run_id", runId),
  ]);

  const list = (items ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    item_type: row.item_type as string,
    is_critical: Boolean(row.is_critical),
    requires_photo: Boolean((row as { requires_photo?: boolean }).requires_photo),
  }));
  const res = (responses ?? []) as RunResponseForValidation[];
  const pending = firstUnsatisfiedItemTitle(list, res);
  if (pending) return { error: `Ainda pendente: ${pending}` };
  return { ok: true };
}

async function validateCompletionJsonAsync(runId: string): Promise<{ ok: true } | { error: string }> {
  const s = await readAppState();
  const run = s.checklistRuns.find((r) => r.id === runId);
  if (!run) return { error: "Execução não encontrada." };
  const items: ChecklistItem[] = s.checklistItems
    .filter((i) => i.checklistId === run.checklistId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const responsesRaw = s.checklistRunResponses.filter((r) => r.runId === runId);
  const res: RunResponseForValidation[] = responsesRaw.map((r: ChecklistRunResponse) => ({
    checklist_item_id: r.checklistItemId,
    completed: r.completed,
    numeric_value: r.numericValue ?? null,
    text_value: r.textValue ?? null,
    photo_path: r.photoPath ?? null,
  }));
  const list = items.map((i) => ({
    id: i.id,
    title: i.title,
    item_type: i.itemType,
    is_critical: i.isCritical,
    requires_photo: i.requiresPhoto === true,
  }));
  const pending = firstUnsatisfiedItemTitle(list, res);
  if (pending) return { error: `Ainda pendente: ${pending}` };
  return { ok: true };
}

export async function createChecklistRun(input: {
  organizationId: string;
  unitId: string;
  checklistId: string;
  dueAtIso: string;
  assignedUserId?: string | null;
}) {
  if (isJsonStoreMode()) {
    const res = await jsonCreateRun({
      organizationId: input.organizationId,
      unitId: input.unitId,
      checklistId: input.checklistId,
      dueAtIso: input.dueAtIso,
    });
    if ("error" in res) return { error: res.error };
    void notifyTelegramRunScheduled(res.runId);
    revalidatePath("/painel/minhas-tarefas");
    revalidatePath("/painel");
    return { runId: res.runId };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };
  const due = new Date(input.dueAtIso);
  if (Number.isNaN(due.getTime())) return { error: "Data inválida." };

  const { data, error } = await supabase
    .from("checklist_runs")
    .insert({
      organization_id: input.organizationId,
      unit_id: input.unitId,
      checklist_id: input.checklistId,
      due_at: due.toISOString(),
      assigned_user_id: input.assignedUserId ?? null,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  void notifyTelegramRunScheduled(data.id);
  revalidatePath("/painel/minhas-tarefas");
  revalidatePath("/painel");
  return { runId: data.id };
}

/** Hora do servidor para sincronizar marca d'água textual com o carimbo gravado na base. */
export async function getEvidenceStampTime() {
  return { iso: new Date().toISOString() };
}

export async function setRunStatus(
  runId: string,
  status: "in_progress" | "completed" | "late" | "missed" | "scheduled",
) {
  if (status === "completed") {
    if (isJsonStoreMode()) {
      const v = await validateCompletionJsonAsync(runId);
      if ("error" in v) return { error: v.error };
    } else {
      const supabase = await createClient();
      if (!supabase) return { error: "Supabase não configurado." };
      const v = await validateCompletionSupabase(supabase, runId);
      if ("error" in v) return { error: v.error };
    }
  }

  if (isJsonStoreMode()) {
    await jsonSetRunStatus(runId, status);
    if (status === "completed") void notifyTelegramRunCompleted(runId);
    revalidatePath("/painel/minhas-tarefas");
    revalidatePath(`/painel/execucoes/${runId}`);
    return { ok: true as const };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };
  const patch: Record<string, string> = { status };
  if (status === "in_progress") patch.started_at = new Date().toISOString();
  if (status === "completed") patch.completed_at = new Date().toISOString();

  const { error } = await supabase.from("checklist_runs").update(patch).eq("id", runId);

  if (error) return { error: error.message };
  if (status === "completed") void notifyTelegramRunCompleted(runId);
  revalidatePath("/painel/minhas-tarefas");
  revalidatePath(`/painel/execucoes/${runId}`);
  return { ok: true as const };
}

export async function upsertItemResponse(input: {
  runId: string;
  checklistItemId: string;
  completed?: boolean;
  note?: string | null;
  numeric_value?: number | null;
  text_value?: string | null;
  photo_path?: string | null;
  /** Modo JSON: legenda fixada no envio da foto (modo desenvolvimento). */
  photo_evidence_caption?: string | null;
}) {
  if (isJsonStoreMode()) {
    await jsonUpsertResponse(input);
    revalidatePath(`/painel/execucoes/${input.runId}`);
    return { ok: true as const };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const { data: existing } = await supabase
    .from("checklist_run_responses")
    .select(
      "completed, note, numeric_value, text_value, photo_path, photo_uploaded_at, photo_uploaded_by",
    )
    .eq("run_id", input.runId)
    .eq("checklist_item_id", input.checklistItemId)
    .maybeSingle();

  const normalizePath = (p: unknown) =>
    typeof p === "string" ? p.trim() : "";
  const prevPhoto = normalizePath(existing?.photo_path);
  const incomingPhotoDefined = input.photo_path !== undefined;
  const nextPhoto = incomingPhotoDefined
    ? normalizePath(input.photo_path) || null
    : normalizePath(existing?.photo_path) || null;

  let photo_uploaded_at: string | null =
    (existing?.photo_uploaded_at as string | null | undefined) ?? null;
  let photo_uploaded_by: string | null =
    (existing?.photo_uploaded_by as string | null | undefined) ?? null;

  if (incomingPhotoDefined) {
    const nextTrim = nextPhoto ?? "";
    if (!nextTrim) {
      photo_uploaded_at = null;
      photo_uploaded_by = null;
    } else if (nextTrim !== prevPhoto) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      photo_uploaded_at = new Date().toISOString();
      photo_uploaded_by = user?.id ?? null;
    }
  }

  const row = {
    run_id: input.runId,
    checklist_item_id: input.checklistItemId,
    completed: input.completed !== undefined ? input.completed : (existing?.completed ?? false),
    note: input.note !== undefined ? input.note : (existing?.note ?? null),
    numeric_value:
      input.numeric_value !== undefined ? input.numeric_value : (existing?.numeric_value ?? null),
    text_value: input.text_value !== undefined ? input.text_value : (existing?.text_value ?? null),
    photo_path: input.photo_path !== undefined ? input.photo_path : (existing?.photo_path ?? null),
    photo_uploaded_at,
    photo_uploaded_by,
    responded_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("checklist_run_responses").upsert(row, {
    onConflict: "run_id,checklist_item_id",
  });

  if (error) return { error: error.message };
  revalidatePath(`/painel/execucoes/${input.runId}`);
  return { ok: true as const };
}
