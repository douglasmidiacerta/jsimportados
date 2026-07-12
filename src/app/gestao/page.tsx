import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";

type Modulo = {
  nome: string;
  itens: string;
  fase: number;
  href?: string;
  pronto?: boolean;
};

const MODULOS: Modulo[] = [
  {
    nome: "Cadastros",
    itens: "Produtos, categorias, fornecedores e clientes",
    fase: 2,
    href: "/gestao/cadastros",
    pronto: true,
  },
  {
    nome: "Compra / Importação",
    itens: "Multi-moeda, rateio e custo real",
    fase: 3,
    href: "/gestao/compras",
    pronto: true,
  },
  {
    nome: "Estoque",
    itens: "Saldo, custo médio e valor parado",
    fase: 3,
    href: "/gestao/estoque",
    pronto: true,
  },
  {
    nome: "Vendas",
    itens: "Vendas realizadas, margem e lucro",
    fase: 4,
    href: "/gestao/vendas",
    pronto: true,
  },
  {
    nome: "Contas a receber",
    itens: "Cartão e fiado, por vencimento",
    fase: 4,
    href: "/gestao/contas-receber",
    pronto: true,
  },
  {
    nome: "Taxas do cartão",
    itens: "MDR por parcela (maquininha)",
    fase: 4,
    href: "/gestao/taxas-cartao",
    pronto: true,
  },
  {
    nome: "Caixa",
    itens: "Abertura, fechamento e diferenças",
    fase: 5,
    href: "/gestao/caixa",
    pronto: true,
  },
  {
    nome: "Financeiro",
    itens: "Contas a pagar/receber, extrato e DRE",
    fase: 6,
    href: "/gestao/financeiro",
    pronto: true,
  },
  {
    nome: "CRM & Preços",
    itens: "Histórico, carteira, aniversários, listas de preço",
    fase: 7,
    href: "/gestao/crm",
    pronto: true,
  },
  {
    nome: "Relatórios",
    itens: "Lucratividade, curvas ABC, vendas, em aberto",
    fase: 8,
    href: "/gestao/relatorios",
    pronto: true,
  },
];

function CartaoModulo({ m }: { m: Modulo }) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-ink font-bold text-lg tracking-tight">{m.nome}</h2>
        {m.pronto ? (
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-accent text-white">
            Abrir
          </span>
        ) : (
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-surface-3 text-muted border border-line">
            Fase {m.fase}
          </span>
        )}
      </div>
      <p className="text-muted text-sm mt-1.5">{m.itens}</p>
    </>
  );

  if (m.href) {
    return (
      <Link
        href={m.href}
        className="rounded-2xl border border-accent/40 bg-surface p-5 shadow-[var(--shadow)] hover:border-accent transition-colors"
      >
        {conteudo}
      </Link>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)] opacity-90">
      {conteudo}
    </div>
  );
}

export default async function GestaoPage() {
  const perfil = await exigirGestao();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />

      <main className="mx-auto max-w-5xl w-full px-4 py-6 sm:py-10 flex-1">
        <div className="mb-6">
          <p className="text-muted text-sm font-mono uppercase tracking-wider">
            Painel de gestão
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-1">
            Visão do negócio
          </h1>
          <p className="text-muted mt-1 max-w-2xl">
            Aqui você acompanha tudo: financeiro, relatórios e o que acontece no
            balcão. Os módulos entram em funcionamento fase a fase.
          </p>
        </div>

        <div className="rounded-2xl border border-accent/30 bg-accent-soft/60 p-4 sm:p-5 mb-8 flex items-start gap-3">
          <span className="mt-0.5 text-accent-ink shrink-0" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>
          </span>
          <p className="text-sm text-accent-ink">
            <b>Relatórios no ar!</b> Lucratividade e curvas ABC (produtos, estoque,
            clientes — por faturamento e por lucro), vendas por período, e o que está em
            aberto com a auditoria de caixa. O sistema está completo — falta só o refino.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {MODULOS.map((m) => (
            <CartaoModulo key={m.nome} m={m} />
          ))}
        </div>
      </main>
    </>
  );
}
