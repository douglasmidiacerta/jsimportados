import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarVendasGestao } from "@/lib/dados/vendas";
import { obterCaixaAberto } from "@/lib/dados/caixa";
import { listarEstoqueGestao } from "@/lib/dados/estoque";
import { listarContasPagar, hojeBRT, inicioMesBRT } from "@/lib/dados/financeiro";
import { listarContasReceber } from "@/lib/dados/contasReceber";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";

const ATALHOS = [
  { nome: "Vender", href: "/balcao/vender", cor: "accent", icone: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|M3 6h18|M16 10a4 4 0 0 1-8 0" },
  { nome: "Nova compra", href: "/gestao/compras/nova", cor: "line", icone: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|M3 6h18" },
  { nome: "Novo orçamento", href: "/gestao/orcamentos/novo", cor: "line", icone: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6" },
  { nome: "Caixa", href: "/gestao/caixa", cor: "line", icone: "M2 7h20v12H2z|M2 7l3-4h14l3 4" },
];

const MODULOS = [
  { nome: "Cadastros", desc: "Produtos, clientes, fornecedores, contas…", href: "/gestao/cadastros" },
  { nome: "Compras", desc: "Importação multi-moeda e custo real", href: "/gestao/compras" },
  { nome: "Estoque", desc: "Saldo, custo, reposição", href: "/gestao/estoque" },
  { nome: "Vendas", desc: "Vendas, margem e lucro", href: "/gestao/vendas" },
  { nome: "Orçamentos", desc: "Propostas que viram venda", href: "/gestao/orcamentos" },
  { nome: "Contas a receber", desc: "Cartão e fiado por vencimento", href: "/gestao/contas-receber" },
  { nome: "Caixa", desc: "Abertura, fechamento, conferência", href: "/gestao/caixa" },
  { nome: "Financeiro", desc: "Contas, fluxo de caixa, DRE", href: "/gestao/financeiro" },
  { nome: "Relatórios", desc: "Lucratividade, ABC, patrimônio", href: "/gestao/relatorios" },
  { nome: "CRM & Preços", desc: "Carteira, aniversários, listas", href: "/gestao/crm" },
  { nome: "Usuários", desc: "Convidar, promover, desligar", href: "/gestao/usuarios" },
  { nome: "Configurações", desc: "Dados da empresa e impressões", href: "/gestao/configuracoes" },
  { nome: "Backup / Exportar", desc: "Baixar seus dados em CSV", href: "/gestao/backup" },
];

const ic = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.split("|").map((p, i) => <path key={i} d={p} />)}
  </svg>
);

export default async function GestaoPage() {
  const perfil = await exigirGestao();
  const hoje = hojeBRT();
  const mesIni = inicioMesBRT();

  const [vendas, caixa, estoque, aPagar, aReceber] = await Promise.all([
    listarVendasGestao(),
    obterCaixaAberto(),
    listarEstoqueGestao(),
    listarContasPagar({ status: "aberto" }),
    listarContasReceber("aberto"),
  ]);

  const vendasValidas = vendas.filter((v) => v.status !== "cancelada");
  const doHoje = vendasValidas.filter((v) => v.data_venda === hoje);
  const doMes = vendasValidas.filter((v) => v.data_venda >= mesIni);
  const totalHoje = doHoje.reduce((s, v) => s + v.total, 0);
  const totalMes = doMes.reduce((s, v) => s + v.total, 0);
  const lucroMes = doMes.reduce((s, v) => s + v.lucro_bruto, 0);

  const receberTotal = aReceber.reduce((s, c) => s + c.saldo, 0);
  const receberVencido = aReceber
    .filter((c) => c.vencimento < hoje)
    .reduce((s, c) => s + c.saldo, 0);
  const pagarVencido = aPagar.filter((c) => c.vencida).reduce((s, c) => s + c.saldo, 0);
  const repor = estoque.filter((i) => i.abaixo_minimo).length;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-5xl w-full px-4 py-6 sm:py-10 flex-1">
        <div className="mb-6">
          <p className="text-muted text-sm font-mono uppercase tracking-wider">Painel</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mt-1">
            Olá, {perfil.nome.trim().split(/\s+/)[0]}
          </h1>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Kpi titulo="Vendas de hoje" valor={formatarBRL(totalHoje)} nota={`${doHoje.length} venda(s)`} />
          <Kpi titulo="Vendas do mês" valor={formatarBRL(totalMes)} nota={`lucro ${formatarBRL(lucroMes)}`} bom={lucroMes >= 0} />
          <Kpi
            titulo="Caixa"
            valor={caixa ? "Aberto" : "Fechado"}
            nota={caixa ? `esperado ${formatarBRL(caixa.esperado_dinheiro_atual)}` : "abra para vender"}
            bom={!!caixa}
            alerta={!caixa}
          />
          <Kpi titulo="A receber" valor={formatarBRL(receberTotal)} nota={receberVencido > 0 ? `${formatarBRL(receberVencido)} vencido` : "em dia"} alerta={receberVencido > 0} />
        </div>

        {/* Alertas rápidos */}
        {(repor > 0 || pagarVencido > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {repor > 0 && (
              <Link href="/gestao/estoque" className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--amber)]/40 bg-[var(--amber-soft)] text-amber px-3 h-10 text-sm font-semibold">
                ⚠ {repor} produto(s) para repor
              </Link>
            )}
            {pagarVencido > 0 && (
              <Link href="/gestao/contas-pagar" className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--danger)]/40 bg-[var(--danger)]/10 text-danger px-3 h-10 text-sm font-semibold">
                💸 {formatarBRL(pagarVencido)} em contas vencidas
              </Link>
            )}
          </div>
        )}

        {/* Atalhos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {ATALHOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-col items-center justify-center gap-2 h-24 rounded-2xl font-bold shadow-[var(--shadow)] active:scale-[0.99] transition-colors ${
                a.cor === "accent" ? "bg-accent text-white" : "bg-surface border border-line text-ink hover:border-accent/40"
              }`}
            >
              {ic(a.icone)}
              {a.nome}
            </Link>
          ))}
        </div>

        {/* Módulos */}
        <h2 className="text-sm font-bold text-muted uppercase tracking-wide mb-3">Tudo do sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULOS.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-2xl border border-line bg-surface p-4 hover:border-accent/40 transition-colors"
            >
              <span className="block text-ink font-bold tracking-tight">{m.nome}</span>
              <span className="block text-muted text-sm mt-0.5">{m.desc}</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

function Kpi({
  titulo,
  valor,
  nota,
  bom,
  alerta,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  bom?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-surface p-4 ${alerta ? "border-[color:var(--amber)]/40" : "border-line"}`}>
      <div className="text-xs text-muted">{titulo}</div>
      <div className={`text-xl font-extrabold tabular-nums mt-1 ${bom ? "text-good" : alerta ? "text-amber" : "text-ink"}`}>
        {valor}
      </div>
      {nota && <div className="text-[11px] text-muted mt-0.5">{nota}</div>}
    </div>
  );
}
