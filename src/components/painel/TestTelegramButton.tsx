"use client";

import { useState, useTransition } from "react";
import { testTelegramMessage } from "@/actions/telegram";

export function TestTelegramButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const r = await testTelegramMessage();
            if (r.ok) setMsg("Mensagem enviada. Verifique o Telegram.");
            else setMsg(r.error);
          });
        }}
        className="w-fit rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar mensagem de teste"}
      </button>
      {msg && <p className="text-sm text-zinc-700 dark:text-zinc-300">{msg}</p>}
    </div>
  );
}
