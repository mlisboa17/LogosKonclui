import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function EntrarPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-400"
        >
          ← Voltar
        </Link>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Painel do grupo — checklists, unidades e alertas.
        </p>
        <Suspense fallback={<p className="text-sm text-zinc-500">Carregando…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
