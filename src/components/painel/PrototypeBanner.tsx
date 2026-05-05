import { isJsonStoreMode } from "@/lib/data-mode";

export function PrototypeBanner() {
  if (!isJsonStoreMode()) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <strong>Modo protótipo (JSON):</strong> dados em{" "}
      <code className="rounded bg-black/10 px-1">data/prototype-state.json</code> — só no seu computador.
      Deploy serverless não persiste este ficheiro. Alertas opcionais via{" "}
      <a href="/painel/telegram" className="font-medium underline">
        Telegram
      </a>{" "}
      (API gratuita do bot; configure o token no servidor).
    </div>
  );
}
