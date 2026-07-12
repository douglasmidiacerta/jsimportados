"use client";

import { useRef, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { urlFoto } from "@/lib/formato";

const TAMANHO_MAX = 3 * 1024 * 1024; // 3 MB
const MAX_FOTOS = 8;

/**
 * Galeria de fotos do produto (loja virtual). Envia a lista ordenada de paths
 * como JSON num input oculto. A 1a foto do produto (capa) continua sendo o
 * campo separado "foto_path".
 */
export function GaleriaFotos({
  name,
  valorInicial,
}: {
  name: string;
  valorInicial?: string[];
}) {
  const [paths, setPaths] = useState<string[]>(valorInicial ?? []);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const frescos = useRef<Set<string>>(new Set()); // uploads desta sessão (podem ser limpos)

  async function limpar(p: string) {
    if (!frescos.current.has(p)) return; // nunca apaga foto já salva
    frescos.current.delete(p);
    try {
      await criarClienteNavegador().storage.from("produtos").remove([p]);
    } catch {
      /* best-effort */
    }
  }

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setErro(null);

    const espaco = MAX_FOTOS - paths.length;
    if (espaco <= 0) {
      setErro(`Máximo de ${MAX_FOTOS} fotos.`);
      return;
    }

    setEnviando(true);
    const supabase = criarClienteNavegador();
    const novos: string[] = [];
    for (const file of files.slice(0, espaco)) {
      if (!file.type.startsWith("image/")) {
        setErro("Escolha imagens (fotos).");
        continue;
      }
      if (file.size > TAMANHO_MAX) {
        setErro("Alguma foto passou de 3 MB e foi ignorada.");
        continue;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const novoPath = `galeria/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("produtos")
        .upload(novoPath, file, { upsert: false, contentType: file.type });
      if (error) {
        setErro("Não deu para enviar alguma foto. Tente de novo.");
      } else {
        frescos.current.add(novoPath);
        novos.push(novoPath);
      }
    }
    if (novos.length) setPaths((atual) => [...atual, ...novos]);
    setEnviando(false);
  }

  async function remover(p: string) {
    setPaths((atual) => atual.filter((x) => x !== p));
    await limpar(p);
  }

  function mover(p: string, dir: -1 | 1) {
    setPaths((atual) => {
      const i = atual.indexOf(p);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= atual.length) return atual;
      const novo = atual.slice();
      [novo[i], novo[j]] = [novo[j], novo[i]];
      return novo;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink">
        Fotos da loja (galeria)
      </span>
      <input type="hidden" name={name} value={JSON.stringify(paths)} />

      {paths.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {paths.map((p, i) => (
            <div
              key={p}
              className="relative group aspect-square rounded-xl border border-line bg-surface-2 overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlFoto(p) ?? ""}
                alt={`Foto ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/45 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => mover(p, -1)}
                  disabled={i === 0}
                  className="px-2 py-1 text-white text-xs disabled:opacity-30"
                  aria-label="Mover para trás"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => remover(p)}
                  className="px-2 py-1 text-white text-xs"
                  aria-label="Remover foto"
                >
                  🗑
                </button>
                <button
                  type="button"
                  onClick={() => mover(p, 1)}
                  disabled={i === paths.length - 1}
                  className="px-2 py-1 text-white text-xs disabled:opacity-30"
                  aria-label="Mover para frente"
                >
                  ▶
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {paths.length < MAX_FOTOS && (
        <label className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-line bg-surface text-ink font-semibold text-sm cursor-pointer hover:bg-surface-2 transition-colors w-fit has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={aoEscolher}
            className="sr-only"
            disabled={enviando}
          />
          {enviando ? "Enviando…" : "Adicionar fotos"}
        </label>
      )}

      {erro && <span className="text-xs text-danger font-medium">{erro}</span>}
    </div>
  );
}
