"use client";

import { useActionState, useState } from "react";
import { CampoValor } from "@/components/compras/CampoValor";
import { CampoData, FORMAS_FINANCEIRAS } from "./CampoData";
import { parseMoedaBR, numeroParaCampoBR, formatarBRL } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/**
 * Dar baixa numa conta a receber. Cartão liquida a parcela INTEIRA (valor
 * travado no líquido); fiado permite recebimento PARCIAL.
 */
export function BaixarReceber({
  contaId,
  tipo,
  saldo,
  vencimento,
  action,
}: {
  contaId: string;
  tipo: "cartao" | "fiado";
  saldo: number;
  vencimento: string;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const ehCartao = tipo === "cartao";
  const [valor, setValor] = useState(numeroParaCampoBR(saldo));
  const v = ehCartao ? saldo : parseMoedaBR(valor);
  const invalido = v <= 0 || v > saldo + 0.005;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="conta_id" value={contaId} />

      {ehCartao ? (
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="text-xs text-muted">Valor a receber (líquido)</div>
          <div className="text-2xl font-extrabold text-ink tabular-nums">
            {formatarBRL(saldo)}
          </div>
          <div className="text-xs text-muted mt-1">
            A parcela do cartão é recebida por inteiro.
          </div>
          <input type="hidden" name="valor" value={numeroParaCampoBR(saldo)} />
        </div>
      ) : (
        <>
          <CampoValor
            label="Quanto recebeu?"
            value={valor}
            onChange={setValor}
            dica={`Saldo a receber: ${formatarBRL(saldo)}. Fiado pode ser recebido em partes.`}
          />
          <input type="hidden" name="valor" value={valor} />
        </>
      )}

      <CampoData label="Data do recebimento" name="data" defaultValue={vencimento} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Forma (opcional)</span>
        <select
          name="forma"
          defaultValue=""
          className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent focus:bg-surface appearance-none"
        >
          <option value="">—</option>
          {FORMAS_FINANCEIRAS.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.rotulo}
            </option>
          ))}
        </select>
      </label>

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || invalido}
        className="h-14 rounded-xl bg-good text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
      >
        {enviando ? "Confirmando…" : "Confirmar recebimento"}
      </button>
    </form>
  );
}
