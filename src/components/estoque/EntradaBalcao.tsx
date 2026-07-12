"use client";

import { useActionState, useMemo, useState } from "react";
import { CampoBusca } from "@/components/cadastros/ListaCadastro";
import { normalizar, formatarQtd, urlFoto } from "@/lib/formato";
import type { EstoqueBalcaoItem, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function EntradaBalcao({
  produtos,
  action,
}: {
  produtos: EstoqueBalcaoItem[];
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<EstoqueBalcaoItem | null>(null);
  const [qtd, setQtd] = useState(1);

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    if (!q) return produtos;
    return produtos.filter((p) =>
      normalizar(`${p.nome} ${p.categoria_nome ?? ""}`).includes(q),
    );
  }, [busca, produtos]);

  // Passo 1: escolher o produto
  if (!sel) {
    return (
      <div className="flex flex-col gap-4">
        <CampoBusca
          valor={busca}
          onChange={setBusca}
          placeholder="Qual produto chegou?"
        />
        {produtos.length === 0 ? (
          <p className="text-muted text-center py-10">
            Nenhum produto cadastrado. Cadastre um produto primeiro.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="text-muted text-center py-10">
            Nada encontrado. Tente outro nome.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtrados.map((p) => {
              const foto = urlFoto(p.foto_path);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSel(p);
                      setQtd(1);
                    }}
                    className="w-full flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left hover:border-accent/40 transition-colors"
                  >
                    <span className="w-14 h-14 rounded-xl bg-surface-2 overflow-hidden grid place-items-center shrink-0">
                      {foto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={foto} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-extrabold text-accent/40">
                          {p.nome.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-ink truncate">
                        {p.nome}
                      </span>
                      <span className="block text-sm text-muted">
                        Em estoque: {formatarQtd(p.estoque_atual)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // Passo 2: quantidade + confirmar
  const foto = urlFoto(sel.foto_path);
  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="produto_id" value={sel.id} />
      <input type="hidden" name="quantidade" value={String(qtd)} />

      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        <span className="w-16 h-16 rounded-xl bg-surface-2 overflow-hidden grid place-items-center shrink-0">
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-extrabold text-accent/40">
              {sel.nome.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-ink text-lg truncate">{sel.nome}</p>
          <p className="text-sm text-muted">
            Em estoque agora: {formatarQtd(sel.estoque_atual)}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-sm font-semibold text-muted">
          Quantas unidades chegaram?
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setQtd((q) => Math.max(1, q - 1))}
            aria-label="Menos"
            className="w-16 h-16 rounded-2xl border border-line bg-surface grid place-items-center text-3xl font-bold text-ink active:scale-95 transition-transform"
          >
            −
          </button>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={qtd}
            onChange={(e) => setQtd(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            className="w-24 h-16 text-center text-3xl font-extrabold text-ink rounded-2xl border border-line bg-surface-2 outline-none focus:border-accent tabular-nums"
          />
          <button
            type="button"
            onClick={() => setQtd((q) => q + 1)}
            aria-label="Mais"
            className="w-16 h-16 rounded-2xl bg-accent grid place-items-center text-3xl font-bold text-white active:scale-95 transition-transform"
          >
            +
          </button>
        </div>
        <p className="text-sm text-muted">
          Ficará com {formatarQtd(sel.estoque_atual + qtd)} em estoque
        </p>
      </div>

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="h-16 rounded-2xl bg-accent text-white text-xl font-bold shadow-[var(--shadow)] active:scale-[0.99] transition-transform disabled:opacity-60"
        >
          {enviando ? "Salvando…" : "Confirmar entrada"}
        </button>
        <button
          type="button"
          onClick={() => setSel(null)}
          className="h-12 rounded-xl border border-line text-ink font-semibold hover:bg-surface-2 transition-colors"
        >
          Trocar produto
        </button>
      </div>
    </form>
  );
}
