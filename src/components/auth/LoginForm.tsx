"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicEnv } from "@/lib/env";

type LoginMode = "pin" | "otp";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/painel";
  const [mode, setMode] = useState<LoginMode>("pin");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured = getSupabasePublicEnv().isConfigured;

  async function onSubmitPin(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!configured) {
      setMsg("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) {
      setMsg("Use um PIN numérico de 4 a 8 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pin,
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      setPin("");
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function sendOtpCode() {
    setMsg(null);
    if (!configured) {
      setMsg("Configure as variáveis do Supabase.");
      return;
    }
    const em = email.trim();
    if (!em) {
      setMsg("Indique o e-mail.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: em,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      setOtpSent(true);
      setMsg("Código enviado. Abra o e-mail neste dispositivo ou noutro por si confiável.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpAndEnter(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!configured) return;
    const em = email.trim();
    const code = otp.replace(/\s/g, "");
    if (!em || code.length < 6) {
      setMsg("Cole ou escreva o código de 6 dígitos.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email: em,
        token: code,
        type: "email",
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      setOtp("");
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
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

      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
        <strong>Aparelhos partilhados:</strong> prefira <strong>PIN numérico</strong> curto por colaborador e
        nunca partilhe a conta. Se possível, use também <strong>código por e-mail</strong> (sem senha no
        teclado) e toque em         <strong>Sair</strong> no modo operador ao terminar. A sessão fica em cookies até
        expirar ou sair — a app não guarda o PIN após o login.
      </p>

      <div className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-200 p-1 sm:grid-cols-2 dark:border-zinc-700">
        <button
          type="button"
          className={`rounded-md py-2 text-sm font-medium transition ${
            mode === "pin"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
          onClick={() => {
            setMode("pin");
            setMsg(null);
            setOtpSent(false);
          }}
        >
          PIN numérico
        </button>
        <button
          type="button"
          className={`rounded-md py-2 text-sm font-medium transition ${
            mode === "otp"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
          onClick={() => {
            setMode("otp");
            setMsg(null);
            setOtpSent(false);
          }}
        >
          Código no e-mail
        </button>
      </div>

      {mode === "pin" ? (
        <form onSubmit={onSubmitPin} autoComplete="off" className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            E-mail
            <input
              type="email"
              autoComplete="username"
              inputMode="email"
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
              autoComplete="current-password"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          <p className="text-xs text-zinc-500">
            Para não gravar o PIN no telemóvel: desative &quot;Guardar passwords&quot; do browser para este
            site ou use o separador &quot;código por e-mail&quot;.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtpAndEnter} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium">
            E-mail{" "}
            <span className="text-xs font-normal text-zinc-500">
              (conta já registada — veja Cadastrar primeiro)
            </span>
            <input
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              disabled={otpSent}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base disabled:opacity-70 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </label>
          {!otpSent ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void sendOtpCode()}
              className="rounded-lg border border-emerald-800 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
            >
              {loading ? "A enviar…" : "Enviar código para o e-mail"}
            </button>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Código de 6 dígitos
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9\s]*"
                  placeholder="123456"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 8))}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-lg tracking-widest dark:border-zinc-600 dark:bg-zinc-900"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {loading ? "A verificar…" : "Entrar com o código"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setMsg(null);
                }}
                className="text-center text-xs text-zinc-500 underline"
              >
                Voltar ao passo do e-mail
              </button>
            </>
          )}
          <p className="text-xs text-zinc-500">
            No painel Supabase: Authentication → Providers → Email: confirme que o login por e-mail está
            ativo. Se só receber link em vez de código, abra o link no mesmo telemóvel ou use o fluxo com
            PIN.
          </p>
        </form>
      )}

      {msg && (
        <p
          className={`text-sm ${msg.startsWith("Código enviado") ? "text-zinc-700 dark:text-zinc-300" : "text-red-600 dark:text-red-400"}`}
          role="status"
        >
          {msg}
        </p>
      )}

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-emerald-700 underline dark:text-emerald-400">
          Cadastrar
        </Link>
      </p>
    </div>
  );
}
