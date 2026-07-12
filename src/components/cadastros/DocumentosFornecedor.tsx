"use client";

import { useRef, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { FornecedorDocumento } from "@/lib/dados/tipos";

const TAMANHO_MAX = 8 * 1024 * 1024; // 8 MB
const TIPOS_DOC = [
  "Contrato",
  "Cartão CNPJ",
  "Certidão",
  "Nota Fiscal",
  "RG / CPF",
  "Outro",
];

/**
 * Documentos do fornecedor: upload de imagem/PDF para o bucket PRIVADO
 * 'fornecedor-docs'. Reporta a lista (tipo, descricao, arquivo_path,
 * tipo_arquivo) como JSON num input oculto.
 */
export function DocumentosFornecedor({
  name,
  valorInicial,
}: {
  name: string;
  valorInicial?: FornecedorDocumento[];
}) {
  const [docs, setDocs] = useState<FornecedorDocumento[]>(valorInicial ?? []);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Uploads desta sessão (ainda não salvos) — podem ser apagados do storage.
  const frescos = useRef<Set<string>>(new Set());

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setErro(null);
    setEnviando(true);
    const supabase = criarClienteNavegador();
    const novos: FornecedorDocumento[] = [];
    for (const file of files) {
      const ehPdf = file.type === "application/pdf";
      const ehImg = file.type.startsWith("image/");
      if (!ehPdf && !ehImg) {
        setErro("Envie imagem ou PDF.");
        continue;
      }
      if (file.size > TAMANHO_MAX) {
        setErro("Algum arquivo passou de 8 MB e foi ignorado.");
        continue;
      }
      const ext = (file.name.split(".").pop() || (ehPdf ? "pdf" : "jpg")).toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("fornecedor-docs")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        setErro("Não deu para enviar algum arquivo. Tente de novo.");
        continue;
      }
      frescos.current.add(path);
      const { data: signed } = await supabase.storage
        .from("fornecedor-docs")
        .createSignedUrl(path, 3600);
      novos.push({
        tipo: "Outro",
        descricao: file.name,
        arquivo_path: path,
        tipo_arquivo: ehPdf ? "pdf" : "image",
        url: signed?.signedUrl ?? null,
      });
    }
    if (novos.length) setDocs((a) => [...a, ...novos]);
    setEnviando(false);
  }

  function atualizar(i: number, campo: "tipo" | "descricao", valor: string) {
    setDocs((a) => a.map((d, idx) => (idx === i ? { ...d, [campo]: valor } : d)));
  }
  async function remover(i: number) {
    const alvo = docs[i];
    setDocs((a) => a.filter((_, idx) => idx !== i));
    // Se foi enviado agora (ainda não salvo), apaga do storage p/ não deixar órfão.
    if (alvo && frescos.current.has(alvo.arquivo_path)) {
      frescos.current.delete(alvo.arquivo_path);
      try {
        await criarClienteNavegador()
          .storage.from("fornecedor-docs")
          .remove([alvo.arquivo_path]);
      } catch {
        /* best-effort */
      }
    }
  }

  // No JSON só vão os campos que o banco usa (sem a url assinada).
  const paraJson = docs.map((d) => ({
    tipo: d.tipo,
    descricao: d.descricao,
    arquivo_path: d.arquivo_path,
    tipo_arquivo: d.tipo_arquivo,
  }));

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <legend className="px-2 text-sm font-bold text-ink uppercase tracking-wide">
        Documentos
      </legend>
      <input type="hidden" name={name} value={JSON.stringify(paraJson)} />

      {docs.length === 0 ? (
        <p className="text-sm text-muted italic">
          Nenhum documento enviado até o momento.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {docs.map((d, i) => (
            <div
              key={d.arquivo_path}
              className="rounded-xl border border-line bg-surface-2 p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                  {d.tipo_arquivo === "pdf" ? "📄" : "🖼️"}
                </span>
                {d.url ? (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-accent-ink hover:underline truncate"
                  >
                    {d.descricao || "Ver arquivo"}
                  </a>
                ) : (
                  <span className="text-sm text-ink truncate">
                    {d.descricao || "Arquivo enviado"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted">Tipo</span>
                  <select
                    value={d.tipo ?? "Outro"}
                    onChange={(e) => atualizar(i, "tipo", e.target.value)}
                    className="min-h-[40px] rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent appearance-none"
                  >
                    {TIPOS_DOC.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted">Descrição</span>
                  <input
                    value={d.descricao ?? ""}
                    onChange={(e) => atualizar(i, "descricao", e.target.value)}
                    className="min-h-[40px] rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
                  />
                </label>
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

      <label className="self-start inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-line bg-surface text-ink font-semibold text-sm cursor-pointer hover:bg-surface-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-accent">
        <input
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={aoEscolher}
          className="sr-only"
          disabled={enviando}
        />
        {enviando ? "Enviando…" : "+ Adicionar documento"}
      </label>

      {erro && <span className="text-xs text-danger font-medium">{erro}</span>}
    </fieldset>
  );
}
