"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatarBRL, formatarQtd, normalizar, urlFoto } from "@/lib/formato";
import type { ProdutoLista } from "@/lib/dados/tipos";
import { CampoBusca } from "./ListaCadastro";

type Ordem = "nome" | "estoque" | "varejo" | "custo";

const SELECT =
  "min-h-[44px] rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent appearance-none";

function corEstoque(p: ProdutoLista): "verde" | "vermelha" {
  return p.estoque_atual > 0 ? "verde" : "vermelha";
}

/**
 * Grade densa de produtos (padrão FPQ) para o desktop da gestão: busca
 * instantânea, filtro por categoria, ordenação e cores por estado de estoque.
 */
export function TabelaProdutos({ produtos }: { produtos: ProdutoLista[] }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("nome");

  const categorias = useMemo(() => {
    const s = new Set<string>();
    for (const p of produtos) if (p.categoria_nome) s.add(p.categoria_nome);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [produtos]);

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    let lista = produtos;
    if (categoria) lista = lista.filter((p) => p.categoria_nome === categoria);
    if (q) {
      lista = lista.filter((p) =>
        normalizar(
          `${p.nome} ${p.marca ?? ""} ${p.modelo ?? ""} ${p.categoria_nome ?? ""}`,
        ).includes(q),
      );
    }
    const c = [...lista];
    if (ordem === "nome") c.sort((a, b) => a.nome.localeCompare(b.nome));
    if (ordem === "estoque") c.sort((a, b) => b.estoque_atual - a.estoque_atual);
    if (ordem === "varejo") c.sort((a, b) => b.preco_venda - a.preco_venda);
    if (ordem === "custo") c.sort((a, b) => (b.custo ?? -1) - (a.custo ?? -1));
    return c;
  }, [produtos, busca, categoria, ordem]);

  const brl = (v: number | null) =>
    v == null ? <span className="text-muted">—</span> : formatarBRL(v);

  return (
    <div className="flex flex-col gap-3">
      {/* filtros (padrão FPQ: ordenar + filtro por categoria + pesquisar) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[220px]">
          <CampoBusca valor={busca} onChange={setBusca} placeholder="Pesquisar produto…" />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className={SELECT}
          aria-label="Filtro por categoria"
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={ordem}
          onChange={(e) => setOrdem(e.target.value as Ordem)}
          className={SELECT}
          aria-label="Ordenar por"
        >
          <option value="nome">Por descrição</option>
          <option value="estoque">Por estoque</option>
          <option value="varejo">Por preço</option>
          <option value="custo">Por custo</option>
        </select>
        <span className="text-xs text-muted tabular-nums whitespace-nowrap">
          {filtrados.length} de {produtos.length}
        </span>
      </div>

      <div className="rounded-2xl border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px] leading-tight">
            <thead>
              <tr className="border-b-2 border-line">
                <Th>Produto</Th>
                <Th>Categoria</Th>
                <Th>Marca</Th>
                <Th>Un</Th>
                <Th dir>Estoque</Th>
                <Th dir>Custo méd.</Th>
                <Th dir>Últ. compra</Th>
                <Th dir>Varejo</Th>
                <Th dir>Atacado</Th>
                <Th centro>Loja</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-8">
                    Nada encontrado. Tente outro nome ou categoria.
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-line last:border-b-0 hover:bg-surface-2 transition-colors linha-${corEstoque(p)}`}
                  >
                    <td className="px-3 py-1.5">
                      <Link href={`/gestao/produtos/${p.id}`} className="flex items-center gap-2.5 min-w-0 group">
                        <span className="w-8 h-8 rounded-lg border border-line bg-surface-2 overflow-hidden grid place-items-center shrink-0">
                          {urlFoto(p.foto_path) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={urlFoto(p.foto_path)!} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-muted">—</span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink truncate max-w-[26ch] group-hover:underline">
                            {p.nome}
                          </span>
                          {!p.ativo && (
                            <span className="text-[10px] font-mono uppercase text-muted">arquivado</span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-muted">
                      {p.categoria_nome ?? "—"}
                      {p.subcategoria_nome && <span> · {p.subcategoria_nome}</span>}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{p.marca ?? <span className="text-muted">—</span>}</td>
                    <td className="px-3 py-1.5">{p.unidade}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-ink">
                      {formatarQtd(p.estoque_atual)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{brl(p.custo)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{brl(p.custo_ultima_compra)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-ink">
                      {p.preco_venda > 0 ? formatarBRL(p.preco_venda) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{brl(p.preco_atacado)}</td>
                    <td className="px-3 py-1.5 text-center">
                      {p.loja_ativo ? (
                        <span className="text-good font-bold" title="Ativo na loja virtual">✓</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-4 px-3 py-2 border-t border-line text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded linha-verde border border-line" /> Em estoque
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded linha-vermelha border border-line" /> Zerado ou negativo
          </span>
          <span className="ml-auto">Custo e margem: só a gestão vê.</span>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  dir,
  centro,
}: {
  children: React.ReactNode;
  dir?: boolean;
  centro?: boolean;
}) {
  return (
    <th
      className={`px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-wider text-muted font-semibold whitespace-nowrap ${dir ? "text-right" : centro ? "text-center" : "text-left"}`}
    >
      {children}
    </th>
  );
}
