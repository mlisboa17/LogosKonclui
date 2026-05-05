import Link from "next/link";
import { TestTelegramButton } from "@/components/painel/TestTelegramButton";
import { getTelegramConfig } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export default function TelegramPage() {
  const tg = getTelegramConfig();

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/painel" className="text-sm text-emerald-800 hover:underline dark:text-emerald-400">
        ← Painel
      </Link>
      <h1 className="text-2xl font-semibold">Telegram</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        O Telegram é gratuito para uso comum do Bot API. Você só precisa criar um bot e colocar o token e o{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">chat_id</code> no servidor (
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">.env.local</code>) — não use variáveis{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">NEXT_PUBLIC_*</code> para o token.
      </p>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Passos</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            No Telegram, fale com{" "}
            <a
              href="https://t.me/BotFather"
              className="text-sky-600 underline dark:text-sky-400"
              target="_blank"
              rel="noreferrer"
            >
              @BotFather
            </a>
            , envie <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">/newbot</code> e guarde o{" "}
            <strong>token</strong>.
          </li>
          <li>
            Inicie uma conversa com o seu bot (botão Start) para poder receber mensagens.
          </li>
          <li>
            Obtenha o seu <strong>chat_id</strong>: envie uma mensagem ao bot, depois abra no navegador a URL{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">https://api.telegram.org/botSEU_TOKEN/getUpdates</code>{" "}
            e procure o número em <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">chat → id</code>. Em
            grupos, o id costuma ser negativo. Alternativa: o bot{" "}
            <a href="https://t.me/userinfobot" className="text-sky-600 underline dark:text-sky-400" target="_blank" rel="noreferrer">
              @userinfobot
            </a>
            .
          </li>
          <li>
            No <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.env.local</code>:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
{`TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=123456789`}
            </pre>
          </li>
          <li>Reinicie <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">npm run dev</code>.</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Estado</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {tg.enabled ? (
            <span className="text-emerald-700 dark:text-emerald-400">Token e chat configurados neste servidor.</span>
          ) : (
            <span>Telegram ainda não configurado neste ambiente.</span>
          )}
        </p>
        <div className="mt-4">
          <TestTelegramButton />
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        <p>
          Com dados em <strong>JSON</strong>, ao criar uma execução com prazo ou ao concluir uma execução, o sistema
          tenta enviar uma mensagem ao Telegram (se estiver configurado). Falhas de rede não impedem guardar no
          ficheiro.
        </p>
      </section>
    </div>
  );
}
