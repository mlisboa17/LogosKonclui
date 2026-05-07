/**
 * Bot API do Telegram (servidor apenas — nunca exponha o token ao browser).
 * @see https://core.telegram.org/bots/api#sendmessage
 */

const SEND_TIMEOUT_MS = 20_000;

/** Chat ID: inteiro (utilizador/grupo/supergrupo) ou @channelusername */
export function isPlausibleTelegramChatId(chatId: string): boolean {
  const s = chatId.trim();
  if (!s.length || s.length > 128) return false;
  if (s.startsWith("@")) return /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(s);
  return /^-?\d+$/.test(s);
}

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
  if (!isPlausibleTelegramChatId(chatId)) {
    return { enabled: false };
  }
  return { enabled: true, botToken, chatId };
}

export async function sendTelegramMessage(text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled) {
    const rawId = process.env.TELEGRAM_CHAT_ID?.trim();
    if (rawId && !isPlausibleTelegramChatId(rawId)) {
      return { ok: false, error: "TELEGRAM_CHAT_ID inválido (use ID numérico ou @canal)." };
    }
    return { ok: false, error: "Telegram não configurado (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)." };
  }

  const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isAbort =
      msg.includes("abort") || msg.includes("Abort") || msg.includes("cancel") || msg.includes("timed out");
    return {
      ok: false,
      error: isAbort ? `Timeout ou rede (${SEND_TIMEOUT_MS}ms): ${msg}` : `Rede: ${msg}`,
    };
  }

  let body: { ok?: boolean; description?: string };
  try {
    body = (await res.json()) as { ok?: boolean; description?: string };
  } catch {
    return { ok: false, error: `Resposta inválida da API (HTTP ${res.status})` };
  }
  if (!res.ok || !body.ok) {
    return { ok: false, error: body.description ?? `HTTP ${res.status}` };
  }
  return { ok: true };
}
