"use client";

import { useActionState, useState } from "react";
import { CampoValor } from "@/components/compras/CampoValor";
import { CampoData, FORMAS_FINANCEIRAS } from "./CampoData";
import { parseMoedaBR, numeroParaCampoBR, formatarBRL } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/** Registrar pagamento de uma conta a pagar (parcial ou total). */
export function PagarConta({
  contaId,
  saldo,
  vencimento,
  action,
}: {
  contaId: string;
  saldo: number;
  vencimento: string;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [valor, setValor] = useState(numeroParaCampoBR(saldo));
  const v = parseMoedaBR(valor);
  const invalido = v <= 0 || v > saldo + 0.005;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="conta_id" value={contaId} />

      <CampoValor
        label="Quanto está pagando?"
        value={valor}
        onChange={setValor}
        dica={`Saldo devedor: ${formatarBRL(saldo)}. Pode pagar em partes.`}
      />
      <input type="hidden" name="valor" value={valor} />

      <CampoData label="Data do pagamento" name="data" defaultValue={vencimento} />

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
        {enviando ? "Registrando…" : "Registrar pagamento"}
      </button>
    </form>
  );
}
