"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "@/app/login/actions";

type Item = {
  nome: string;
  href: string;
  exato?: boolean;
  extras?: string[]; // rotas irmãs que também acendem este item
  icone: React.ReactNode;
};

const ic = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.split("|").map((p, i) => (
      <path key={i} d={p} />
    ))}
  </svg>
);

const MENU: Item[] = [
  { nome: "Painel", href: "/gestao", exato: true, icone: ic("M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10") },
  { nome: "Cadastros", href: "/gestao/cadastros", extras: ["/gestao/produtos", "/gestao/categorias", "/gestao/fornecedores", "/gestao/clientes", "/gestao/listas-preco", "/gestao/taxas-cartao", "/gestao/maquininhas"], icone: ic("M20 7 12 3 4 7v10l8 4 8-4Z|M4 7l8 4 8-4|M12 21V11") },
  { nome: "Compras", href: "/gestao/compras", icone: ic("M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|M3 6h18|M16 10a4 4 0 0 1-8 0") },
  { nome: "Estoque", href: "/gestao/estoque", icone: ic("M3 7h18v13H3z|M3 7l2-4h14l2 4|M9 12h6") },
  { nome: "Vendas", href: "/gestao/vendas", icone: ic("M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|M3 6h18|M16 10a4 4 0 0 1-8 0") },
  { nome: "Orçamentos", href: "/gestao/orcamentos", icone: ic("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M9 13h6|M9 17h4") },
  { nome: "Contas a receber", href: "/gestao/contas-receber", icone: ic("M12 1v22|M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6") },
  { nome: "Caixa", href: "/gestao/caixa", icone: ic("M2 7h20v12H2z|M2 7l3-4h14l3 4|M16 13h2") },
  { nome: "Contas", href: "/gestao/contas", extras: ["/gestao/transferencias", "/gestao/conciliacao"], icone: ic("M3 10h18|M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z|M7 15h4") },
  { nome: "Financeiro", href: "/gestao/financeiro", extras: ["/gestao/fluxo-caixa"], icone: ic("M3 3v18h18|M7 14l4-4 3 3 5-6") },
  { nome: "CRM & Preços", href: "/gestao/crm", icone: ic("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 7a4 4 0 1 1 0 .01|M22 21v-2a4 4 0 0 0-3-3.87") },
  { nome: "Relatórios", href: "/gestao/relatorios", icone: ic("M4 4v16h16|M8 16V10|M12 16V6|M16 16v-4") },
  { nome: "Usuários", href: "/gestao/usuarios", icone: ic("M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 7a4 4 0 1 1 0 .01|M19 8v6|M22 11h-6") },
];

/** Menu lateral fixo do Modo Gestão (só desktop; no mobile a BarraTopo assume). */
export function SidebarGestao({ nome }: { nome: string }) {
  const pathname = usePathname();
  const primeiroNome = nome.trim().split(/\s+/)[0] || "você";

  const casa = (base: string) =>
    pathname === base || pathname.startsWith(base + "/");
  const ativo = (item: Item) =>
    item.exato
      ? pathname === item.href
      : casa(item.href) || (item.extras ?? []).some(casa);

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-line bg-surface sticky top-0 h-screen">
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-line shrink-0">
        <span className="w-9 h-9 rounded-lg bg-accent text-white grid place-items-center text-sm font-extrabold tracking-tight">
          JS
        </span>
        <span className="leading-tight">
          <span className="block text-ink font-bold text-[15px]">JS Importados</span>
          <span className="block text-muted text-[11px] font-mono uppercase tracking-wider">
            Modo Gestão
          </span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
        {MENU.map((item) => {
          const on = ativo(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-semibold transition-colors ${
                on
                  ? "bg-accent-soft text-accent-ink"
                  : "text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <span className={on ? "text-accent-ink" : "text-muted"}>{item.icone}</span>
              {item.nome}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3 flex flex-col gap-2 shrink-0">
        <Link
          href="/balcao"
          className="flex items-center justify-center h-10 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Ver balcão
        </Link>
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-sm text-muted truncate">
            Olá, <b className="text-ink">{primeiroNome}</b>
          </span>
          <form action={sair}>
            <button
              type="submit"
              className="h-9 inline-flex items-center rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:bg-surface-2 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
