"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CampoBusca } from "@/components/cadastros/ListaCadastro";
import { CampoValor } from "@/components/compras/CampoValor";
import {
  normalizar,
  formatarBRL,
  parseMoedaBR,
  numeroParaCampoBR,
  formatarQtd,
} from "@/lib/formato";
import { precoNaLista } from "@/lib/vendas/preco";
import {
  type ProdutoPDV,
  type Cliente,
  type ListaPreco,
  type OrcamentoPayload,
  type EstadoForm,
} from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
type Item = { produto: ProdutoPDV; qtd: string; preco: number; versao: number };
const qn = (i: Item) => parseMoedaBR(i.qtd);

export function OrcamentoBuilder({
  produtos,
  clientes,
  listas,
  listaDefaultId,
  action,
}: {
  produtos: ProdutoPDV[];
  clientes: Cliente[];
  listas: ListaPreco[];
  listaDefaultId: string;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<Item[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [listaId, setListaId] = useState(listaDefaultId);
  const [desconto, setDesconto] = useState("");
  const [validade, setValidade] = useState("");
  const [obs, setObs] = useState("");

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    const base = q
      ? produtos.filter((p) =>
          normalizar(`${p.nome} ${p.categoria_nome ?? ""} ${p.codigo_barras ?? ""}`).includes(q),
        )
      : produtos;
    return base.slice(0, 30);
  }, [busca, produtos]);

  const subtotal = carrinho.reduce((s, i) => s + qn(i) * i.preco, 0);
  const descNum = parseMoedaBR(desconto);
  const total = Math.max(0, subtotal - descNum);

  function add(p: ProdutoPDV) {
    setCarrinho((arr) => {
      const i = arr.findIndex((x) => x.produto.id === p.id);
      if (i >= 0) return arr.map((x, j) => (j === i ? { ...x, qtd: formatarQtd(qn(x) + 1) } : x));
      return [...arr, { produto: p, qtd: "1", preco: precoNaLista(p, listaId, listaDefaultId), versao: 0 }];
    });
    setBusca("");
  }
  function aplicarLista(id: string) {
    setListaId(id);
    setCarrinho((arr) => arr.map((x) => ({ ...x, preco: precoNaLista(x.produto, id, listaDefaultId), versao: x.versao + 1 })));
  }
  const setQtd = (i: number, v: string) => setCarrinho((arr) => arr.map((x, j) => (j === i ? { ...x, qtd: v } : x)));
  const setPreco = (i: number, v: string) => setCarrinho((arr) => arr.map((x, j) => (j === i ? { ...x, preco: parseMoedaBR(v) } : x)));
  const remover = (i: number) => setCarrinho((arr) => arr.filter((_, j) => j !== i));

  const payload: OrcamentoPayload = {
    cliente_id: clienteId || null,
    lista_preco_id: listaId || null,
    observacoes: obs || null,
    validade: validade || null,
    desconto: descNum,
    itens: carrinho.map((c) => ({ produto_id: c.produto.id, quantidade: qn(c), preco_unitario: c.preco })),
  };
  const pode = carrinho.length > 0 && carrinho.every((c) => qn(c) > 0);
  const temOutrasListas = listas.length > 1;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar produto para o orçamento…" />
      {busca && (
        <ul className="flex flex-col gap-2">
          {filtrados.length === 0 ? (
            <li className="text-muted text-center py-4">Nada encontrado.</li>
          ) : (
            filtrados.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => add(p)} className="w-full flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 text-left hover:border-accent/40 transition-colors">
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink truncate">{p.nome}</span>
                    <span className="block text-sm text-muted">{formatarBRL(p.preco_venda)}</span>
                  </span>
                  <span className="text-accent font-bold text-2xl leading-none">+</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {carrinho.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink">Itens do orçamento</span>
          {carrinho.map((c, i) => (
            <div key={c.produto.id} className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink truncate">{c.produto.nome}</span>
                <button type="button" onClick={() => remover(i)} aria-label="Remover" className="w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-danger">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-sm">
                  <span className="text-muted">R$</span>
                  <input key={`p-${c.produto.id}-${c.versao}`} type="text" inputMode="decimal" defaultValue={numeroParaCampoBR(c.preco)} onChange={(e) => setPreco(i, e.target.value)} className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1 text-ink" />
                </span>
                <span className="text-muted text-sm">×</span>
                <input type="text" inputMode="decimal" value={c.qtd} onChange={(e) => setQtd(i, e.target.value)} className="w-16 h-9 text-center font-bold rounded-lg border border-line bg-surface-2 text-ink" />
                <span className="text-sm text-muted">{c.produto.unidade}</span>
                <span className="ml-auto font-bold text-ink tabular-nums">{formatarBRL(qn(c) * c.preco)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Cliente (opcional)</span>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent appearance-none">
            <option value="">Sem cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Vale até (opcional)</span>
          <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent" />
        </label>
      </div>

      {temOutrasListas && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Lista de preço</span>
          <select value={listaId} onChange={(e) => aplicarLista(e.target.value)} className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent appearance-none">
            {listas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </label>
      )}

      <CampoValor label="Desconto (opcional)" value={desconto} onChange={setDesconto} simbolo="R$" placeholder="0,00" />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Observações (opcional)</span>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Condições, prazo de entrega…" className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-base text-ink outline-none focus:border-accent resize-y" />
      </label>

      <div className="rounded-2xl border border-line bg-surface-2 p-4 flex items-center justify-between">
        <span className="text-sm text-muted">Total do orçamento</span>
        <span className="text-2xl font-extrabold text-ink tabular-nums">{formatarBRL(total)}</span>
      </div>

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">{estado.erro}</p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link href="/gestao/orcamentos" className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2 transition-colors">Cancelar</Link>
        <button type="submit" disabled={enviando || !pode} className="h-14 sm:h-12 rounded-xl bg-accent text-white px-6 font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60">
          {enviando ? "Salvando…" : "Salvar orçamento"}
        </button>
      </div>
    </form>
  );
}
