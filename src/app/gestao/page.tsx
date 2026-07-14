import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarVendasGestao } from "@/lib/dados/vendas";
import { obterCaixaAberto } from "@/lib/dados/caixa";
import { listarEstoqueGestao } from "@/lib/dados/estoque";
import { listarContasPagar, hojeBRT, inicioMesBRT } from "@/lib/dados/financeiro";
import { listarContasReceber } from "@/lib/dados/contasReceber";
import { listarOrcamentos } from "@/lib/dados/orcamentos";
import { lembretesPendentes } from "@/lib/dados/crm";
import { formatarBRL, formatarData, numVenda } from "@/lib/formato";
import { FORMAS_PAGAMENTO } from "@/lib/dados/tipos";
import { BarraTopo } from "@/components/BarraTopo";

const ATALHOS = [
  { nome: "Vender", href: "/balcao/vender", cor: "accent", icone: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|M3 6h18|M16 10a4 4 0 0 1-8 0" },
  { nome: "Nova compra", href: "/gestao/compras/nova", cor: "line", icone: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z|M3 6h18" },
  { nome: "Novo orçamento", href: "/gestao/orcamentos/novo", cor: "line", icone: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6" },
  { nome: "Caixa", href: "/gestao/caixa", cor: "line", icone: "M2 7h20v12H2z|M2 7l3-4h14l3 4" },
];

const ic = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.split("|").map((p, i) => <path key={i} d={p} />)}
  </svg>
);

const rotuloForma = (v: string) =>
  FORMAS_PAGAMENTO.find((f) => f.valor === v)?.rotulo ?? v;

export default async function GestaoPage() {
  const perfil = await exigirGestao();
  const hoje = hojeBRT();
  const mesIni = inicioMesBRT();

  const [vendas, caixa, estoque, aPagar, aReceber, orcamentos, lembretes] =
    await Promise.all([
      listarVendasGestao(),
      obterCaixaAberto(),
      listarEstoqueGestao(),
      listarContasPagar({ status: "aberto" }),
      listarContasReceber("aberto"),
      listarOrcamentos(),
      lembretesPendentes(),
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
  const orcamentosAbertos = orcamentos.filter((o) => o.status === "aberto").length;

  // Últimas 5 vendas e as 5 parcelas que vencem primeiro — o que a gestão
  // realmente quer ver ao abrir o sistema de manhã.
  const ultimasVendas = vendasValidas.slice(0, 5);
  const vencendo = [...aReceber]
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 5);

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
          <Kpi titulo="Vendas de hoje" valor={formatarBRL(totalHoje)} nota={`${doHoje.length} venda(s)`} href="/gestao/vendas" />
          <Kpi titulo="Vendas do mês" valor={formatarBRL(totalMes)} nota={`lucro ${formatarBRL(lucroMes)}`} bom={lucroMes >= 0} href="/gestao/relatorios/vendas" />
          <Kpi
            titulo="Caixa"
            valor={caixa ? "Aberto" : "Fechado"}
            nota={caixa ? `esperado ${formatarBRL(caixa.esperado_dinheiro_atual)}` : "abra para vender"}
            bom={!!caixa}
            alerta={!caixa}
            href="/gestao/caixa"
          />
          <Kpi titulo="A receber" valor={formatarBRL(receberTotal)} nota={receberVencido > 0 ? `${formatarBRL(receberVencido)} vencido` : "em dia"} alerta={receberVencido > 0} href="/gestao/contas-receber" />
        </div>

        {/* Alertas — o que pede ação hoje */}
        {(repor > 0 || pagarVencido > 0 || orcamentosAbertos > 0 || lembretes.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {repor > 0 && (
              <Alerta href="/gestao/estoque" cor="amber">
                ⚠ {repor} produto(s) para repor
              </Alerta>
            )}
            {pagarVencido > 0 && (
              <Alerta href="/gestao/contas-pagar" cor="danger">
                💸 {formatarBRL(pagarVencido)} em contas vencidas
              </Alerta>
            )}
            {orcamentosAbertos > 0 && (
              <Alerta href="/gestao/orcamentos" cor="neutro">
                📄 {orcamentosAbertos} orçamento(s) em aberto
              </Alerta>
            )}
            {lembretes.length > 0 && (
              <Alerta href="/gestao/clientes" cor="neutro">
                🔔 {lembretes.length} lembrete(s) de cliente
              </Alerta>
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

        {/* Painéis de acompanhamento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Painel titulo="Últimas vendas" verTudoHref="/gestao/vendas" vazio="Nenhuma venda ainda.">
            {ultimasVendas.map((v) => (
              <Link
                key={v.id}
                href={`/gestao/vendas/${v.id}`}
                className="flex items-center gap-3 px-4 py-2.5 border-t border-line hover:bg-surface-2 transition-colors"
              >
                <span className="font-mono text-xs text-muted shrink-0">{numVenda(v.numero)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink truncate">
                    {v.cliente_nome ?? "Venda no balcão"}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {formatarData(v.data_venda)} · {rotuloForma(v.forma_pagamento)}
                  </span>
                </span>
                <span className="text-sm font-bold text-ink tabular-nums shrink-0">
                  {formatarBRL(v.total)}
                </span>
              </Link>
            ))}
          </Painel>

          <Painel titulo="A receber vencendo" verTudoHref="/gestao/contas-receber" vazio="Nada a receber.">
            {vencendo.map((c) => {
              const atrasada = c.vencimento < hoje;
              return (
                <Link
                  key={c.id}
                  href={`/gestao/contas-receber/${c.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-t border-line hover:bg-surface-2 transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink truncate">
                      {c.cliente_nome ?? "Cliente do balcão"}
                      <span className="text-muted"> · {c.tipo === "cartao" ? `cartão ${c.parcela_num}/${c.parcela_total}` : "fiado"}</span>
                    </span>
                    <span className={`block text-[11px] font-semibold ${atrasada ? "text-danger" : "text-muted"}`}>
                      {atrasada ? "vencido em " : "vence "}
                      {formatarData(c.vencimento)}
                    </span>
                  </span>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${atrasada ? "text-danger" : "text-ink"}`}>
                    {formatarBRL(c.saldo)}
                  </span>
                </Link>
              );
            })}
          </Painel>
        </div>
      </main>
    </>
  );
}

function Painel({
  titulo,
  verTudoHref,
  vazio,
  children,
}: {
  titulo: string;
  verTudoHref: string;
  vazio: string;
  children: React.ReactNode;
}) {
  const vazioDeVerdade = !Array.isArray(children) || children.length === 0;
  return (
    <section className="rounded-2xl border border-line bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-sm font-bold text-ink tracking-tight">{titulo}</h2>
        <Link href={verTudoHref} className="text-xs font-semibold text-accent-ink hover:underline">
          ver todas
        </Link>
      </div>
      {vazioDeVerdade ? (
        <p className="px-4 pb-4 text-sm text-muted">{vazio}</p>
      ) : (
        children
      )}
    </section>
  );
}

function Alerta({
  href,
  cor,
  children,
}: {
  href: string;
  cor: "amber" | "danger" | "neutro";
  children: React.ReactNode;
}) {
  const estilo =
    cor === "amber"
      ? "border-[color:var(--amber)]/40 bg-[var(--amber-soft)] text-amber"
      : cor === "danger"
        ? "border-[color:var(--danger)]/40 bg-[var(--danger)]/10 text-danger"
        : "border-line bg-surface text-ink hover:border-accent/40";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 h-10 text-sm font-semibold transition-colors ${estilo}`}
    >
      {children}
    </Link>
  );
}

function Kpi({
  titulo,
  valor,
  nota,
  bom,
  alerta,
  href,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  bom?: boolean;
  alerta?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border bg-surface p-4 hover:border-accent/40 transition-colors ${alerta ? "border-[color:var(--amber)]/40" : "border-line"}`}
    >
      <div className="text-xs text-muted">{titulo}</div>
      <div className={`text-xl font-extrabold tabular-nums mt-1 ${bom ? "text-good" : alerta ? "text-amber" : "text-ink"}`}>
        {valor}
      </div>
      {nota && <div className="text-[11px] text-muted mt-0.5">{nota}</div>}
    </Link>
  );
}
