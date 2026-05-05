import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function CadastroPage() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-emerald-800 hover:underline dark:text-emerald-400"
        >
          ← Voltar
        </Link>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Conta única para toda a equipa. Depois do registo, o <strong>gestor</strong> vai a{" "}
          <strong>Painel → Equipe</strong> e adiciona o teu utilizador como <strong>operador</strong> (ou
          gestor) com o mesmo email — não existe um formulário separado só para operadores.
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}
