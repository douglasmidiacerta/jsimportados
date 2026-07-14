"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CampoDinheiro } from "./CampoDinheiro";
import { formatarBRL } from "@/lib/formato";
import type { EstadoFechar } from "@/lib/dados/tipos";

type Acao = (prev: EstadoFechar, fd: FormData) => Promise<EstadoFechar>;

export function FecharCaixa({
  action,
  onCancelar,
  esperado,
}: {
  action: Acao;
  onCancelar: () => void;
  /**
   * Quanto deveria ter na gaveta. Vira o ALVO do campo: a linha de baixo mostra
   * quanto falta, até zerar.
   *
   * ⚠️ Por decisão do dono isto vai também para o BALCÃO — o que ENCERRA a
   * contagem às cegas. Ver o comentário em CampoDinheiro.
   */
  esperado: number;
}) {
  const [estado, formAction, enviando] = useActionState<EstadoFechar, FormData>(
    action,
    {},
  );
  const [valor, setValor] = useState("");

  // ---------- REVELAÇÃO (após fechar) ----------
  if (estado.resumo) {
    const r = estado.resumo;
    const bateu = r.diferenca === 0;
    const sobra = r.diferenca > 0;
    const cor = bateu ? "text-good" : sobra ? "text-amber" : "text-danger";
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-ink">Caixa fechado ✅</h2>
        </div>

        <div className="rounded-2xl border border-line bg-surface-2 p-5 flex flex-col gap-2">
          <Linha rotulo="Deveria ter (esperado)" valor={formatarBRL(r.esperado)} />
          <Linha rotulo="Você contou" valor={formatarBRL(r.contado)} />
          <div className="border-t border-line my-1" />
          <div className="flex items-center justify-between">
            <span className="font-bold text-ink">
              {bateu ? "Bateu certinho!" : sobra ? "Sobrou" : "Faltou"}
            </span>
            <span className={`text-2xl font-extrabold tabular-nums ${cor}`}>
              {formatarBRL(Math.abs(r.diferenca))}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 text-sm flex flex-col gap-1.5">
          <MiniLinha rotulo="Vendas em dinheiro" valor={formatarBRL(r.vendas_dinheiro)} />
          <MiniLinha rotulo="Vendas no Pix" valor={formatarBRL(r.vendas_pix)} />
          {r.suprimentos > 0 && <MiniLinha rotulo="Dinheiro colocado" valor={formatarBRL(r.suprimentos)} />}
          {r.sangrias < 0 && <MiniLinha rotulo="Dinheiro tirado" valor={formatarBRL(r.sangrias)} />}
          {r.cartao > 0 && <MiniLinha rotulo="Vendas no cartão (a receber)" valor={formatarBRL(r.cartao)} />}
          {r.fiado > 0 && <MiniLinha rotulo="Vendas no fiado (a receber)" valor={formatarBRL(r.fiado)} />}
        </div>

        <Link
          href="/balcao"
          className="h-14 inline-flex items-center justify-center rounded-2xl bg-accent text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99]"
        >
          Concluir
        </Link>
      </div>
    );
  }

  // ---------- CONTAGEM ÀS CEGAS ----------
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-ink">Fechar o caixa</h2>
        <p className="text-muted mt-1">
          Conte todo o dinheiro da gaveta e digite o total.
        </p>
      </div>

      <CampoDinheiro
        name="valor"
        value={valor}
        onChange={setValor}
        label="Dinheiro contado na gaveta"
        autoFocus
        alvo={esperado}
        alvoRotulo="Deveria ter na gaveta"
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Observação (opcional)</span>
        <input
          name="observacoes"
          type="text"
          placeholder="Alguma anotação do dia"
          className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink placeholder:text-muted outline-none focus:border-accent"
        />
      </label>

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2 text-center">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="h-14 sm:flex-1 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="h-14 sm:flex-1 rounded-xl bg-good text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
        >
          {enviando ? "Fechando…" : "Fechar caixa"}
        </button>
      </div>
    </form>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{rotulo}</span>
      <span className="text-ink font-semibold tabular-nums">{valor}</span>
    </div>
  );
}
function MiniLinha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{rotulo}</span>
      <span className="text-ink tabular-nums">{valor}</span>
    </div>
  );
}
