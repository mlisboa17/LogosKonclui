"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/env";

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured = getSupabasePublicEnv().isConfigured;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!configured) {
      setMsg("Configure as variáveis do Supabase no .env.local.");
      return;
    }
    if (!/^\d{4,8}$/.test(password)) {
      setMsg("Defina um PIN numérico de 4 a 8 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() || undefined },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      setMsg("Conta criada. Verifique o e-mail ou entre se a confirmação estiver desligada no Supabase.");
      router.push("/entrar");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nome completo
        <input
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
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
        PIN numérico
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
        />
      </label>
      {msg && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300" role="status">
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
      >
        {loading ? "Criando…" : "Criar conta"}
      </button>
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Entrar
        </Link>
      </p>
    </form>
  );
}
