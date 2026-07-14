import type { ReactNode } from "react";
import { createElement } from "react";

/**
 * Fonte ÚNICA do menu da Gestão. O menu lateral (desktop) e o menu mobile
 * (hambúrguer) consomem daqui — antes cada um tinha a própria lista à mão, e
 * elas divergiam (a grade do painel tinha Backup, o sidebar não).
 *
 * Os itens estão agrupados por frequência de uso: o que se faz todo dia fica
 * em cima; o que é setup (cadastros, ajustes) fica na zona discreta do rodapé.
 */

export type ItemMenu = {
  nome: string;
  href: string;
  /** casa só na rota exata (usado no Painel) */
  exato?: boolean;
  /** rotas irmãs que também acendem este item */
  extras?: string[];
  /** rotas que NÃO devem acender este item, mesmo casando por prefixo */
  exceto?: string[];
  icone: ReactNode;
};

export type GrupoMenu = {
  /** null = sem título (Painel, e a zona de setup no rodapé) */
  titulo: string | null;
  /** desenha um separador antes do grupo (zona de setup) */
  separar?: boolean;
  itens: ItemMenu[];
};

const ic = (d: string): ReactNode =>
  createElement(
    "svg",
    {
      width: 20,
      height: 20,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    d.split("|").map((p, i) => createElement("path", { key: i, d: p })),
  );

export const MENU_GESTAO: GrupoMenu[] = [
  {
    titulo: null,
    itens: [
      {
        nome: "Painel",
        href: "/gestao",
        exato: true,
        icone: ic("M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z|M9 22V12h6v10"),
      },
    ],
  },
  {
    titulo: "Dia a dia",
    itens: [
      {
        nome: "Vendas",
        href: "/gestao/vendas",
        // Orçamento virou aba de Vendas: a rota continua viva e acende aqui.
        extras: ["/gestao/orcamentos"],
        icone: ic("M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|M3 6h18|M16 10a4 4 0 0 1-8 0"),
      },
      {
        nome: "Caixa",
        href: "/gestao/caixa",
        icone: ic("M2 7h20v12H2z|M2 7l3-4h14l3 4|M16 13h2"),
      },
    ],
  },
  {
    titulo: "Mercadoria",
    itens: [
      {
        nome: "Compras",
        href: "/gestao/compras",
        icone: ic("M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|M3 6h18|M16 10a4 4 0 0 1-8 0"),
      },
      {
        nome: "Estoque",
        href: "/gestao/estoque",
        icone: ic("M3 7h18v13H3z|M3 7l2-4h14l2 4|M9 12h6"),
      },
    ],
  },
  {
    titulo: "Dinheiro & análise",
    itens: [
      {
        nome: "Financeiro",
        href: "/gestao/financeiro",
        extras: [
          "/gestao/contas-pagar",
          "/gestao/contas-receber",
          "/gestao/transferencias",
          "/gestao/conciliacao",
          "/gestao/fluxo-caixa",
          "/gestao/extrato",
        ],
        icone: ic("M3 3v18h18|M7 14l4-4 3 3 5-6"),
      },
      {
        nome: "Relatórios",
        href: "/gestao/relatorios",
        // DRE e Resultado viraram relatórios (antes não acendiam nada).
        extras: [
          "/gestao/dre",
          "/gestao/resultado",
          "/gestao/clientes/carteira",
          "/gestao/clientes/aniversariantes",
        ],
        icone: ic("M4 4v16h16|M8 16V10|M12 16V6|M16 16v-4"),
      },
    ],
  },
  {
    titulo: null,
    separar: true,
    itens: [
      {
        nome: "Cadastros",
        href: "/gestao/cadastros",
        extras: [
          "/gestao/produtos",
          "/gestao/categorias",
          "/gestao/fornecedores",
          "/gestao/clientes",
          "/gestao/listas-preco",
          "/gestao/taxas-cartao",
          "/gestao/maquininhas",
          "/gestao/contas",
          "/gestao/plano-contas",
        ],
        // Carteira e aniversariantes vivem sob /gestao/clientes/, mas são
        // relatórios — devem acender Relatórios, não Cadastros.
        exceto: ["/gestao/clientes/carteira", "/gestao/clientes/aniversariantes"],
        icone: ic("M20 7 12 3 4 7v10l8 4 8-4Z|M4 7l8 4 8-4|M12 21V11"),
      },
      {
        nome: "Ajustes",
        href: "/gestao/ajustes",
        extras: ["/gestao/usuarios", "/gestao/configuracoes", "/gestao/backup"],
        icone: ic(
          "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
        ),
      },
    ],
  },
];

/** Um item está ativo se a rota casa com o href (ou um extra) e não está em `exceto`. */
export function itemAtivo(item: ItemMenu, pathname: string): boolean {
  const casa = (base: string) => pathname === base || pathname.startsWith(base + "/");
  if ((item.exceto ?? []).some(casa)) return false;
  if (item.exato) return pathname === item.href;
  return casa(item.href) || (item.extras ?? []).some(casa);
}
