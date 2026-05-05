import Link from "next/link";
import { OrganizationCreateForm } from "@/components/painel/OrganizationCreateForm";

export default function NovaOrganizacaoPage() {
  return (
    <div>
      <Link href="/painel" className="mb-6 inline-block text-sm text-emerald-800 hover:underline dark:text-emerald-400">
        ← Painel
      </Link>
      <h1 className="mb-2 text-2xl font-semibold">Nova organização</h1>
      <p className="mb-8 max-w-lg text-sm text-zinc-600 dark:text-zinc-400">
        Uma organização agrupa todas as unidades (lojas de conveniência, postos e restaurantes) que você
        gerencia neste painel.
      </p>
      <OrganizationCreateForm />
    </div>
  );
}
