"use client";

import { formatarBRL, parseMoedaBR } from "@/lib/formato";

/** Input de dinheiro GIGANTE (para a operadora leiga). Controlado; submete por `name`. */
export function CampoDinheiro({
  name,
  value,
  onChange,
  label,
  placeholder = "0,00",
  autoFocus,
  alvo,
  alvoRotulo,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /**
   * Quanto DEVERIA ter na gaveta. Quando informado, a linha de baixo deixa de
   * ecoar o que foi digitado ("= R$ 551,00" — que só repetia a informação) e
   * passa a mostrar quanto FALTA, indo até zero quando a conta fecha.
   *
   * ⚠️ Decisão do dono (14/07/2026): mostrar isso também no BALCÃO, ciente de
   * que ISSO ENCERRA A CONTAGEM ÀS CEGAS — a operadora vê a diferença enquanto
   * digita e pode ajustar o número até zerar. Escolha consciente dele (loja
   * pequena, de família). As travas do banco continuam de pé: abrir ou fechar
   * com diferença ainda exige justificativa; só ficou fácil de evitá-la.
   */
  alvo?: number | null;
  /** Rótulo do alvo, mostrado enquanto nada foi digitado. Ex.: "Deveria ter". */
  alvoRotulo?: string;
}) {
  const valor = parseMoedaBR(value);
  const temAlvo = alvo !== undefined && alvo !== null;
  const restante = temAlvo ? Number((alvo - valor).toFixed(2)) : 0;
  const digitou = value.trim().length > 0 && valor > 0;

  return (
    <label className="flex flex-col gap-2">
      {label && (
        <span className="text-base font-semibold text-ink text-center">{label}</span>
      )}
      <span className="relative flex items-center justify-center">
        <span className="absolute left-4 text-2xl text-muted pointer-events-none">R$</span>
        <input
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full h-20 rounded-2xl border border-line bg-surface-2 pl-16 pr-4 text-center text-4xl font-extrabold text-ink placeholder:text-muted/40 outline-none focus:border-accent focus:bg-surface transition-colors tabular-nums"
        />
      </span>

      {temAlvo ? (
        <span className="text-center text-base font-bold tabular-nums">
          {!digitou ? (
            <span className="text-muted font-normal text-sm">
              {alvoRotulo ?? "Deveria ter"}{" "}
              <b className="text-ink">{formatarBRL(alvo)}</b>
            </span>
          ) : restante > 0 ? (
            <span className="text-danger">Faltam {formatarBRL(restante)}</span>
          ) : restante < 0 ? (
            <span className="text-amber">Sobrando {formatarBRL(Math.abs(restante))}</span>
          ) : (
            <span className="text-good">✓ Bateu certinho</span>
          )}
        </span>
      ) : (
        valor > 0 && (
          <span className="text-sm text-muted text-center">= {formatarBRL(valor)}</span>
        )
      )}
    </label>
  );
}
