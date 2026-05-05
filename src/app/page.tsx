import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-emerald-950 via-zinc-950 to-black text-zinc-100">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6">
        <span className="text-lg font-semibold tracking-tight text-white">Logos Koncui</span>
        <div className="flex gap-3 text-sm">
          <Link href="/entrar" className="rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/10">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white hover:bg-emerald-500"
          >
            Cadastrar
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-4 pb-24 pt-12 text-center sm:pt-20">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400/90">
          Operação em padrão
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
          Checklists para conveniência e loja no detalhe
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
          Organização, abastecimento de{" "}
          <strong className="font-medium text-zinc-300">freezers</strong>,{" "}
          <strong className="font-medium text-zinc-300">cervejeiras</strong>,{" "}
          <strong className="font-medium text-zinc-300">prateleiras</strong>,{" "}
          <strong className="font-medium text-zinc-300">expositores</strong> e rotinas de{" "}
          <strong className="font-medium text-zinc-300">limpeza</strong>. Modelos editáveis, execução com
          prazo e evidência por foto quando a sua operação exigir.
        </p>
        <p className="mx-auto mt-6 max-w-lg text-sm text-zinc-500">
          Para testar sem base de dados: em <code className="rounded bg-white/10 px-1">.env.local</code> use{" "}
          <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_DATA_MODE=json</code> — dados ficam em{" "}
          <code className="rounded bg-white/10 px-1">data/prototype-state.json</code> (só na sua máquina).
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/painel"
            className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-medium text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500"
          >
            Ir ao painel
          </Link>
          <Link
            href="/cadastro"
            className="rounded-xl border border-zinc-600 px-6 py-3 text-base font-medium text-zinc-200 hover:bg-white/5"
          >
            Criar conta
          </Link>
        </div>
      </main>
    </div>
  );
}
