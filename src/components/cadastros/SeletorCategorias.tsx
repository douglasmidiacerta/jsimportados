"use client";

import { useState, useTransition } from "react";
import type { Categoria } from "@/lib/dados/tipos";

type Resultado = { categoria?: Categoria; erro?: string };

const CLASSE_SELECT =
  "w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent focus:bg-surface transition-colors appearance-none";

/**
 * Escolhe categoria + subcategoria com botão "+" para criar qualquer uma na
 * hora (sem sair da tela). Reporta os ids em inputs ocultos.
 */
export function SeletorCategorias({
  categoriasIniciais,
  defaultCategoriaId,
  defaultSubcategoriaId,
  onCriar,
}: {
  categoriasIniciais: Categoria[];
  defaultCategoriaId?: string | null;
  defaultSubcategoriaId?: string | null;
  onCriar: (nome: string, parentId: string | null) => Promise<Resultado>;
}) {
  const [lista, setLista] = useState<Categoria[]>(categoriasIniciais);
  const [categoriaId, setCategoriaId] = useState(defaultCategoriaId ?? "");
  const [subcategoriaId, setSubcategoriaId] = useState(
    defaultSubcategoriaId ?? "",
  );

  const topo = lista.filter((c) => c.parent_id == null);
  const subs = lista.filter((c) => c.parent_id === categoriaId);

  function trocarCategoria(id: string) {
    setCategoriaId(id);
    // se a subcategoria escolhida não pertence à nova categoria, limpa
    setSubcategoriaId((atual) => {
      const ok = lista.some((c) => c.id === atual && c.parent_id === id);
      return ok ? atual : "";
    });
  }

  function aoCriar(cat: Categoria) {
    setLista((l) => [...l, cat]);
    if (cat.parent_id == null) trocarCategoria(cat.id);
    else setSubcategoriaId(cat.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="categoria_id" value={categoriaId} />
      <input type="hidden" name="subcategoria_id" value={subcategoriaId} />

      <CampoComMais
        label="Categoria"
        valor={categoriaId}
        onChange={trocarCategoria}
        opcoes={topo}
        opcaoVazia="Sem categoria"
        rotuloCriar="Nova categoria"
        onCriar={(nome) => onCriar(nome, null)}
        aoCriado={aoCriar}
        podeCriar
      />

      <CampoComMais
        label="Subcategoria"
        valor={subcategoriaId}
        onChange={setSubcategoriaId}
        opcoes={subs}
        opcaoVazia={categoriaId ? "Sem subcategoria" : "Escolha a categoria primeiro"}
        rotuloCriar="Nova subcategoria"
        onCriar={(nome) => onCriar(nome, categoriaId)}
        aoCriado={aoCriar}
        podeCriar={!!categoriaId}
      />
    </div>
  );
}

function CampoComMais({
  label,
  valor,
  onChange,
  opcoes,
  opcaoVazia,
  rotuloCriar,
  onCriar,
  aoCriado,
  podeCriar,
}: {
  label: string;
  valor: string;
  onChange: (id: string) => void;
  opcoes: Categoria[];
  opcaoVazia: string;
  rotuloCriar: string;
  onCriar: (nome: string) => Promise<Resultado>;
  aoCriado: (cat: Categoria) => void;
  podeCriar: boolean;
}) {
  const [abrindo, setAbrindo] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function criar() {
    setErro(null);
    const limpo = nome.trim();
    if (!limpo) return setErro("Digite o nome.");
    iniciar(async () => {
      const r = await onCriar(limpo);
      if (r.erro) return setErro(r.erro);
      if (r.categoria) {
        aoCriado(r.categoria);
        setNome("");
        setAbrindo(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="flex items-center gap-2">
        <select
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className={CLASSE_SELECT}
        >
          <option value="">{opcaoVazia}</option>
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setErro(null);
            setAbrindo((v) => !v);
          }}
          disabled={!podeCriar}
          title={rotuloCriar}
          aria-label={rotuloCriar}
          className="h-[52px] w-[52px] shrink-0 grid place-items-center rounded-xl border border-line bg-surface text-2xl leading-none text-accent-ink hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      {abrindo && podeCriar && (
        <div className="rounded-xl border border-line bg-surface-2 p-3 flex flex-col gap-2">
          <input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                criar();
              }
            }}
            placeholder={rotuloCriar}
            className="w-full min-h-[44px] rounded-lg border border-line bg-surface px-3 text-base text-ink outline-none focus:border-accent"
          />
          {erro && <span className="text-xs text-danger font-medium">{erro}</span>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={criar}
              disabled={pendente}
              className="h-9 px-3 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-60"
            >
              {pendente ? "Criando…" : "Criar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAbrindo(false);
                setErro(null);
                setNome("");
              }}
              className="h-9 px-3 rounded-lg border border-line text-ink text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
