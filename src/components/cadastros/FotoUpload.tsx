"use client";

import { useRef, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { urlFoto } from "@/lib/formato";

const TAMANHO_MAX = 3 * 1024 * 1024; // 3 MB

/** Upload de foto do produto para o Storage. Reporta o caminho salvo via input oculto. */
export function FotoUpload({
  name,
  valorInicial,
}: {
  name: string;
  valorInicial?: string | null;
}) {
  const [path, setPath] = useState<string | null>(valorInicial ?? null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Caminhos enviados nesta sessão (ainda não salvos) — podemos limpá-los sem afetar o DB.
  const frescos = useRef<Set<string>>(new Set());

  async function removerDoStorage(p: string | null) {
    if (!p || !frescos.current.has(p)) return; // nunca apaga a foto já salva (valorInicial)
    frescos.current.delete(p);
    try {
      await criarClienteNavegador().storage.from("produtos").remove([p]);
    } catch {
      // limpeza best-effort; ignora falha
    }
  }

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reescolher o mesmo arquivo
    if (!file) return;

    setErro(null);
    if (!file.type.startsWith("image/")) {
      setErro("Escolha uma imagem (foto).");
      return;
    }
    if (file.size > TAMANHO_MAX) {
      setErro("A foto é muito grande (máx. 3 MB).");
      return;
    }

    setEnviando(true);
    try {
      const supabase = criarClienteNavegador();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const novoPath = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("produtos")
        .upload(novoPath, file, { upsert: false, contentType: file.type });
      if (error) {
        setErro("Não deu para enviar a foto. Tente de novo.");
      } else {
        await removerDoStorage(path); // limpa o upload anterior desta sessão
        frescos.current.add(novoPath);
        setPath(novoPath);
      }
    } catch {
      setErro("Não deu para enviar a foto. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  async function aoRemover() {
    await removerDoStorage(path);
    setPath(null);
  }

  const preview = urlFoto(path);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">Foto (opcional)</span>
      <input type="hidden" name={name} value={path ?? ""} />

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-xl border border-line bg-surface-2 overflow-hidden grid place-items-center shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Foto do produto"
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 20" />
            </svg>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-line bg-surface text-ink font-semibold text-sm cursor-pointer hover:bg-surface-2 transition-colors w-fit has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-accent has-[:focus-visible]:outline-offset-2">
            <input
              type="file"
              accept="image/*"
              onChange={aoEscolher}
              className="sr-only"
              disabled={enviando}
            />
            {enviando ? "Enviando…" : preview ? "Trocar foto" : "Escolher foto"}
          </label>
          {path && !enviando && (
            <button
              type="button"
              onClick={aoRemover}
              className="text-xs text-danger font-medium text-left"
            >
              Remover foto
            </button>
          )}
        </div>
      </div>

      {erro && <span className="text-xs text-danger font-medium">{erro}</span>}
    </div>
  );
}
