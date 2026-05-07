"use server";

import { getTelegramConfig, isPlausibleTelegramChatId, sendTelegramMessage } from "@/lib/telegram";

export async function testTelegramMessage() {
  const cfg = getTelegramConfig();
  if (!cfg.enabled) {
    const rawId = process.env.TELEGRAM_CHAT_ID?.trim();
    const chatHint =
      rawId && !isPlausibleTelegramChatId(rawId)
        ? " TELEGRAM_CHAT_ID não parece válido (ID numérico ou @canal)."
        : "";
    return {
      ok: false as const,
      error: `Defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no servidor.${chatHint}`,
    };
  }
  const res = await sendTelegramMessage(
    "✅ Logos Konclui — teste de integração Telegram.\n\nSe recebeu esta mensagem, o bot está correto.",
  );
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const };
}
