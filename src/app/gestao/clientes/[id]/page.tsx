import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { cliente360, listarEtiquetas } from "@/lib/dados/crm";
import { listarListasPreco } from "@/lib/dados/listasPreco";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioCliente } from "@/components/cadastros/FormularioCliente";
import { AvisoErro, mensagemAtivo } from "@/components/cadastros/AvisoErro";
import { NovaInteracao } from "@/components/crm/NovaInteracao";
import { NovaEtiqueta } from "@/components/crm/NovaEtiqueta";
import { atualizarCliente, definirAtivoCliente } from "../actions";
import {
  marcarEtiquetaAction,
  desmarcarEtiquetaAction,
  concluirLembreteAction,
  apagarInteracaoAction,
  criarEtiquetaAction,
  criarInteracaoAction,
} from "../crmActions";
import { TIPOS_INTERACAO, type CrmInteracao } from "@/lib/dados/tipos";

function corEtiqueta(cor: string): string {
  switch (cor) {
    case "good":
      return "bg-[var(--good)]/15 text-good border-good/30";
    case "amber":
      return "bg-[var(--amber-soft)] text-amber border-[var(--amber)]/30";
    case "danger":
      return "bg-[var(--danger)]/10 text-danger border-[var(--danger)]/30";
    default:
      return "bg-accent-soft text-accent-ink border-accent/30";
  }
}
const rotuloTipo = (t: string) =>
  TIPOS_INTERACAO.find((x) => x.valor === t)?.rotulo ?? "Anotação";

export default async function ClienteDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const perfil = await exigirGestao();

  const [dados, listas, etiquetasTodas] = await Promise.all([
    cliente360(id),
    listarListasPreco(),
    listarEtiquetas(),
  ]);
  if (!dados) notFound();
  const { cliente, etiquetas, interacoes, historico, carteira } = dados;
  const idsAtuais = new Set(etiquetas.map((e) => e.id));
  const disponiveis = etiquetasTodas.filter((e) => !idsAtuais.has(e.id));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro titulo={cliente.nome} descricao="Cliente" voltarHref="/gestao/clientes" />

        {/* Carteira */}
        {carteira && carteira.n_compras > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Mini titulo="Comprou" valor={formatarBRL(carteira.total_comprado)} />
            <Mini titulo="Compras" valor={String(carteira.n_compras)} />
            <Mini titulo="Ticket médio" valor={formatarBRL(carteira.ticket_medio)} />
            <Mini titulo="Última" valor={carteira.ultima_compra ? formatarData(carteira.ultima_compra) : "—"} />
          </div>
        )}

        {/* Etiquetas */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Etiquetas</h2>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {etiquetas.length === 0 && <span className="text-sm text-muted">Nenhuma etiqueta.</span>}
            {etiquetas.map((e) => (
              <span key={e.id} className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm font-semibold border ${corEtiqueta(e.cor)}`}>
                {e.nome}
                <form action={desmarcarEtiquetaAction}>
                  <input type="hidden" name="cliente_id" value={cliente.id} />
                  <input type="hidden" name="etiqueta_id" value={e.id} />
                  <button type="submit" aria-label="Remover etiqueta" className="w-5 h-5 grid place-items-center rounded-full hover:bg-black/10">×</button>
                </form>
              </span>
            ))}
          </div>
          {disponiveis.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {disponiveis.map((e) => (
                <form key={e.id} action={marcarEtiquetaAction}>
                  <input type="hidden" name="cliente_id" value={cliente.id} />
                  <input type="hidden" name="etiqueta_id" value={e.id} />
                  <button type="submit" className="px-3 py-1 rounded-full text-sm font-medium border border-dashed border-line text-muted hover:text-ink hover:border-accent">
                    + {e.nome}
                  </button>
                </form>
              ))}
            </div>
          )}
          <NovaEtiqueta clienteId={cliente.id} action={criarEtiquetaAction} />
        </section>

        {/* Anotações & lembretes */}
        <section className="mb-6">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Anotações & lembretes</h2>
          <div className="mb-3">
            <NovaInteracao clienteId={cliente.id} action={criarInteracaoAction} />
          </div>
          {interacoes.length === 0 ? (
            <p className="text-sm text-muted">Nada anotado ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {interacoes.map((it) => (
                <LinhaInteracao key={it.id} it={it} clienteId={cliente.id} />
              ))}
            </ul>
          )}
        </section>

        {/* Histórico de compras */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Compras</h2>
          {historico.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma compra registrada.</p>
          ) : (
            <ul className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {historico.map((v) => (
                <li key={v.id}>
                  <Link href={`/gestao/vendas/${v.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2">
                    <span className="min-w-0">
                      <span className="block text-ink font-medium">{formatarData(v.data_venda)}</span>
                      <span className="block text-xs text-muted capitalize">{v.forma_pagamento}</span>
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{formatarBRL(v.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Dados do cliente */}
        <section>
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-2">Dados</h2>
          <AvisoErro mensagem={mensagemAtivo(erro)} />
          <FormularioCliente action={atualizarCliente} cliente={cliente} voltarHref="/gestao/clientes" listas={listas} />

          <div className="mt-8 pt-6 border-t border-line">
            <form action={definirAtivoCliente}>
              <input type="hidden" name="id" value={cliente.id} />
              <input type="hidden" name="ativo" value={cliente.ativo ? "false" : "true"} />
              <p className="text-sm text-muted mb-2">
                {cliente.ativo ? "Arquivar esconde o cliente das listas." : "Este cliente está arquivado."}
              </p>
              <button
                type="submit"
                className={
                  cliente.ativo
                    ? "h-11 inline-flex items-center rounded-xl border border-[var(--danger)]/40 text-danger px-4 font-semibold hover:bg-[var(--danger)]/10 transition-colors"
                    : "h-11 inline-flex items-center rounded-xl border border-line text-ink px-4 font-semibold hover:bg-surface-2 transition-colors"
                }
              >
                {cliente.ativo ? "Arquivar cliente" : "Reativar cliente"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

function Mini({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-center">
      <div className="text-xs text-muted">{titulo}</div>
      <div className="text-ink font-bold tabular-nums mt-0.5">{valor}</div>
    </div>
  );
}

function LinhaInteracao({ it, clienteId }: { it: CrmInteracao; clienteId: string }) {
  const ehLembrete = it.tipo === "lembrete";
  return (
    <li className="rounded-2xl border border-line bg-surface p-3 flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-line">
            {rotuloTipo(it.tipo)}
          </span>
          {ehLembrete && it.lembrete_em && (
            <span className={`text-xs font-semibold ${it.concluido ? "text-muted line-through" : "text-amber"}`}>
              {formatarData(it.lembrete_em)}
            </span>
          )}
        </span>
        <span className={`block mt-1 text-ink ${it.concluido ? "line-through text-muted" : ""}`}>{it.texto}</span>
      </span>
      <span className="flex items-center gap-1 shrink-0">
        {ehLembrete && !it.concluido && (
          <form action={concluirLembreteAction}>
            <input type="hidden" name="interacao_id" value={it.id} />
            <input type="hidden" name="cliente_id" value={clienteId} />
            <input type="hidden" name="concluido" value="true" />
            <button type="submit" className="text-xs font-semibold text-good hover:underline">✓ feito</button>
          </form>
        )}
        <form action={apagarInteracaoAction}>
          <input type="hidden" name="interacao_id" value={it.id} />
          <input type="hidden" name="cliente_id" value={clienteId} />
          <button type="submit" aria-label="Apagar" className="w-7 h-7 grid place-items-center rounded-lg text-muted hover:text-danger">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2m-9 0v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6" /></svg>
          </button>
        </form>
      </span>
    </li>
  );
}
