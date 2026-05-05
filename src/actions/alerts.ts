"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function acknowledgeAlert(alertId: string) {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase não configurado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão inválida." };

  const { data: alert, error: aErr } = await supabase
    .from("alerts")
    .select("id, organization_id, acknowledged_at")
    .eq("id", alertId)
    .single();

  if (aErr || !alert) return { error: "Alerta não encontrado." };
  if (alert.acknowledged_at) return { error: "Já reconhecido." };

  const { data: mem } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", alert.organization_id)
    .maybeSingle();

  if (!mem) return { error: "Sem acesso a este alerta." };

  const { error } = await supabase
    .from("alerts")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) return { error: error.message };
  revalidatePath("/painel");
  return { ok: true as const };
}
