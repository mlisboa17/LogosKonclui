/**
 * Bot API do Telegram (servidor apenas — nunca exponha o token ao browser).
 * @see https://core.telegram.org/bots/api#sendmessage
 */

export type TelegramConfig = {
  botToken: string;
  chatId: string;
  enabled: true;
};

export function getTelegramConfig(): TelegramConfig | { enabled: false } {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) {
    return { enabled: false };
  }
  return { enabled: true, botToken, chatId };
}

export async function sendTelegramMessage(text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled) {
    return { ok: false, error: "Telegram não configurado (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)." };
  }

  const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: cfg.chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const body = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !body.ok) {
    return { ok: false, error: body.description ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
