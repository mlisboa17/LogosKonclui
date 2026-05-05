"use server";

import { revalidatePath } from "next/cache";
import { assertOrgManagementPermission } from "@/lib/org-access";
import { createClient } from "@/lib/supabase/server";

export type TemplateItemInput = {
  title: string;
  item_type: "boolean" | "number" | "text" | "photo";
  is_critical: boolean;
  weight?: number;
};

export async function saveChecklistTemplate(input: {
  organizationId: string;
  templateId: string;
  name: string;
  sector: string;
  description: string;
  items: TemplateItemInput[];
}) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { error: "Sessão inválida." };

  const perm = await assertOrgManagementPermission(
    supabase,
    input.organizationId,
    "manage_templates",
  );
  if ("error" in perm) return perm;

  const { data: tpl, error: tErr } = await supabase
    .from("checklist_templates")
    .select("id, organization_id")
    .eq("id", input.templateId)
    .single();

  if (tErr || !tpl || tpl.organization_id !== input.organizationId) {
    return { error: "Modelo não encontrado." };
  }

  const name = input.name.trim();
  if (!name) return { error: "Nome obrigatório." };
  if (!input.items.length) return { error: "Adicione pelo menos um item." };

  const { error: uErr } = await supabase
    .from("checklist_templates")
    .update({
      name,
      sector: input.sector.trim() || null,
      description: input.description.trim() || null,
    })
    .eq("id", input.templateId);

  if (uErr) return { error: uErr.message };

  const { error: dErr } = await supabase
    .from("checklist_template_items")
    .delete()
    .eq("template_id", input.templateId);

  if (dErr) return { error: dErr.message };

  const rows = input.items.map((it, i) => ({
    template_id: input.templateId,
    title: it.title.trim(),
    sort_order: i,
    item_type: it.item_type,
    is_critical: it.is_critical,
    weight: Math.max(1, Math.min(10, it.weight ?? 1)),
  }));

  const { error: iErr } = await supabase.from("checklist_template_items").insert(rows);
  if (iErr) return { error: iErr.message };

  revalidatePath("/painel/modelos");
  revalidatePath(`/painel/modelos/${input.templateId}`);
  revalidatePath("/painel/checklists");
  return { ok: true as const };
}
