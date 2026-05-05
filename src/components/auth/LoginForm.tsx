"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/env";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/painel";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured = getSupabasePublicEnv().isConfigured;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!configured) {
      setMsg("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      {!configured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          Supabase não configurado. Crie o projeto em{" "}
          <a
            className="underline"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            supabase.com
          </a>{" "}
          e copie as variáveis para <code className="rounded bg-black/5 px-1">.env.local</code>.
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-mail
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Senha
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
      {msg && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Cadastrar
        </Link>
      </p>
    </form>
  );
}
