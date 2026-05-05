"use server";

import { getTelegramConfig, sendTelegramMessage } from "@/lib/telegram";

export async function testTelegramMessage() {
  const cfg = getTelegramConfig();
  if (!cfg.enabled) {
    return { ok: false as const, error: "Defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no .env.local (servidor)." };
  }
  const res = await sendTelegramMessage(
    "✅ Logos Koncui — teste de integração Telegram.\n\nSe recebeu esta mensagem, o bot está correto.",
  );
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const };
}
