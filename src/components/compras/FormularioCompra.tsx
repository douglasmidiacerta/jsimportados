"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CampoValor } from "./CampoValor";
import { parseMoedaBR, formatarBRL } from "@/lib/formato";
import { calcularPreviaCompra } from "@/lib/compras/calculo";
import {
  MOEDAS,
  simboloMoeda,
  type Moeda,
  type Fornecedor,
  type ProdutoLista,
  type EstadoForm,
  type CompraPayload,
} from "@/lib/dados/tipos";

const INPUT =
  "w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink placeholder:text-muted outline-none focus:border-accent focus:bg-surface transition-colors";

type ItemLinha = { produto_id: string; quantidade: string; custo_origem: string };
type DespesaLinha = { descricao: string; valor_brl: string };
type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function FormularioCompra({
  action,
  fornecedores,
  produtos,
  dataInicial,
}: {
  action: Acao;
  fornecedores: Fornecedor[];
  produtos: ProdutoLista[];
  dataInicial: string;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});

  const [fornecedorId, setFornecedorId] = useState("");
  const [moeda, setMoeda] = useState<Moeda>("USD");
  const [cambio, setCambio] = useState("");
  const [data, setData] = useState(dataInicial);
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemLinha[]>([
    { produto_id: "", quantidade: "", custo_origem: "" },
  ]);
  const [despesas, setDespesas] = useState<DespesaLinha[]>([]);

  const simbolo = simboloMoeda(moeda);
  const cambioNum = moeda === "BRL" ? 1 : parseMoedaBR(cambio);

  const despesaTotal = useMemo(
    () => despesas.reduce((s, d) => s + parseMoedaBR(d.valor_brl), 0),
    [despesas],
  );

  // Prévia calculada SOMENTE sobre as linhas que irão no payload (produto + qtd),
  // para espelhar exatamente o que o servidor vai gravar.
  const { previa, previaPorIndice, temIncompleto } = useMemo(() => {
    const validos = itens
      .map((it, i) => ({ i, it }))
      .filter((x) => x.it.produto_id && parseMoedaBR(x.it.quantidade) > 0);
    const p = calcularPreviaCompra(
      validos.map((x) => ({
        quantidade: parseMoedaBR(x.it.quantidade),
        custo_origem: parseMoedaBR(x.it.custo_origem),
      })),
      cambioNum,
      despesaTotal,
    );
    const mapa = new Map<number, (typeof p.itens)[number]>();
    validos.forEach((x, k) => mapa.set(x.i, p.itens[k]));
    // linha com produto escolhido mas sem quantidade válida (não pode ser ignorada em silêncio)
    const incompleto = itens.some(
      (it) => it.produto_id && !(parseMoedaBR(it.quantidade) > 0),
    );
    return { previa: p, previaPorIndice: mapa, temIncompleto: incompleto };
  }, [itens, cambioNum, despesaTotal]);

  const payload: CompraPayload = {
    fornecedor_id: fornecedorId || null,
    moeda,
    cambio: cambioNum,
    data_compra: data.trim() || dataInicial,
    observacoes: observacoes.trim() || null,
    itens: itens
      .filter((i) => i.produto_id && parseMoedaBR(i.quantidade) > 0)
      .map((i) => ({
        produto_id: i.produto_id,
        quantidade: parseMoedaBR(i.quantidade),
        custo_origem: parseMoedaBR(i.custo_origem),
      })),
    despesas: despesas
      .filter((d) => parseMoedaBR(d.valor_brl) > 0)
      .map((d) => ({
        descricao: d.descricao.trim() || "Despesa",
        valor_brl: parseMoedaBR(d.valor_brl),
      })),
  };

  const podeEnviar =
    payload.itens.length > 0 && cambioNum > 0 && !temIncompleto;

  function setItem(idx: number, campo: keyof ItemLinha, valor: string) {
    setItens((arr) =>
      arr.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)),
    );
  }
  function setDespesa(idx: number, campo: keyof DespesaLinha, valor: string) {
    setDespesas((arr) =>
      arr.map((d, i) => (i === idx ? { ...d, [campo]: valor } : d)),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {/* Cabeçalho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Fornecedor</span>
          <select
            value={fornecedorId}
            onChange={(e) => setFornecedorId(e.target.value)}
            className={`${INPUT} appearance-none`}
          >
            <option value="">Sem fornecedor</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Data da compra</span>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Moeda da compra</span>
          <select
            value={moeda}
            onChange={(e) => setMoeda(e.target.value as Moeda)}
            className={`${INPUT} appearance-none`}
          >
            {MOEDAS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </label>

        {moeda !== "BRL" && (
          <CampoValor
            label="Câmbio (quanto vale 1 na compra)"
            value={cambio}
            onChange={setCambio}
            simbolo="R$"
            placeholder="0,00"
            previa={
              cambioNum > 0
                ? `1 ${simbolo} = ${formatarBRL(cambioNum)}`
                : undefined
            }
            dica={cambioNum > 0 ? undefined : "Ex.: 1 US$ custou R$ 5,42"}
          />
        )}
      </div>

      {/* Itens */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink tracking-tight">Itens</h2>
          <span className="text-xs text-muted">
            preço pago em {simbolo}
          </span>
        </div>

        {itens.map((it, idx) => {
          const p = previaPorIndice.get(idx);
          return (
            <div
              key={idx}
              className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <select
                  value={it.produto_id}
                  onChange={(e) => setItem(idx, "produto_id", e.target.value)}
                  className={`${INPUT} appearance-none flex-1`}
                >
                  <option value="">Escolha o produto…</option>
                  {produtos.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.nome}
                    </option>
                  ))}
                </select>
                {itens.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setItens((arr) => arr.filter((_, i) => i !== idx))
                    }
                    aria-label="Remover item"
                    className="w-11 h-11 shrink-0 grid place-items-center rounded-xl border border-line text-muted hover:text-danger hover:border-[var(--danger)]/40 transition-colors"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">Quantidade</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={it.quantidade}
                    onChange={(e) => setItem(idx, "quantidade", e.target.value)}
                    placeholder="0"
                    className={INPUT}
                  />
                </label>
                <CampoValor
                  value={it.custo_origem}
                  onChange={(v) => setItem(idx, "custo_origem", v)}
                  simbolo={simbolo}
                  placeholder="0,00"
                />
              </div>

              {p && parseMoedaBR(it.quantidade) > 0 && (
                <div className="flex items-center justify-between text-sm bg-accent-soft/50 rounded-lg px-3 py-2">
                  <span className="text-muted">Custo real por unidade:</span>
                  <span className="font-bold text-accent-ink tabular-nums">
                    {formatarBRL(p.custo_real_unitario)}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() =>
            setItens((arr) => [
              ...arr,
              { produto_id: "", quantidade: "", custo_origem: "" },
            ])
          }
          className="h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-line text-ink font-semibold hover:bg-surface-2 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Adicionar item
        </button>
      </section>

      {/* Despesas */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink tracking-tight">
            Despesas de importação
          </h2>
          <span className="text-xs text-muted">frete, taxas… (em R$)</span>
        </div>

        {despesas.map((d, idx) => (
          <div key={idx} className="flex items-end gap-2">
            <label className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-semibold text-muted">Descrição</span>
              <input
                type="text"
                value={d.descricao}
                onChange={(e) => setDespesa(idx, "descricao", e.target.value)}
                placeholder="Ex.: Frete"
                className={INPUT}
              />
            </label>
            <div className="w-32">
              <CampoValor
                value={d.valor_brl}
                onChange={(v) => setDespesa(idx, "valor_brl", v)}
                simbolo="R$"
                placeholder="0,00"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setDespesas((arr) => arr.filter((_, i) => i !== idx))
              }
              aria-label="Remover despesa"
              className="w-11 h-[52px] shrink-0 grid place-items-center rounded-xl border border-line text-muted hover:text-danger hover:border-[var(--danger)]/40 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setDespesas((arr) => [...arr, { descricao: "", valor_brl: "" }])
          }
          className="h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-line text-ink font-semibold hover:bg-surface-2 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Adicionar despesa
        </button>
      </section>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Observações</span>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={2}
          placeholder="Anotações da compra (opcional)"
          className={`${INPUT} py-3 resize-y`}
        />
      </label>

      {/* Resumo */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4 flex flex-col gap-1.5">
        <Linha rotulo="Total dos itens" valor={formatarBRL(previa.total_itens_brl)} />
        <Linha rotulo="Despesas" valor={formatarBRL(previa.total_despesas_brl)} />
        <div className="border-t border-line my-1" />
        <Linha rotulo="Total da compra" valor={formatarBRL(previa.total_geral_brl)} forte />
      </div>

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link
          href="/gestao/compras"
          className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={enviando || !podeEnviar}
          className="h-14 rounded-xl bg-accent px-6 text-white text-lg font-bold tracking-tight shadow-[var(--shadow)] transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          {enviando ? "Registrando…" : "Registrar compra"}
        </button>
      </div>
      {!podeEnviar && (
        <p className="text-xs text-muted text-center sm:text-right">
          {temIncompleto
            ? "Informe a quantidade de todos os produtos escolhidos."
            : `Adicione ao menos um item (com produto e quantidade)${moeda !== "BRL" ? " e informe o câmbio" : ""}.`}
        </p>
      )}
    </form>
  );
}

function Linha({
  rotulo,
  valor,
  forte,
}: {
  rotulo: string;
  valor: string;
  forte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={forte ? "font-bold text-ink" : "text-muted text-sm"}>
        {rotulo}
      </span>
      <span
        className={`tabular-nums ${forte ? "text-xl font-extrabold text-ink" : "text-ink font-semibold"}`}
      >
        {valor}
      </span>
    </div>
  );
}
