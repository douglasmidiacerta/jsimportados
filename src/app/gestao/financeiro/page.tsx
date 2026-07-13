import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarContasReceber } from "@/lib/dados/contasReceber";
import {
  listarContasPagar,
  lerDreMensal,
  inicioMesBRT,
} from "@/lib/dados/financeiro";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

const AREAS = [
  { nome: "Contas a pagar", desc: "Compras e despesas, com baixa e estorno", href: "/gestao/contas-pagar" },
  { nome: "Contas a receber", desc: "Cartão e fiado — dar baixa quando cair", href: "/gestao/contas-receber" },
  { nome: "Resultado geral", desc: "O que sobrou no período, despesas por categoria", href: "/gestao/resultado" },
  { nome: "Plano de contas", desc: "Categorias de despesa do financeiro", href: "/gestao/plano-contas" },
  { nome: "Fluxo de caixa", desc: "Entradas e saídas por conta, no período", href: "/gestao/fluxo-caixa" },
  { nome: "Extrato", desc: "O que entrou e saiu (regime de caixa)", href: "/gestao/extrato" },
  { nome: "DRE gerencial", desc: "Resultado por mês (receita, CMV, despesas)", href: "/gestao/dre" },
  { nome: "Contas & conciliação", desc: "Bancos, maquininhas e conciliar extrato", href: "/gestao/contas" },
];

export default async function FinanceiroPage() {
  const perfil = await exigirGestao();
  const mesInicio = inicioMesBRT();

  const [aPagar, aReceber, dre] = await Promise.all([
    listarContasPagar({ status: "aberto" }),
    listarContasReceber("aberto"),
    lerDreMensal(mesInicio, mesInicio),
  ]);

  const totalPagar = aPagar.reduce((s, c) => s + c.saldo, 0);
  const totalReceber = aReceber.reduce((s, c) => s + c.saldo, 0);
  const resultadoMes = dre[0]?.resultado ?? 0;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Financeiro"
          descricao="Contas, fluxo de caixa e resultado do negócio."
          voltarHref="/gestao"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="text-xs text-muted">A pagar (em aberto)</div>
            <div className="text-xl font-extrabold text-ink tabular-nums mt-1">{formatarBRL(totalPagar)}</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="text-xs text-muted">A receber (em aberto)</div>
            <div className="text-xl font-extrabold text-ink tabular-nums mt-1">{formatarBRL(totalReceber)}</div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="text-xs text-muted">Resultado deste mês</div>
            <div className={`text-xl font-extrabold tabular-nums mt-1 ${resultadoMes >= 0 ? "text-good" : "text-danger"}`}>
              {formatarBRL(resultadoMes)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AREAS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-2xl border border-accent/40 bg-surface p-5 shadow-[var(--shadow)] hover:border-accent transition-colors"
            >
              <h2 className="text-ink font-bold text-lg tracking-tight">{a.nome}</h2>
              <p className="text-muted text-sm mt-1.5">{a.desc}</p>
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted mt-6">
          Dica: o <b>Extrato</b> mostra o dinheiro que entrou e saiu de verdade (regime
          de caixa). A <b>DRE</b> mostra o lucro por competência — o mês em que a venda ou
          a despesa aconteceu, mesmo que o pagamento caia depois. São duas visões do mesmo
          negócio; um valor nunca é contado duas vezes na mesma visão.
        </p>
      </main>
    </>
  );
}
