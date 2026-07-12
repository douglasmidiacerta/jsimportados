"use client";

import { useActionState, useMemo, useState } from "react";
import { CampoBusca } from "@/components/cadastros/ListaCadastro";
import { CampoValor } from "@/components/compras/CampoValor";
import { SeletorPagamento } from "./SeletorPagamento";
import {
  normalizar,
  formatarBRL,
  parseMoedaBR,
  numeroParaCampoBR,
  formatarQtd,
  urlFoto,
} from "@/lib/formato";
import { calcularVenda } from "@/lib/vendas/calculo";
import {
  type ProdutoPDV,
  type Cliente,
  type FormaPagamento,
  type VendaPayload,
  type EstadoForm,
} from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
type ItemCarrinho = { produto: ProdutoPDV; qtd: string; preco: number };

const qtdNum = (c: ItemCarrinho) => parseMoedaBR(c.qtd);

export function PDV({
  produtos,
  clientes,
  podeEditarPreco,
  action,
}: {
  produtos: ProdutoPDV[];
  clientes: Cliente[];
  podeEditarPreco: boolean;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [passo, setPasso] = useState<"montar" | "pagamento">("montar");
  const [busca, setBusca] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [desconto, setDesconto] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [forma, setForma] = useState<FormaPagamento | null>(null);
  const [modalidade, setModalidade] = useState<"debito" | "credito">("credito");
  const [parcelas, setParcelas] = useState(1);
  const [juros, setJuros] = useState("");

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    const base = q
      ? produtos.filter((p) => normalizar(`${p.nome} ${p.categoria_nome ?? ""}`).includes(q))
      : produtos;
    return base.slice(0, 30);
  }, [busca, produtos]);

  const descNum = parseMoedaBR(desconto);
  const jurosNum = forma === "fiado" ? parseMoedaBR(juros) : 0;

  const { subtotal, total } = useMemo(
    () =>
      calcularVenda(
        carrinho.map((c) => ({ quantidade: qtdNum(c), preco_unitario: c.preco })),
        descNum,
        jurosNum,
      ),
    [carrinho, descNum, jurosNum],
  );

  function adicionar(p: ProdutoPDV) {
    setCarrinho((arr) => {
      const i = arr.findIndex((x) => x.produto.id === p.id);
      if (i >= 0)
        return arr.map((x, j) =>
          j === i ? { ...x, qtd: formatarQtd(qtdNum(x) + 1) } : x,
        );
      return [...arr, { produto: p, qtd: "1", preco: p.preco_venda }];
    });
    setBusca("");
  }
  const incQtd = (i: number, d: number) =>
    setCarrinho((arr) =>
      arr.map((x, j) =>
        j === i ? { ...x, qtd: formatarQtd(Math.max(1, qtdNum(x) + d)) } : x,
      ),
    );
  const setQtdTexto = (i: number, v: string) =>
    setCarrinho((arr) => arr.map((x, j) => (j === i ? { ...x, qtd: v } : x)));
  const setPreco = (i: number, v: string) =>
    setCarrinho((arr) =>
      arr.map((x, j) => (j === i ? { ...x, preco: parseMoedaBR(v) } : x)),
    );
  const remover = (i: number) =>
    setCarrinho((arr) => arr.filter((_, j) => j !== i));

  const payload: VendaPayload = {
    cliente_id: clienteId || null,
    forma_pagamento: forma ?? "dinheiro",
    desconto: descNum,
    observacoes: null,
    itens: carrinho.map((c) => ({
      produto_id: c.produto.id,
      quantidade: qtdNum(c),
      preco_unitario: c.preco,
    })),
    cartao:
      forma === "cartao"
        ? { modalidade, parcelas: modalidade === "debito" ? 1 : parcelas }
        : undefined,
    fiado:
      forma === "fiado"
        ? { juros: parseMoedaBR(juros), prazo_dias: 30, vencimento: null }
        : undefined,
  };

  const temEstoqueNegativo = carrinho.some(
    (c) => c.produto.estoque_atual - qtdNum(c) < 0,
  );
  const todasQtdValidas = carrinho.every((c) => qtdNum(c) > 0);
  const podeFinalizar =
    carrinho.length > 0 &&
    todasQtdValidas &&
    forma !== null &&
    (forma !== "fiado" || clienteId !== "");

  // ---------- PASSO MONTAR ----------
  if (passo === "montar") {
    return (
      <div className="flex flex-col gap-4 pb-28">
        <CampoBusca valor={busca} onChange={setBusca} placeholder="Buscar produto para vender…" />

        {busca && (
          <ul className="flex flex-col gap-2">
            {filtrados.length === 0 ? (
              <li className="text-muted text-center py-4">Nada encontrado.</li>
            ) : (
              filtrados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => adicionar(p)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left hover:border-accent/40 transition-colors"
                  >
                    <FotoMini p={p} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-ink truncate">{p.nome}</span>
                      <span className="block text-sm text-muted">
                        {formatarBRL(p.preco_venda)} · {formatarQtd(p.estoque_atual)} {p.unidade} em estoque
                      </span>
                    </span>
                    <span className="text-accent font-bold text-2xl leading-none">+</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {carrinho.length === 0 ? (
          !busca && (
            <p className="text-muted text-center py-10">
              Busque um produto e toque para adicionar à venda.
            </p>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink">Itens da venda</span>
            {carrinho.map((c, i) => (
              <div key={c.produto.id} className="rounded-2xl border border-line bg-surface p-3">
                <div className="flex items-center gap-3">
                  <FotoMini p={c.produto} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-ink truncate">{c.produto.nome}</span>
                    {podeEditarPreco ? (
                      <span className="mt-1 flex items-center gap-1 text-sm">
                        <span className="text-muted">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={numeroParaCampoBR(c.preco)}
                          onChange={(e) => setPreco(i, e.target.value)}
                          className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1 text-ink"
                        />
                      </span>
                    ) : (
                      <span className="block text-sm text-muted">{formatarBRL(c.preco)}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => remover(i)}
                    aria-label="Remover"
                    className="w-9 h-9 grid place-items-center rounded-lg text-muted hover:text-danger"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => incQtd(i, -1)} className="w-10 h-10 rounded-xl border border-line bg-surface grid place-items-center text-xl font-bold active:scale-95">−</button>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={c.qtd}
                      onChange={(e) => setQtdTexto(i, e.target.value)}
                      className="w-16 h-10 text-center text-lg font-bold rounded-xl border border-line bg-surface-2 text-ink outline-none focus:border-accent tabular-nums"
                    />
                    <button type="button" onClick={() => incQtd(i, 1)} className="w-10 h-10 rounded-xl bg-accent text-white grid place-items-center text-xl font-bold active:scale-95">+</button>
                    <span className="text-sm text-muted">{c.produto.unidade}</span>
                  </div>
                  <span className="font-bold text-ink tabular-nums">
                    {formatarBRL(qtdNum(c) * c.preco)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Barra fixa de subtotal */}
        {carrinho.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-line bg-surface/95 backdrop-blur p-4">
            <div className="mx-auto max-w-xl flex items-center gap-4">
              <div className="flex-1">
                <div className="text-xs text-muted">Subtotal</div>
                <div className="text-2xl font-extrabold text-ink tabular-nums leading-none">
                  {formatarBRL(subtotal)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasso("pagamento")}
                disabled={!todasQtdValidas}
                className="h-14 px-6 rounded-2xl bg-accent text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
              >
                Cobrar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- PASSO PAGAMENTO ----------
  return (
    <form action={formAction} className="flex flex-col gap-5 pb-28">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <button
        type="button"
        onClick={() => setPasso("montar")}
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink self-start"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Voltar aos itens
      </button>

      <div className="rounded-2xl border border-line bg-surface-2 p-4 text-center">
        <div className="text-sm text-muted">Total a cobrar</div>
        <div className="text-4xl font-extrabold text-ink tabular-nums">{formatarBRL(total)}</div>
        {(descNum > 0 || jurosNum > 0) && (
          <div className="text-xs text-muted mt-1">
            itens {formatarBRL(subtotal)}
            {descNum > 0 ? ` − desconto ${formatarBRL(descNum)}` : ""}
            {jurosNum > 0 ? ` + juros ${formatarBRL(jurosNum)}` : ""}
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">
          Cliente {forma === "fiado" ? "(obrigatório no fiado)" : "(opcional)"}
        </span>
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent appearance-none"
        >
          <option value="">Sem cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </label>

      <CampoValor
        label="Desconto (opcional)"
        value={desconto}
        onChange={setDesconto}
        simbolo="R$"
        placeholder="0,00"
      />

      <SeletorPagamento
        forma={forma}
        onForma={setForma}
        modalidade={modalidade}
        onModalidade={setModalidade}
        parcelas={parcelas}
        onParcelas={setParcelas}
        juros={juros}
        onJuros={setJuros}
        total={total}
      />

      {temEstoqueNegativo && (
        <p className="text-xs text-amber bg-[var(--amber-soft)] border border-[var(--amber)]/30 rounded-lg px-3 py-2">
          ⚠️ Algum item vai deixar o estoque negativo. A venda é registrada mesmo assim — ajuste o estoque depois.
        </p>
      )}
      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-line bg-surface/95 backdrop-blur p-4">
        <div className="mx-auto max-w-xl">
          <button
            type="submit"
            disabled={enviando || !podeFinalizar}
            className="w-full h-16 rounded-2xl bg-good text-white text-xl font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
          >
            {enviando ? "Registrando…" : `Finalizar venda — ${formatarBRL(total)}`}
          </button>
          {!podeFinalizar && (
            <p className="text-xs text-muted text-center mt-2">
              {carrinho.length === 0
                ? "Adicione produtos."
                : !todasQtdValidas
                  ? "Confira a quantidade dos itens."
                  : !forma
                    ? "Escolha a forma de pagamento."
                    : "Escolha o cliente (venda fiado)."}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

function FotoMini({ p }: { p: ProdutoPDV }) {
  const foto = urlFoto(p.foto_path);
  return (
    <span className="w-12 h-12 rounded-xl bg-surface-2 overflow-hidden grid place-items-center shrink-0">
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-lg font-extrabold text-accent/40">
          {p.nome.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
