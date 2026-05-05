"use server";

import { revalidatePath } from "next/cache";
import { DEMO_CHECKLIST_TEMPLATES } from "@/lib/demo-checklist-templates";
import { assertOrgManagementPermission } from "@/lib/org-access";
import { isJsonStoreMode } from "@/lib/data-mode";
import type { ChecklistItemDraftInput } from "@/lib/checklist-item-draft";
import {
  jsonCreateChecklistFromTemplate,
  jsonCreateChecklistScratch,
  jsonDuplicatePublishedChecklist,
  jsonSeedDemoTemplates,
} from "@/lib/store/json-repository";
import { createClient } from "@/lib/supabase/server";

export async function createChecklistFromTemplate(input: {
  organizationId: string;
  unitId: string;
  templateId: string;
}) {
  if (isJsonStoreMode()) {
    const res = await jsonCreateChecklistFromTemplate(input);
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel/checklists");
    return { checklistId: res.checklistId };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_checklists");
  if ("error" in gate) return gate;

  const { data: tpl, error: e1 } = await supabase
    .from("checklist_templates")
    .select("id, name, organization_id")
    .eq("id", input.templateId)
    .single();

  if (e1 || !tpl) return { error: "Modelo não encontrado." };
  if (tpl.organization_id !== input.organizationId) {
    return { error: "Modelo não pertence à organização." };
  }

  const { data: items, error: e2 } = await supabase
    .from("checklist_template_items")
    .select("title, sort_order, item_type, is_critical, weight, requires_photo")
    .eq("template_id", input.templateId)
    .order("sort_order", { ascending: true });

  if (e2) return { error: e2.message };

  const { data: checklist, error: e3 } = await supabase
    .from("checklists")
    .insert({
      organization_id: input.organizationId,
      unit_id: input.unitId,
      template_id: input.templateId,
      name: tpl.name,
    })
    .select("id")
    .single();

  if (e3 || !checklist) return { error: e3?.message ?? "Falha ao criar checklist." };

  if (items?.length) {
    const { error: e4 } = await supabase.from("checklist_items").insert(
      items.map((it: (typeof items)[number]) => ({
        checklist_id: checklist.id,
        title: it.title,
        sort_order: it.sort_order,
        item_type: it.item_type,
        is_critical: it.is_critical,
        weight: it.weight,
        requires_photo: Boolean((it as { requires_photo?: boolean }).requires_photo),
      })),
    );
    if (e4) return { error: e4.message };
  }

  revalidatePath("/painel/checklists");
  return { checklistId: checklist.id };
}

export async function createTemplateWithItems(input: {
  organizationId: string;
  name: string;
  description?: string;
  sector?: string;
  items: { title: string; is_critical?: boolean }[];
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_templates");
  if ("error" in gate) return gate;

  const name = input.name.trim();
  if (!name) return { error: "Informe o nome do modelo." };

  const { data: tpl, error: e1 } = await supabase
    .from("checklist_templates")
    .insert({
      organization_id: input.organizationId,
      name,
      description: input.description?.trim() || null,
      sector: input.sector?.trim() || null,
    })
    .select("id")
    .single();

  if (e1 || !tpl) return { error: e1?.message ?? "Falha ao criar modelo." };

  if (input.items.length) {
    const { error: e2 } = await supabase.from("checklist_template_items").insert(
      input.items.map((it, i) => ({
        template_id: tpl.id,
        title: it.title.trim(),
        sort_order: i,
        is_critical: Boolean(it.is_critical),
      })),
    );
    if (e2) return { error: e2.message };
  }

  revalidatePath("/painel/modelos");
  return { templateId: tpl.id };
}

export async function seedDemoTemplates(organizationId: string) {
  if (isJsonStoreMode()) {
    await jsonSeedDemoTemplates(organizationId);
    revalidatePath("/painel/modelos");
    return { ok: true as const };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, organizationId, "manage_templates");
  if ("error" in gate) return gate;

  const { data: existingNames } = await supabase
    .from("checklist_templates")
    .select("name")
    .eq("organization_id", organizationId);
  const have = new Set((existingNames ?? []).map((r) => r.name as string));

  for (const d of DEMO_CHECKLIST_TEMPLATES) {
    if (have.has(d.name)) continue;
    const { data: tpl, error } = await supabase
      .from("checklist_templates")
      .insert({
        organization_id: organizationId,
        name: d.name,
        sector: d.sector,
        description: d.description,
      })
      .select("id")
      .single();
    if (error || !tpl) continue;
    await supabase.from("checklist_template_items").insert(
      d.items.map((it, i) => ({
        template_id: tpl.id,
        title: it.title,
        sort_order: i,
        item_type: it.itemType,
        is_critical: it.isCritical,
        weight: it.weight,
        requires_photo: it.requiresPhoto === true,
      })),
    );
    have.add(d.name);
  }

  revalidatePath("/painel/modelos");
  return { ok: true as const };
}

export async function createChecklistFromScratch(input: {
  organizationId: string;
  unitId: string;
  name: string;
  items: ChecklistItemDraftInput[];
}) {
  if (isJsonStoreMode()) {
    const res = await jsonCreateChecklistScratch({
      organizationId: input.organizationId,
      unitId: input.unitId,
      name: input.name,
      items: input.items.map((it) => ({
        title: it.title,
        itemType: it.item_type,
        isCritical: it.is_critical,
        weight: Math.max(1, Math.min(10, it.weight ?? 1)),
        requiresPhoto: it.requires_photo,
      })),
    });
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel/checklists");
    return { checklistId: res.checklistId };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_checklists");
  if ("error" in gate) return gate;

  const { data: unitRow } = await supabase
    .from("units")
    .select("id")
    .eq("id", input.unitId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (!unitRow) return { error: "Unidade inválida." };

  const title = input.name.trim();
  if (!title) return { error: "Informe o nome do checklist." };
  const cleaned = input.items
    .map((it) => ({
      title: it.title.trim(),
      item_type: it.item_type,
      is_critical: it.is_critical,
      weight: Math.max(1, Math.min(10, it.weight ?? 1)),
      requires_photo: it.requires_photo,
    }))
    .filter((it) => it.title.length > 0);
  if (!cleaned.length) return { error: "Adicione pelo menos um item." };

  const { data: checklist, error: ce } = await supabase
    .from("checklists")
    .insert({
      organization_id: input.organizationId,
      unit_id: input.unitId,
      template_id: null,
      name: title,
    })
    .select("id")
    .single();

  if (ce || !checklist) return { error: ce?.message ?? "Falha ao criar checklist." };

  const { error: ie } = await supabase.from("checklist_items").insert(
    cleaned.map((it, i) => ({
      checklist_id: checklist.id,
      title: it.title,
      sort_order: i,
      item_type: it.item_type,
      is_critical: it.is_critical,
      weight: it.weight,
      requires_photo: it.requires_photo,
    })),
  );
  if (ie) return { error: ie.message };

  revalidatePath("/painel/checklists");
  return { checklistId: checklist.id };
}

export async function duplicatePublishedChecklist(input: {
  organizationId: string;
  unitId: string;
  sourceChecklistId: string;
  newName: string;
}) {
  if (isJsonStoreMode()) {
    const res = await jsonDuplicatePublishedChecklist({
      organizationId: input.organizationId,
      unitId: input.unitId,
      sourceChecklistId: input.sourceChecklistId,
      newName: input.newName,
    });
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel/checklists");
    return { checklistId: res.checklistId };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_checklists");
  if ("error" in gate) return gate;

  const { data: unitRow } = await supabase
    .from("units")
    .select("id")
    .eq("id", input.unitId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (!unitRow) return { error: "Unidade inválida." };

  const { data: src, error: se } = await supabase
    .from("checklists")
    .select("id, name")
    .eq("id", input.sourceChecklistId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (se || !src) return { error: "Checklist de origem não encontrada." };

  let name = input.newName.trim();
  if (!name) {
    const base = String(src.name ?? "Checklist").trim() || "Checklist";
    name = `${base} (cópia)`;
  }

  const { data: srcItems, error: sie } = await supabase
    .from("checklist_items")
    .select("title, item_type, is_critical, weight, requires_photo, sort_order")
    .eq("checklist_id", input.sourceChecklistId)
    .order("sort_order", { ascending: true });
  if (sie) return { error: sie.message };

  const { data: checklist, error: ce } = await supabase
    .from("checklists")
    .insert({
      organization_id: input.organizationId,
      unit_id: input.unitId,
      template_id: null,
      name,
    })
    .select("id")
    .single();

  if (ce || !checklist) return { error: ce?.message ?? "Falha ao duplicar." };

  if (srcItems?.length) {
    const { error: ie } = await supabase.from("checklist_items").insert(
      srcItems.map((it: (typeof srcItems)[number], i: number) => ({
        checklist_id: checklist.id,
        title: it.title,
        sort_order: i,
        item_type: it.item_type,
        is_critical: it.is_critical,
        weight: it.weight,
        requires_photo: Boolean((it as { requires_photo?: boolean }).requires_photo),
      })),
    );
    if (ie) return { error: ie.message };
  }

  revalidatePath("/painel/checklists");
  return { checklistId: checklist.id };
}

