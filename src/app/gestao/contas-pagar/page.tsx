import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarContasPagar } from "@/lib/dados/financeiro";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { AvisoErro } from "@/components/cadastros/AvisoErro";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { TabelaDados, type LinhaTabela } from "@/components/TabelaDados";
import type { ContaPagar, StatusContaPagar, TipoContaPagar } from "@/lib/dados/tipos";
import { pagarLinhaAction } from "./acoes-linha";

type Params = { status?: string; tipo?: string; erro?: string };

function Chip({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
        ativo
          ? "bg-accent text-white border-accent"
          : "bg-surface text-muted border-line hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function corDaConta(c: ContaPagar) {
  if (c.status === "pago") return "verde" as const;
  if (c.status === "cancelado") return null;
  if (c.vencida) return "vermelha" as const;
  if (c.parcial) return "amarela" as const;
  return null;
}

export default async function ContasPagarPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const status = (sp.status ?? "aberto") as "aberto" | "pago" | "todas";
  const tipo = (sp.tipo ?? "tudo") as "compra" | "despesa" | "tudo";

  const contas = await listarContasPagar({
    status: status === "todas" ? undefined : (status as StatusContaPagar),
    tipo: tipo === "tudo" ? undefined : (tipo as TipoContaPagar),
  });

  const totalAberto = contas
    .filter((c) => c.status === "aberto")
    .reduce((s, c) => s + c.saldo, 0);
  const totalVencido = contas
    .filter((c) => c.vencida)
    .reduce((s, c) => s + c.saldo, 0);
  const totalValor = contas.reduce((s, c) => s + c.valor, 0);
  const totalPago = contas.reduce((s, c) => s + c.valor_pago, 0);

  const q = (over: Partial<Params>) => {
    const p = new URLSearchParams({ status, tipo, ...over });
    return `/gestao/contas-pagar?${p.toString()}`;
  };
  const urlAtual = q({});

  const linhas: LinhaTabela[] = contas.map((c) => ({
    id: c.id,
    href: `/gestao/contas-pagar/${c.id}`,
    cor: corDaConta(c),
    celulas: [
      <span key="d" className="font-semibold text-ink">{c.descricao}</span>,
      c.tipo === "compra" ? "compra" : (c.categoria_nome ?? "despesa"),
      c.fornecedor_nome ?? "—",
      formatarData(c.vencimento),
      formatarBRL(c.valor),
      c.valor_pago > 0 ? formatarBRL(c.valor_pago) : "—",
      <span key="s" className="font-semibold text-ink">
        {c.status === "aberto" ? formatarBRL(c.saldo) : "—"}
      </span>,
      c.status === "pago"
        ? "✓ paga"
        : c.status === "cancelado"
          ? "cancelada"
          : c.vencida
            ? "vencida"
            : c.parcial
              ? "parcial"
              : "em aberto",
    ],
    acao:
      c.status === "aberto" ? (
        <BotaoConfirmar
          action={pagarLinhaAction}
          hidden={{ conta_id: c.id, voltar: urlAtual }}
          rotulo="Pagar"
          confirmar={`Pagar ${formatarBRL(c.saldo)} de "${c.descricao}" hoje?`}
          className="h-7 px-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90"
        />
      ) : undefined,
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Contas a pagar"
          descricao="Compras dos fornecedores e despesas do dia a dia."
          voltarHref="/gestao/financeiro"
          novoHref="/gestao/contas-pagar/nova"
          novoTexto="Nova despesa"
        />
        <AvisoErro mensagem={sp.erro} />

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Chip href={q({ status: "aberto" })} ativo={status === "aberto"}>Abertas</Chip>
          <Chip href={q({ status: "pago" })} ativo={status === "pago"}>Pagas</Chip>
          <Chip href={q({ status: "todas" })} ativo={status === "todas"}>Todas</Chip>
          <span className="w-px h-5 bg-line mx-1" />
          <Chip href={q({ tipo: "tudo" })} ativo={tipo === "tudo"}>Tudo</Chip>
          <Chip href={q({ tipo: "compra" })} ativo={tipo === "compra"}>Compras</Chip>
          <Chip href={q({ tipo: "despesa" })} ativo={tipo === "despesa"}>Despesas</Chip>
        </div>

        {/* Computador: grade densa com totais no rodapé + Pagar na linha */}
        <div className="hidden lg:block">
          <TabelaDados
            colunas={[
              { titulo: "Descrição" },
              { titulo: "Tipo" },
              { titulo: "Fornecedor" },
              { titulo: "Vencimento" },
              { titulo: "Valor", alinhar: "dir" },
              { titulo: "Pago", alinhar: "dir" },
              { titulo: "Saldo", alinhar: "dir" },
              { titulo: "Situação" },
            ]}
            linhas={linhas}
            rodape={[
              `${contas.length} conta(s)`,
              "",
              "",
              totalVencido > 0 ? `vencido: ${formatarBRL(totalVencido)}` : "",
              formatarBRL(totalValor),
              formatarBRL(totalPago),
              formatarBRL(totalAberto),
              "",
            ]}
            legenda={[
              { cor: "vermelha", rotulo: "Vencida" },
              { cor: "amarela", rotulo: "Paga em parte" },
              { cor: "verde", rotulo: "Paga" },
            ]}
            vazio="Nada por aqui com esse filtro."
          />
        </div>

        {/* Celular: cards (como sempre) */}
        <div className="lg:hidden">
          {contas.length === 0 ? (
            <p className="text-muted text-center py-10">Nada por aqui com esse filtro.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {contas.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/gestao/contas-pagar/${c.id}`}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface-2 transition-colors"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-ink truncate">{c.descricao}</span>
                          {c.tipo === "compra" ? (
                            <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink border border-accent/30 shrink-0">
                              compra
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--amber-soft)] text-amber border border-[var(--amber)]/30 shrink-0">
                              {c.categoria_nome ?? "despesa"}
                            </span>
                          )}
                          {c.status === "pago" && (
                            <span className="text-[10px] font-mono uppercase tracking-wide text-good shrink-0">✓ paga</span>
                          )}
                          {c.parcial && (
                            <span className="text-[10px] font-mono uppercase tracking-wide text-amber shrink-0">parcial</span>
                          )}
                          {c.status === "cancelado" && (
                            <span className="text-[10px] font-mono uppercase tracking-wide text-muted shrink-0">cancelada</span>
                          )}
                        </span>
                        <span className="block text-sm text-muted">
                          {c.fornecedor_nome ? `${c.fornecedor_nome} · ` : ""}
                          vence {formatarData(c.vencimento)}
                          {c.vencida && <span className="text-danger font-semibold"> · vencida</span>}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className={`block font-semibold tabular-nums ${c.status === "pago" ? "text-muted line-through" : "text-ink"}`}>
                          {formatarBRL(c.valor)}
                        </span>
                        {c.status === "aberto" && c.valor_pago > 0 && (
                          <span className="block text-[11px] text-muted tabular-nums">
                            falta {formatarBRL(c.saldo)}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted">Em aberto (com esse filtro)</div>
                  {totalVencido > 0 && (
                    <div className="text-xs text-danger font-semibold mt-0.5">
                      {formatarBRL(totalVencido)} vencido
                    </div>
                  )}
                </div>
                <div className="text-2xl font-extrabold text-ink tabular-nums">
                  {formatarBRL(totalAberto)}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
