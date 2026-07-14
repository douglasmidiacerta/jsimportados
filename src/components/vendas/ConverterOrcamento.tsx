"use client";

import { useState } from "react";
import { MAX_PARCELAS, type Maquininha } from "@/lib/dados/tipos";

type Forma = "dinheiro" | "pix" | "cartao" | "fiado";

/**
 * Converte um orçamento em venda: escolhe a forma de pagamento e envia para a
 * Server Action (que chama converter_orcamento → registrar_venda, com todas as
 * travas de venda). Cartão pede a maquininha quando houver alguma cadastrada.
 */
export function ConverterOrcamento({
  orcamentoId,
  temCliente,
  maquininhas,
  action,
}: {
  orcamentoId: string;
  temCliente: boolean;
  maquininhas: Maquininha[];
  action: (fd: FormData) => Promise<void>;
}) {
  const [forma, setForma] = useState<Forma | null>(null);
  const [modalidade, setModalidade] = useState<"debito" | "credito">("credito");
  const [parcelas, setParcelas] = useState(1);
  // Só uma maquininha? Já vem escolhida — não faz sentido obrigar a tocar nela.
  const [maquininhaId, setMaquininhaId] = useState(
    maquininhas.length === 1 ? maquininhas[0].id : "",
  );

  const maqOk = forma !== "cartao" || maquininhas.length === 0 || maquininhaId !== "";
  const fiadoOk = forma !== "fiado" || temCliente;
  const pode = forma !== null && maqOk && fiadoOk;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={orcamentoId} />
      <input type="hidden" name="forma_pagamento" value={forma ?? ""} />
      <input type="hidden" name="modalidade" value={modalidade} />
      <input type="hidden" name="parcelas" value={modalidade === "debito" ? 1 : parcelas} />
      <input type="hidden" name="maquininha_id" value={maquininhas.length > 0 ? maquininhaId : ""} />

      <span className="text-sm font-semibold text-ink">Como o cliente vai pagar?</span>
      <div className="grid grid-cols-2 gap-2">
        {(["dinheiro", "pix", "cartao", "fiado"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setForma(f)}
            className={`h-14 rounded-xl border font-bold text-sm transition-colors ${
              forma === f ? "bg-accent text-white border-accent" : "bg-surface-2 text-ink border-line"
            }`}
          >
            {f === "dinheiro" ? "Dinheiro" : f === "pix" ? "Pix" : f === "cartao" ? "Cartão" : "Fiado"}
          </button>
        ))}
      </div>

      {forma === "cartao" && (
        <div className="rounded-xl border border-line bg-surface-2 p-3 flex flex-col gap-3">
          {maquininhas.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-ink">Qual maquininha?</span>
              <div className="grid grid-cols-2 gap-2">
                {maquininhas.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMaquininhaId(m.id)}
                    className={`min-h-[40px] rounded-lg border text-sm font-semibold px-2 ${maquininhaId === m.id ? "bg-accent text-white border-accent" : "bg-surface text-ink border-line"}`}>
                    {m.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {(["debito", "credito"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setModalidade(m)}
                className={`h-10 rounded-lg border text-sm font-semibold ${modalidade === m ? "bg-accent-soft text-accent-ink border-accent" : "bg-surface text-ink border-line"}`}>
                {m === "debito" ? "Débito" : "Crédito"}
              </button>
            ))}
          </div>
          {modalidade === "credito" && (
            <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}
              className="w-full h-11 rounded-lg border border-line bg-surface px-3 text-ink appearance-none">
              {Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>{p}x</option>
              ))}
            </select>
          )}
        </div>
      )}

      {forma === "fiado" && !temCliente && (
        <p className="text-xs text-amber">Fiado precisa de cliente — edite o orçamento e escolha um cliente, ou use outra forma.</p>
      )}

      <button type="submit" disabled={!pode}
        className="h-14 rounded-xl bg-good text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60">
        Transformar em venda
      </button>
      <p className="text-xs text-muted">Isso registra a venda de verdade — precisa do caixa aberto e baixa o estoque.</p>
    </form>
  );
}
