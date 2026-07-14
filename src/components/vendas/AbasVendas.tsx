import Link from "next/link";

/**
 * Alternador Vendas | Orçamentos. Orçamento saiu do menu lateral e virou uma
 * aba aqui — é o mesmo assunto (uma proposta que vira venda), então não merecia
 * um item próprio no menu.
 */
export function AbasVendas({ atual }: { atual: "vendas" | "orcamentos" }) {
  const abas = [
    { chave: "vendas" as const, nome: "Vendas", href: "/gestao/vendas" },
    { chave: "orcamentos" as const, nome: "Orçamentos", href: "/gestao/orcamentos" },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-surface-2 border border-line w-fit mb-4">
      {abas.map((a) => {
        const on = a.chave === atual;
        return (
          <Link
            key={a.chave}
            href={a.href}
            aria-current={on ? "page" : undefined}
            className={`h-9 inline-flex items-center rounded-lg px-4 text-sm font-semibold transition-colors ${
              on ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-muted hover:text-ink"
            }`}
          >
            {a.nome}
          </Link>
        );
      })}
    </div>
  );
}
