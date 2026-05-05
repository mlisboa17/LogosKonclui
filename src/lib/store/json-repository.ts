import { DEMO_CHECKLIST_TEMPLATES } from "@/lib/demo-checklist-templates";
import type {
  AppState,
  ChecklistRun,
  ChecklistSchedule,
  ItemType,
  RunStatus,
  UnitType,
} from "./types";
import { readAppState, withAppStateLock } from "./file-store";

function id() {
  return crypto.randomUUID();
}

export async function jsonCreateOrganization(
  name: string,
): Promise<{ error: string } | { data: { id: string } }> {
  return withAppStateLock<{ error: string } | { data: { id: string } }>(async (s) => {
    const row = { id: id(), name: name.trim(), createdAt: new Date().toISOString() };
    if (!row.name) return { next: s, result: { error: "Nome obrigatório." as const } };
    return {
      next: { ...s, organizations: [row, ...s.organizations] },
      result: { data: { id: row.id } },
    };
  });
}

export async function jsonCreateUnit(input: {
  organizationId: string;
  name: string;
  unitType: UnitType;
  city?: string | null;
}): Promise<{ error: string } | { ok: true }> {
  return withAppStateLock<{ error: string } | { ok: true }>(async (s) => {
    const row = {
      id: id(),
      organizationId: input.organizationId,
      name: input.name.trim(),
      unitType: input.unitType,
      city: input.city?.trim() || null,
    };
    if (!row.name) return { next: s, result: { error: "Nome obrigatório." as const } };
    return {
      next: { ...s, units: [...s.units, row] },
      result: { ok: true as const },
    };
  });
}

export async function jsonUpdateUnit(input: {
  unitId: string;
  organizationId: string;
  name: string;
  unitType: UnitType;
  city?: string | null;
}): Promise<{ error: string } | { ok: true }> {
  return withAppStateLock<{ error: string } | { ok: true }>(async (s) => {
    const u = s.units.find(
      (x) => x.id === input.unitId && x.organizationId === input.organizationId,
    );
    if (!u) return { next: s, result: { error: "Unidade não encontrada." } };
    const name = input.name.trim();
    if (!name) return { next: s, result: { error: "Nome obrigatório." } };
    const next = s.units.map((x) =>
      x.id === input.unitId
        ? { ...x, name, unitType: input.unitType, city: input.city?.trim() || null }
        : x,
    );
    return { next: { ...s, units: next }, result: { ok: true as const } };
  });
}

export async function jsonDeleteUnit(input: {
  unitId: string;
  organizationId: string;
}): Promise<{ error: string } | { ok: true }> {
  return withAppStateLock<{ error: string } | { ok: true }>(async (s) => {
    const u = s.units.find(
      (x) => x.id === input.unitId && x.organizationId === input.organizationId,
    );
    if (!u) return { next: s, result: { error: "Unidade não encontrada." } };
    const hasRuns = s.checklistRuns.some(
      (r) => r.unitId === input.unitId && r.organizationId === input.organizationId,
    );
    if (hasRuns) {
      return {
        next: s,
        result: { error: "Não é possível apagar: existem execuções nesta unidade." },
      };
    }
    const unitChecklists = s.checklists.filter((c) => c.unitId === input.unitId);
    const chIds = new Set(unitChecklists.map((c) => c.id));
    return {
      next: {
        ...s,
        units: s.units.filter((x) => x.id !== input.unitId),
        checklists: s.checklists.filter((c) => c.unitId !== input.unitId),
        checklistItems: s.checklistItems.filter((i) => !chIds.has(i.checklistId)),
        checklistSchedules: (s.checklistSchedules ?? []).filter((sch) => !chIds.has(sch.checklistId)),
      },
      result: { ok: true as const },
    };
  });
}

export async function jsonSeedDemoTemplates(organizationId: string): Promise<{ ok: true }> {
  return withAppStateLock<{ ok: true }>(async (s) => {
    const existing = new Set(
      s.checklistTemplates.filter((t) => t.organizationId === organizationId).map((t) => t.name),
    );
    const next: AppState = {
      ...s,
      checklistTemplates: [...s.checklistTemplates],
      checklistTemplateItems: [...s.checklistTemplateItems],
    };
    for (const d of DEMO_CHECKLIST_TEMPLATES) {
      if (existing.has(d.name)) continue;
      const tplId = id();
      next.checklistTemplates.push({
        id: tplId,
        organizationId,
        name: d.name,
        sector: d.sector,
        description: d.description,
      });
      d.items.forEach((it, i) => {
        next.checklistTemplateItems.push({
          id: id(),
          templateId: tplId,
          title: it.title,
          sortOrder: i,
          itemType: it.itemType as ItemType,
          isCritical: it.isCritical,
          weight: it.weight,
          requiresPhoto: it.requiresPhoto === true,
        });
      });
      existing.add(d.name);
    }
    return { next, result: { ok: true as const } };
  });
}

export async function jsonCreateSchedule(input: {
  checklistId: string;
  timeLocal: string;
  daysOfWeek: number[];
}): Promise<{ error: string } | { id: string }> {
  return withAppStateLock<{ error: string } | { id: string }>(async (s) => {
    const ch = s.checklists.find((c) => c.id === input.checklistId);
    if (!ch?.unitId) return { next: s, result: { error: "Checklist inválida ou sem unidade." } };
    if (!input.daysOfWeek.length) return { next: s, result: { error: "Escolha pelo menos um dia da semana." } };
    const row: ChecklistSchedule = {
      id: id(),
      checklistId: input.checklistId,
      timeLocal: input.timeLocal.trim(),
      daysOfWeek: [...new Set(input.daysOfWeek)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    return {
      next: { ...s, checklistSchedules: [...(s.checklistSchedules ?? []), row] },
      result: { id: row.id },
    };
  });
}

export async function jsonDeleteSchedule(scheduleId: string): Promise<{ ok: true } | { error: string }> {
  return withAppStateLock<{ ok: true } | { error: string }>(async (s) => {
    const next = (s.checklistSchedules ?? []).filter((x) => x.id !== scheduleId);
    if (next.length === (s.checklistSchedules ?? []).length) {
      return { next: s, result: { error: "Agendamento não encontrado." } };
    }
    return { next: { ...s, checklistSchedules: next }, result: { ok: true as const } };
  });
}

export async function jsonCreateChecklistFromTemplate(input: {
  organizationId: string;
  unitId: string;
  templateId: string;
}): Promise<{ error: string } | { checklistId: string }> {
  return withAppStateLock<{ error: string } | { checklistId: string }>(async (s) => {
    const tpl = s.checklistTemplates.find((t) => t.id === input.templateId);
    if (!tpl || tpl.organizationId !== input.organizationId) {
      return { next: s, result: { error: "Modelo não encontrado." as const } };
    }
    const items = s.checklistTemplateItems
      .filter((i) => i.templateId === input.templateId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const checklistId = id();
    const newChecklist = {
      id: checklistId,
      organizationId: input.organizationId,
      unitId: input.unitId,
      templateId: input.templateId,
      name: tpl.name,
      isActive: true,
    };
    const newItems = items.map((it) => ({
      id: id(),
      checklistId,
      title: it.title,
      sortOrder: it.sortOrder,
      itemType: it.itemType,
      isCritical: it.isCritical,
      weight: it.weight,
      requiresPhoto: it.requiresPhoto === true,
    }));
    return {
      next: {
        ...s,
        checklists: [...s.checklists, newChecklist],
        checklistItems: [...s.checklistItems, ...newItems],
      },
      result: { checklistId },
    };
  });
}

export async function jsonCreateChecklistScratch(input: {
  organizationId: string;
  unitId: string;
  name: string;
  items: {
    title: string;
    itemType: ItemType;
    isCritical: boolean;
    weight: number;
    requiresPhoto: boolean;
  }[];
}): Promise<{ error: string } | { checklistId: string }> {
  return withAppStateLock<{ error: string } | { checklistId: string }>(async (s) => {
    const u = s.units.find((x) => x.id === input.unitId && x.organizationId === input.organizationId);
    if (!u) return { next: s, result: { error: "Unidade inválida." as const } };
    const name = input.name.trim();
    if (!name) return { next: s, result: { error: "Nome obrigatório." as const } };
    const cleaned = input.items.filter((x) => x.title.trim());
    if (!cleaned.length) {
      return { next: s, result: { error: "Adicione pelo menos um item." as const } };
    }
    const checklistId = id();
    const newChecklist = {
      id: checklistId,
      organizationId: input.organizationId,
      unitId: input.unitId,
      templateId: null as string | null,
      name,
      isActive: true,
    };
    const newItems = cleaned.map((it, i) => ({
      id: id(),
      checklistId,
      title: it.title.trim(),
      sortOrder: i,
      itemType: it.itemType,
      isCritical: it.isCritical,
      weight: Math.max(1, Math.min(10, it.weight)),
      requiresPhoto: it.requiresPhoto,
    }));
    return {
      next: {
        ...s,
        checklists: [...s.checklists, newChecklist],
        checklistItems: [...s.checklistItems, ...newItems],
      },
      result: { checklistId },
    };
  });
}

export async function jsonDuplicatePublishedChecklist(input: {
  organizationId: string;
  unitId: string;
  sourceChecklistId: string;
  newName: string;
}): Promise<{ error: string } | { checklistId: string }> {
  return withAppStateLock<{ error: string } | { checklistId: string }>(async (s) => {
    const u = s.units.find((x) => x.id === input.unitId && x.organizationId === input.organizationId);
    if (!u) return { next: s, result: { error: "Unidade inválida." as const } };
    const src = s.checklists.find(
      (c) => c.id === input.sourceChecklistId && c.organizationId === input.organizationId,
    );
    if (!src) return { next: s, result: { error: "Checklist de origem não encontrada." as const } };
    let nm = input.newName.trim();
    if (!nm) nm = `${src.name.trim() || "Checklist"} (cópia)`;
    const srcItems = s.checklistItems
      .filter((i) => i.checklistId === input.sourceChecklistId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const checklistId = id();
    const newChecklist = {
      id: checklistId,
      organizationId: input.organizationId,
      unitId: input.unitId,
      templateId: null as string | null,
      name: nm,
      isActive: true,
    };
    const newItems = srcItems.map((it, i) => ({
      id: id(),
      checklistId,
      title: it.title,
      sortOrder: i,
      itemType: it.itemType,
      isCritical: it.isCritical,
      weight: it.weight,
      requiresPhoto: it.requiresPhoto === true,
    }));
    return {
      next: {
        ...s,
        checklists: [...s.checklists, newChecklist],
        checklistItems: [...s.checklistItems, ...newItems],
      },
      result: { checklistId },
    };
  });
}

export async function jsonCreateRun(input: {
  organizationId: string;
  unitId: string;
  checklistId: string;
  dueAtIso: string;
}): Promise<{ error: string } | { runId: string }> {
  return withAppStateLock<{ error: string } | { runId: string }>(async (s) => {
    const due = new Date(input.dueAtIso);
    if (Number.isNaN(due.getTime())) {
      return { next: s, result: { error: "Data inválida." as const } };
    }
    const run: ChecklistRun = {
      id: id(),
      organizationId: input.organizationId,
      unitId: input.unitId,
      checklistId: input.checklistId,
      dueAt: due.toISOString(),
      status: "scheduled",
      lateAlertSentAt: null,
    };
    return {
      next: { ...s, checklistRuns: [...s.checklistRuns, run] },
      result: { runId: run.id },
    };
  });
}

export async function jsonSetRunStatus(runId: string, status: RunStatus): Promise<{ ok: true }> {
  return withAppStateLock<{ ok: true }>(async (s) => {
    const now = new Date().toISOString();
    const runs = s.checklistRuns.map((r) => {
      if (r.id !== runId) return r;
      const patch: ChecklistRun = { ...r, status };
      if (status === "in_progress") patch.startedAt = r.startedAt ?? now;
      if (status === "completed") patch.completedAt = now;
      return patch;
    });
    return { next: { ...s, checklistRuns: runs }, result: { ok: true as const } };
  });
}

export async function jsonUpsertResponse(input: {
  runId: string;
  checklistItemId: string;
  completed?: boolean;
  note?: string | null;
  numeric_value?: number | null;
  text_value?: string | null;
  photo_path?: string | null;
  photo_evidence_caption?: string | null;
}): Promise<{ ok: true }> {
  return withAppStateLock<{ ok: true }>(async (s) => {
    const idx = s.checklistRunResponses.findIndex(
      (r) => r.runId === input.runId && r.checklistItemId === input.checklistItemId,
    );
    const prev = idx >= 0 ? s.checklistRunResponses[idx] : null;
    const prevPath = (prev?.photoPath ?? "").trim();
    const pathIncoming = input.photo_path !== undefined;
    const nextPath = pathIncoming
      ? (input.photo_path?.trim() ?? "")
      : prevPath;
    let photoEvidenceCaption = prev?.photoEvidenceCaption ?? null;
    if (pathIncoming) {
      if (!nextPath) photoEvidenceCaption = null;
      else if (nextPath !== prevPath && input.photo_evidence_caption !== undefined) {
        photoEvidenceCaption = input.photo_evidence_caption;
      }
    } else if (input.photo_evidence_caption !== undefined) {
      photoEvidenceCaption = input.photo_evidence_caption;
    }
    const row = {
      id: idx >= 0 ? s.checklistRunResponses[idx].id : id(),
      runId: input.runId,
      checklistItemId: input.checklistItemId,
      completed: input.completed !== undefined ? input.completed : (prev?.completed ?? false),
      note: input.note !== undefined ? input.note : (prev?.note ?? null),
      numericValue:
        input.numeric_value !== undefined ? input.numeric_value : (prev?.numericValue ?? null),
      textValue: input.text_value !== undefined ? input.text_value : (prev?.textValue ?? null),
      photoPath: input.photo_path !== undefined ? input.photo_path : (prev?.photoPath ?? null),
      photoEvidenceCaption,
    };
    const list = [...s.checklistRunResponses];
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    return { next: { ...s, checklistRunResponses: list }, result: { ok: true as const } };
  });
}

/** Leituras sem escrita — sem lock (pode ler estado ligeiramente defasado). */
export async function jsonReadQueries() {
  const s = await readAppState();
  const defaultOrg = s.organizations[0] ?? null;

  return {
    state: s,
    defaultOrg,
    counts(orgId: string) {
      const unitCount = s.units.filter((u) => u.organizationId === orgId).length;
      const templateCount = s.checklistTemplates.filter((t) => t.organizationId === orgId).length;
      const runOpen = s.checklistRuns.filter(
        (r) =>
          r.organizationId === orgId &&
          (r.status === "scheduled" || r.status === "in_progress" || r.status === "late"),
      ).length;
      return { unitCount, templateCount, runOpen };
    },
    units(orgId: string) {
      return s.units.filter((u) => u.organizationId === orgId).sort((a, b) => a.name.localeCompare(b.name));
    },
    templates(orgId: string) {
      return s.checklistTemplates.filter((t) => t.organizationId === orgId).sort((a, b) => a.name.localeCompare(b.name));
    },
    templateItemCounts(orgId: string) {
      const tplIds = new Set(s.checklistTemplates.filter((t) => t.organizationId === orgId).map((t) => t.id));
      const map = new Map<string, number>();
      for (const it of s.checklistTemplateItems) {
        if (!tplIds.has(it.templateId)) continue;
        map.set(it.templateId, (map.get(it.templateId) ?? 0) + 1);
      }
      return map;
    },
    checklists(orgId: string) {
      return s.checklists.filter((c) => c.organizationId === orgId).sort((a, b) => a.name.localeCompare(b.name));
    },
    runs(orgId: string) {
      return [...s.checklistRuns]
        .filter((r) => r.organizationId === orgId)
        .sort((a, b) => new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime())
        .slice(0, 40);
    },
    runsForList(orgId: string) {
      return this.runs(orgId).map((r) => ({
        id: r.id,
        due_at: r.dueAt,
        status: r.status,
        checklistName: s.checklists.find((c) => c.id === r.checklistId)?.name ?? "Checklist",
        unitName: s.units.find((u) => u.id === r.unitId)?.name ?? "Unidade",
      }));
    },
    getRun(orgId: string, runId: string) {
      const run = s.checklistRuns.find((r) => r.id === runId && r.organizationId === orgId);
      if (!run) return null;
      const checklist = s.checklists.find((c) => c.id === run.checklistId);
      const unit = s.units.find((u) => u.id === run.unitId);
      const items = s.checklistItems
        .filter((i) => i.checklistId === run.checklistId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const responses = s.checklistRunResponses.filter((r) => r.runId === runId);
      return { run, checklist, unit, items, responses };
    },
    schedulesForOrg(orgId: string) {
      const cids = new Set(s.checklists.filter((c) => c.organizationId === orgId).map((c) => c.id));
      return (s.checklistSchedules ?? [])
        .filter((sch) => cids.has(sch.checklistId))
        .map((sch) => ({
          ...sch,
          checklistName: s.checklists.find((c) => c.id === sch.checklistId)?.name ?? "Checklist",
        }));
    },
    alertsForOrg(orgId: string, limit = 30) {
      return [...(s.alerts ?? [])]
        .filter((a) => a.organizationId === orgId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    },
  };
}
