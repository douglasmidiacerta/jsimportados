"use client";

import { useMemo, useState } from "react";
import { CartaoProduto } from "./CartaoProduto";
import { CampoBusca } from "./ListaCadastro";
import { normalizar } from "@/lib/formato";
import type { ProdutoLista } from "@/lib/dados/tipos";

/** Grade de produtos com busca instantânea. hrefBase presente -> cards viram links (gestão). */
export function GradeProdutos({
  produtos,
  hrefBase,
  placeholder = "Buscar produto…",
}: {
  produtos: ProdutoLista[];
  hrefBase?: string;
  placeholder?: string;
}) {
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const q = normalizar(busca);
    if (!q) return produtos;
    return produtos.filter((p) =>
      normalizar(`${p.nome} ${p.categoria_nome ?? ""}`).includes(q),
    );
  }, [busca, produtos]);

  return (
    <div className="flex flex-col gap-4">
      <CampoBusca valor={busca} onChange={setBusca} placeholder={placeholder} />

      {produtos.length === 0 ? (
        <p className="text-muted text-center py-12">
          Nenhum produto cadastrado ainda.
        </p>
      ) : filtrados.length === 0 ? (
        <p className="text-muted text-center py-12">
          Nada encontrado. Tente outro nome.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtrados.map((p) => (
            <CartaoProduto
              key={p.id}
              produto={p}
              href={hrefBase ? `${hrefBase}/${p.id}` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
