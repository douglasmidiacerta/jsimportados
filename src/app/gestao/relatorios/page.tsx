import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import {
  vendasResumo,
  resumoEmAberto,
  listarContasReceber,
  listarContasPagar,
  hojeBRT,
  inicioMesBRT,
} from "@/lib/dados/relatorios";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

const GRUPOS = [
  { nome: "Vendas por período", desc: "Faturamento, lucro, ticket, por dia e forma", href: "/gestao/relatorios/vendas" },
  { nome: "Lucratividade + ABC de produtos", desc: "O que dá mais lucro e o que mais vende", href: "/gestao/relatorios/lucratividade" },
  { nome: "ABC de clientes", desc: "Quem representa a maior parte das compras", href: "/gestao/relatorios/clientes" },
  { nome: "ABC de estoque", desc: "Onde está o dinheiro parado", href: "/gestao/relatorios/estoque" },
  { nome: "Patrimônio em estoque", desc: "Valor a custo e a preço de venda + CSV", href: "/gestao/relatorios/patrimonio" },
  { nome: "Em aberto + caixa", desc: "A receber, a pagar e auditoria de caixa", href: "/gestao/relatorios/em-aberto" },
  { nome: "DRE gerencial", desc: "Resultado por mês (competência)", href: "/gestao/dre" },
  { nome: "Extrato / fluxo de caixa", desc: "O que entrou e saiu de verdade", href: "/gestao/extrato" },
];

export default async function RelatoriosPage() {
  const perfil = await exigirGestao();
  const [resumo, receber, pagar] = await Promise.all([
    vendasResumo(inicioMesBRT(), hojeBRT()),
    listarContasReceber("aberto"),
    listarContasPagar({ status: "aberto" }),
  ]);
  const aberto = resumoEmAberto(receber, pagar);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Relatórios"
          descricao="O desempenho do negócio — vendas, lucro, curvas ABC e o que está em aberto."
          voltarHref="/gestao"
        />

        <div className="rounded-2xl border border-accent/30 bg-accent-soft/50 p-4 mb-6">
          <div className="text-sm text-accent-ink font-semibold mb-2">Este mês, até hoje</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi titulo="Faturamento" valor={formatarBRL(resumo.faturamento)} />
            <Kpi titulo="Lucro" valor={formatarBRL(resumo.lucro)} bom={resumo.lucro >= 0} />
            <Kpi titulo="Ticket médio" valor={formatarBRL(resumo.ticket_medio)} />
            <Kpi titulo="Vendas" valor={String(resumo.n_vendas)} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Kpi titulo="A receber" valor={formatarBRL(aberto.receber.total)} nota={aberto.receber.vencido > 0 ? `${formatarBRL(aberto.receber.vencido)} vencido` : undefined} />
            <Kpi titulo="A pagar" valor={formatarBRL(aberto.pagar.total)} nota={aberto.pagar.vencido > 0 ? `${formatarBRL(aberto.pagar.vencido)} vencido` : undefined} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GRUPOS.map((g) => (
            <Link
              key={g.href}
              href={g.href}
              className="rounded-2xl border border-accent/40 bg-surface p-5 shadow-[var(--shadow)] hover:border-accent transition-colors"
            >
              <h2 className="text-ink font-bold text-lg tracking-tight">{g.nome}</h2>
              <p className="text-muted text-sm mt-1.5">{g.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

function Kpi({ titulo, valor, nota, bom }: { titulo: string; valor: string; nota?: string; bom?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs text-muted">{titulo}</div>
      <div className={`text-lg font-extrabold tabular-nums mt-0.5 ${bom === undefined ? "text-ink" : bom ? "text-good" : "text-danger"}`}>
        {valor}
      </div>
      {nota && <div className="text-[11px] text-danger font-semibold mt-0.5">{nota}</div>}
    </div>
  );
}
