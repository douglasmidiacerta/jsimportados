"use client";

import { useState } from "react";

export type CampoLista = {
  name: string;
  label: string;
  tipo?: "text" | "tel" | "email" | "checkbox" | "select";
  opcoes?: { valor: string; rotulo: string }[];
  placeholder?: string;
  larguraCompleta?: boolean;
};

type Item = Record<string, string | boolean>;

/**
 * Lista de itens repetíveis (endereços, contatos, bancos…). Cada item é um
 * conjunto de campos; adiciona/remove linhas. Reporta a lista como JSON num
 * input oculto (chave = name).
 */
export function ListaEditavel({
  name,
  titulo,
  descricao,
  campos,
  valorInicial,
  textoVazio,
  rotuloAdd,
}: {
  name: string;
  titulo: string;
  descricao?: string;
  campos: CampoLista[];
  valorInicial?: Item[];
  textoVazio: string;
  rotuloAdd: string;
}) {
  const [itens, setItens] = useState<Item[]>(valorInicial ?? []);

  function vazio(): Item {
    const o: Item = {};
    for (const c of campos) o[c.name] = c.tipo === "checkbox" ? false : "";
    return o;
  }
  function adicionar() {
    setItens((a) => [...a, vazio()]);
  }
  function remover(i: number) {
    setItens((a) => a.filter((_, idx) => idx !== i));
  }
  function atualizar(i: number, campo: string, valor: string | boolean) {
    setItens((a) => a.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)));
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <legend className="px-2 text-sm font-bold text-ink uppercase tracking-wide">
        {titulo}
      </legend>
      {descricao && <p className="text-xs text-muted -mt-1">{descricao}</p>}

      <input type="hidden" name={name} value={JSON.stringify(itens)} />

      {itens.length === 0 ? (
        <p className="text-sm text-muted italic">{textoVazio}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {itens.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-line bg-surface-2 p-3 flex flex-col gap-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {campos.map((c) => (
                  <label
                    key={c.name}
                    className={`flex flex-col gap-1 ${c.larguraCompleta ? "sm:col-span-2" : ""} ${c.tipo === "checkbox" ? "sm:col-span-2 flex-row items-center gap-2" : ""}`}
                  >
                    {c.tipo === "checkbox" ? (
                      <>
                        <input
                          type="checkbox"
                          checked={Boolean(item[c.name])}
                          onChange={(e) => atualizar(i, c.name, e.target.checked)}
                          className="h-5 w-5 rounded border-line accent-[var(--accent)]"
                        />
                        <span className="text-sm text-ink">{c.label}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-muted">{c.label}</span>
                        {c.tipo === "select" ? (
                          <select
                            value={String(item[c.name] ?? "")}
                            onChange={(e) => atualizar(i, c.name, e.target.value)}
                            className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-base text-ink outline-none focus:border-accent appearance-none"
                          >
                            <option value="">—</option>
                            {c.opcoes?.map((o) => (
                              <option key={o.valor} value={o.valor}>
                                {o.rotulo}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={c.tipo === "tel" ? "tel" : c.tipo === "email" ? "email" : "text"}
                            value={String(item[c.name] ?? "")}
                            onChange={(e) => atualizar(i, c.name, e.target.value)}
                            placeholder={c.placeholder}
                            className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-base text-ink outline-none focus:border-accent"
                          />
                        )}
                      </>
                    )}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => remover(i)}
                className="self-start text-xs font-semibold text-danger hover:underline"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={adicionar}
        className="self-start h-10 px-4 rounded-xl border border-line bg-surface text-ink font-semibold text-sm hover:bg-surface-2"
      >
        + {rotuloAdd}
      </button>
    </fieldset>
  );
}
