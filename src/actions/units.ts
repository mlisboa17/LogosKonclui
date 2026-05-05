"use server";

import { revalidatePath } from "next/cache";
import { assertOrgManagementPermission } from "@/lib/org-access";
import { isJsonStoreMode } from "@/lib/data-mode";
import {
  jsonCreateUnit,
  jsonDeleteUnit,
  jsonUpdateUnit,
} from "@/lib/store/json-repository";
import { createClient } from "@/lib/supabase/server";

export type UnitType = "convenience" | "gas_station" | "restaurant" | "other";

export async function createUnit(input: {
  organizationId: string;
  name: string;
  unitType: UnitType;
  city?: string;
}) {
  if (isJsonStoreMode()) {
    const res = await jsonCreateUnit({
      organizationId: input.organizationId,
      name: input.name,
      unitType: input.unitType,
      city: input.city,
    });
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel/unidades");
    return { ok: true as const };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_units");
  if ("error" in gate) return gate;

  const name = input.name.trim();
  if (!name) return { error: "Informe o nome da unidade." };

  const { error } = await supabase.from("units").insert({
    organization_id: input.organizationId,
    name,
    unit_type: input.unitType,
    city: input.city?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/painel/unidades");
  return { ok: true as const };
}

export async function updateUnit(input: {
  organizationId: string;
  unitId: string;
  name: string;
  unitType: UnitType;
  city?: string;
}) {
  if (isJsonStoreMode()) {
    const res = await jsonUpdateUnit({
      organizationId: input.organizationId,
      unitId: input.unitId,
      name: input.name,
      unitType: input.unitType,
      city: input.city,
    });
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel/unidades");
    return { ok: true as const };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_units");
  if ("error" in gate) return gate;

  const name = input.name.trim();
  if (!name) return { error: "Informe o nome da unidade." };

  const { error } = await supabase
    .from("units")
    .update({
      name,
      unit_type: input.unitType,
      city: input.city?.trim() || null,
    })
    .eq("id", input.unitId)
    .eq("organization_id", input.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/painel/unidades");
  return { ok: true as const };
}

export async function deleteUnit(input: { organizationId: string; unitId: string }) {
  if (isJsonStoreMode()) {
    const res = await jsonDeleteUnit({
      organizationId: input.organizationId,
      unitId: input.unitId,
    });
    if ("error" in res) return { error: res.error };
    revalidatePath("/painel/unidades");
    return { ok: true as const };
  }

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const gate = await assertOrgManagementPermission(supabase, input.organizationId, "manage_units");
  if ("error" in gate) return gate;

  const { error } = await supabase
    .from("units")
    .delete()
    .eq("id", input.unitId)
    .eq("organization_id", input.organizationId);

  if (error) return { error: error.message };
  revalidatePath("/painel/unidades");
  return { ok: true as const };
}
