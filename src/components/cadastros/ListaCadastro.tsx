"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { normalizar } from "@/lib/formato";

export type ItemLista = {
  id: string;
  titulo: string;
  subtitulo?: string;
  extra?: string;
  arquivado?: boolean;
};

/** Lista de cadastro com busca instantânea (client-side). Cada item vira link de edição. */
export function ListaCadastro({
  itens,
  hrefBase,
  placeholder = "Buscar…",
  vazioTexto = "Nada cadastrado ainda.",
}: {
  itens: ItemLista[];
  hrefBase: string;
  placeholder?: string;
  vazioTexto?: string;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    if (!q) return itens;
    return itens.filter((i) =>
      normalizar(`${i.titulo} ${i.subtitulo ?? ""}`).includes(q),
    );
  }, [busca, itens]);

  return (
    <div className="flex flex-col gap-4">
      <CampoBusca valor={busca} onChange={setBusca} placeholder={placeholder} />

      {itens.length === 0 ? (
        <p className="text-muted text-center py-10">{vazioTexto}</p>
      ) : filtrados.length === 0 ? (
        <p className="text-muted text-center py-10">
          Nada encontrado. Tente outro nome.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((i) => (
            <li key={i.id}>
              <Link
                href={`${hrefBase}/${i.id}`}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface-2 transition-colors"
              >
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink truncate">
                      {i.titulo}
                    </span>
                    {i.arquivado && (
                      <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-line shrink-0">
                        arquivado
                      </span>
                    )}
                  </span>
                  {i.subtitulo && (
                    <span className="block text-sm text-muted truncate">
                      {i.subtitulo}
                    </span>
                  )}
                </span>
                {i.extra && (
                  <span className="font-semibold text-ink tabular-nums shrink-0">
                    {i.extra}
                  </span>
                )}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted shrink-0"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CampoBusca({
  valor,
  onChange,
  placeholder,
}: {
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex items-center">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-4 text-muted pointer-events-none"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 pl-11 pr-4 text-base text-ink placeholder:text-muted outline-none focus:border-accent focus:bg-surface transition-colors"
      />
    </div>
  );
}
