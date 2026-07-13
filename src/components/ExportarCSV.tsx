"use client";

/**
 * Botão que baixa um CSV (separador ";" para o Excel-BR abrir certinho, com BOM
 * para acentos). Recebe cabeçalho e linhas já formatadas como strings/números.
 */
export function ExportarCSV({
  nomeArquivo,
  colunas,
  linhas,
  rotulo = "Baixar CSV",
}: {
  nomeArquivo: string;
  colunas: string[];
  linhas: (string | number)[][];
  rotulo?: string;
}) {
  function baixar() {
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const corpo = [colunas, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
    const blob = new Blob(["﻿" + corpo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo.endsWith(".csv") ? nomeArquivo : `${nomeArquivo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={baixar}
      disabled={linhas.length === 0}
      className="h-10 inline-flex items-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
      {rotulo}
    </button>
  );
}
