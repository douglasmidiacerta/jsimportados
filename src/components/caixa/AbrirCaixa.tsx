"use client";

import { useActionState, useState } from "react";
import { CampoDinheiro } from "./CampoDinheiro";
import { formatarBRL } from "@/lib/formato";
import type { EstadoAbrir } from "@/lib/dados/tipos";

type Acao = (prev: EstadoAbrir, fd: FormData) => Promise<EstadoAbrir>;

export function AbrirCaixa({
  action,
  fechamentoAnterior,
}: {
  action: Acao;
  /**
   * Quanto sobrou na gaveta no último fechamento (null na 1ª vez). Vira o ALVO
   * do campo: a linha de baixo mostra quanto falta, até zerar.
   *
   * ⚠️ Por decisão do dono isto vai também para o BALCÃO — o que encerra a
   * contagem às cegas na abertura. Ver o comentário em CampoDinheiro.
   */
  fechamentoAnterior: number | null;
}) {
  const [estado, formAction, enviando] = useActionState<EstadoAbrir, FormData>(
    action,
    {},
  );
  const [valor, setValor] = useState("");
  const [justificativa, setJustificativa] = useState("");

  const conf = estado.conferencia;

  // ---------- PASSO 2: não bateu com o fechamento anterior ----------
  if (conf) {
    const faltou = conf.diferenca < 0;
    const modulo = Math.abs(conf.diferenca);

    return (
      <form action={formAction} className="flex flex-col gap-5">
        {/* reenvia a MESMA contagem — ela não digita de novo */}
        <input type="hidden" name="valor" value={valor} />

        <div
          className={`rounded-2xl border p-5 text-center ${
            faltou
              ? "border-[color:var(--danger)]/40 bg-[var(--danger)]/10"
              : "border-[color:var(--amber)]/40 bg-[var(--amber-soft)]"
          }`}
        >
          <div className={`text-3xl mb-1`}>{faltou ? "⚠️" : "🤔"}</div>
          <h2 className={`text-lg font-extrabold ${faltou ? "text-danger" : "text-amber"}`}>
            {faltou ? "Está faltando dinheiro na gaveta" : "Tem dinheiro a mais na gaveta"}
          </h2>
          <p className="text-sm text-muted mt-1">
            O que você contou não bate com o que sobrou no último fechamento.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface divide-y divide-[color:var(--line)]">
          <Linha rotulo="Sobrou no último fechamento" valor={formatarBRL(conf.fechamento_anterior)} />
          <Linha rotulo="Você contou agora" valor={formatarBRL(conf.contado)} />
          <Linha
            rotulo={faltou ? "Está faltando" : "Está sobrando"}
            valor={formatarBRL(modulo)}
            destaque={faltou ? "danger" : "amber"}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">O que aconteceu?</span>
          <textarea
            name="observacoes"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={3}
            required
            autoFocus
            placeholder={
              faltou
                ? "Ex.: tirei R$ 50 pra pagar o motoboy e esqueci de anotar"
                : "Ex.: coloquei R$ 30 de troco meu"
            }
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-base text-ink outline-none focus:border-accent resize-y"
          />
          <span className="text-xs text-muted">
            Isso fica registrado. É assim que a gente enxerga o que mudou de um dia pro outro.
          </span>
        </label>

        {estado.erro && (
          <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2 text-center">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || justificativa.trim().length === 0}
          className="h-16 rounded-2xl bg-accent text-white text-xl font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
        >
          {enviando ? "Abrindo…" : "Confirmar e abrir o caixa"}
        </button>

        <button
          type="button"
          onClick={() => {
            setValor("");
            setJustificativa("");
            // volta ao passo 1 recarregando a tela (estado do useActionState reseta)
            window.location.reload();
          }}
          className="text-sm font-semibold text-muted hover:text-ink underline decoration-dotted underline-offset-2"
        >
          Contar de novo
        </button>
      </form>
    );
  }

  // ---------- PASSO 1: contagem às cegas ----------
  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-soft text-accent-ink grid place-items-center mb-3">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
        </div>
        <h2 className="text-xl font-extrabold text-ink">Abrir o caixa</h2>
        <p className="text-muted mt-1">
          Conte o dinheiro da gaveta e diga quanto tem, para começar o dia.
        </p>
      </div>

      <CampoDinheiro
        name="valor"
        value={valor}
        onChange={setValor}
        label="Dinheiro na gaveta"
        autoFocus
        alvo={fechamentoAnterior}
        alvoRotulo="Sobrou no último fechamento"
      />

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2 text-center">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-16 rounded-2xl bg-accent text-white text-xl font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
      >
        {enviando ? "Conferindo…" : "Abrir o caixa"}
      </button>
    </form>
  );
}

function Linha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: "danger" | "amber";
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className={`text-sm ${destaque ? "font-bold text-ink" : "text-muted"}`}>
        {rotulo}
      </span>
      <span
        className={`tabular-nums font-extrabold ${
          destaque === "danger"
            ? "text-danger text-lg"
            : destaque === "amber"
              ? "text-amber text-lg"
              : "text-ink"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}
