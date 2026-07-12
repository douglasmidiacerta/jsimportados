import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarContasReceber } from "@/lib/dados/contasReceber";
import { hojeBRT } from "@/lib/dados/financeiro";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { AvisoErro } from "@/components/cadastros/AvisoErro";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import { TabelaDados, type LinhaTabela } from "@/components/TabelaDados";
import type { ContaReceber } from "@/lib/dados/tipos";
import { receberLinhaAction } from "./actions";

type Params = {
  status?: string;
  de?: string;
  ate?: string;
  cliente?: string;
  erro?: string;
};

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function corDaConta(c: ContaReceber, hoje: string) {
  if (c.status === "liquidado") return "verde" as const;
  if (c.status === "cancelado") return null;
  if (c.vencimento < hoje) return "vermelha" as const;
  if (c.valor_recebido > 0) return "amarela" as const;
  return null;
}

export default async function ContasReceberPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const status = (sp.status ?? "aberto") as "aberto" | "liquidado" | "todas";
  const de = sp.de && DATA_RE.test(sp.de) ? sp.de : undefined;
  const ate = sp.ate && DATA_RE.test(sp.ate) ? sp.ate : undefined;
  const clienteId = sp.cliente || undefined;
  const hoje = hojeBRT();

  const contas = await listarContasReceber(
    status === "todas" ? undefined : status,
    { de, ate, clienteId },
  );

  // opções do seletor de cliente (a partir das contas do status atual, sem o filtro de cliente)
  const paraOpcoes = clienteId
    ? await listarContasReceber(status === "todas" ? undefined : status, { de, ate })
    : contas;
  const clientes = Array.from(
    new Map(
      paraOpcoes
        .filter((c) => c.cliente_id)
        .map((c) => [c.cliente_id as string, c.cliente_nome ?? "Cliente"]),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1]));

  // URL atual (para chips/voltar preservarem os filtros)
  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, de, ate, cliente: clienteId, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/gestao/contas-receber${s ? `?${s}` : ""}`;
  };
  const urlAtual = qs({});

  const totalLiquido = contas.reduce((s, c) => s + c.valor_liquido, 0);
  const totalRecebido = contas.reduce((s, c) => s + c.valor_recebido, 0);
  const totalSaldo = contas
    .filter((c) => c.status === "aberto")
    .reduce((s, c) => s + c.saldo, 0);

  const linhas: LinhaTabela[] = contas.map((c) => ({
    id: c.id,
    href: `/gestao/contas-receber/${c.id}`,
    cor: corDaConta(c, hoje),
    celulas: [
      <span key="n" className="font-semibold text-ink">
        {c.cliente_nome ?? (c.tipo === "cartao" ? "Cartão" : "Fiado")}
      </span>,
      c.tipo === "cartao" ? `cartão ${c.parcela_num}/${c.parcela_total}` : "fiado",
      formatarData(c.vencimento),
      formatarBRL(c.valor_liquido),
      c.valor_recebido > 0 ? formatarBRL(c.valor_recebido) : "—",
      <span key="s" className="font-semibold text-ink">
        {c.status === "aberto" ? formatarBRL(c.saldo) : "—"}
      </span>,
      c.status === "liquidado"
        ? "✓ recebida"
        : c.status === "cancelado"
          ? "cancelada"
          : c.vencimento < hoje
            ? "vencida"
            : c.valor_recebido > 0
              ? "parcial"
              : "em aberto",
    ],
    acao:
      c.status === "aberto" ? (
        <BotaoConfirmar
          action={receberLinhaAction}
          hidden={{ conta_id: c.id, voltar: urlAtual }}
          rotulo="Receber"
          confirmar={`Receber ${formatarBRL(c.saldo)} de ${c.cliente_nome ?? "este título"} hoje?`}
          className="h-7 px-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90"
        />
      ) : undefined,
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Contas a receber"
          descricao="Cartão e fiado. Dê baixa quando o dinheiro cair."
          voltarHref="/gestao/financeiro"
        />
        <AvisoErro mensagem={sp.erro} />

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Chip href={qs({ status: "aberto" })} ativo={status === "aberto"}>A receber</Chip>
          <Chip href={qs({ status: "liquidado" })} ativo={status === "liquidado"}>Recebidas</Chip>
          <Chip href={qs({ status: "todas" })} ativo={status === "todas"}>Todas</Chip>
        </div>

        {/* Filtros por período e cliente (padrão FPQ) — desktop */}
        <form
          method="GET"
          className="hidden lg:flex flex-wrap items-end gap-3 mb-4 rounded-2xl border border-line bg-surface p-3"
        >
          <input type="hidden" name="status" value={status} />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-muted">Vencimento — de</span>
            <input type="date" name="de" defaultValue={de ?? ""} className="min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-mono uppercase tracking-wide text-muted">até</span>
            <input type="date" name="ate" defaultValue={ate ?? ""} className="min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1 min-w-[200px]">
            <span className="text-[11px] font-mono uppercase tracking-wide text-muted">Cliente</span>
            <select name="cliente" defaultValue={clienteId ?? ""} className="min-h-[40px] rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent appearance-none">
              <option value="">Todos</option>
              {clientes.map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90">
            Filtrar
          </button>
          {(de || ate || clienteId) && (
            <Link href={qs({ de: undefined, ate: undefined, cliente: undefined })} className="h-10 inline-flex items-center px-3 text-sm font-semibold text-muted hover:text-ink">
              Limpar
            </Link>
          )}
        </form>

        {/* Computador: grade densa com totais no rodapé */}
        <div className="hidden lg:block">
          <TabelaDados
            colunas={[
              { titulo: "Cliente" },
              { titulo: "Tipo" },
              { titulo: "Vencimento" },
              { titulo: "Valor líq.", alinhar: "dir" },
              { titulo: "Recebido", alinhar: "dir" },
              { titulo: "Saldo", alinhar: "dir" },
              { titulo: "Situação" },
            ]}
            linhas={linhas}
            rodape={[
              `${contas.length} título(s)`,
              "",
              "",
              formatarBRL(totalLiquido),
              formatarBRL(totalRecebido),
              formatarBRL(totalSaldo),
              "",
            ]}
            legenda={[
              { cor: "vermelha", rotulo: "Vencida" },
              { cor: "amarela", rotulo: "Recebida em parte" },
              { cor: "verde", rotulo: "Recebida" },
            ]}
            vazio="Nada por aqui. Vendas no cartão e no fiado aparecem aqui."
          />
        </div>

        {/* Celular: cards (como sempre) */}
        <div className="lg:hidden">
          {contas.length === 0 ? (
            <p className="text-muted text-center py-10">
              Nada por aqui. Vendas no cartão e no fiado aparecem aqui.
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-2">
                {contas.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/gestao/contas-receber/${c.id}`}
                      className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface-2 transition-colors"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-ink truncate">
                            {c.cliente_nome ?? (c.tipo === "cartao" ? "Cartão" : "Fiado")}
                          </span>
                          <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-line shrink-0">
                            {c.tipo === "cartao" ? `cartão ${c.parcela_num}/${c.parcela_total}` : "fiado"}
                          </span>
                          {c.status === "liquidado" && (
                            <span className="text-[10px] font-mono uppercase tracking-wide text-good shrink-0">✓ recebida</span>
                          )}
                          {c.status === "aberto" && c.valor_recebido > 0 && (
                            <span className="text-[10px] font-mono uppercase tracking-wide text-amber shrink-0">parcial</span>
                          )}
                        </span>
                        <span className="block text-sm text-muted">
                          {c.status === "liquidado" && c.liquidado_em
                            ? `recebida ${formatarData(c.liquidado_em)}`
                            : `vence ${formatarData(c.vencimento)}`}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className={`block font-semibold tabular-nums ${c.status === "liquidado" ? "text-muted" : "text-ink"}`}>
                          {formatarBRL(c.valor_liquido)}
                        </span>
                        {c.status === "aberto" && c.valor_recebido > 0 && (
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
                <div className="text-sm text-muted">Líquido a receber (em aberto)</div>
                <div className="text-2xl font-extrabold text-ink tabular-nums">
                  {formatarBRL(totalSaldo)}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
