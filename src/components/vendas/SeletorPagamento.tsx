"use client";

import { CampoValor } from "@/components/compras/CampoValor";
import { formatarBRL } from "@/lib/formato";
import { parcelasBrutas } from "@/lib/vendas/calculo";
import {
  FORMAS_PAGAMENTO,
  MAX_PARCELAS,
  type FormaPagamento,
} from "@/lib/dados/tipos";

const ICON: Record<FormaPagamento, React.ReactNode> = {
  dinheiro: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
  ),
  pix: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 4 4-4 4-4-4Z" /><path d="m12 14 4 4-4 4-4-4Z" /><path d="m2 12 4-4 4 4-4 4Z" /><path d="m14 12 4-4 4 4-4 4Z" /></svg>
  ),
  cartao: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
  ),
  fiado: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  ),
};

export function SeletorPagamento({
  forma,
  onForma,
  modalidade,
  onModalidade,
  parcelas,
  onParcelas,
  juros,
  onJuros,
  total,
}: {
  forma: FormaPagamento | null;
  onForma: (f: FormaPagamento) => void;
  modalidade: "debito" | "credito";
  onModalidade: (m: "debito" | "credito") => void;
  parcelas: number;
  onParcelas: (p: number) => void;
  juros: string;
  onJuros: (v: string) => void;
  total: number;
}) {
  const nParcelas = modalidade === "debito" ? 1 : parcelas;
  const valorParcela = parcelasBrutas(total, nParcelas)[0] ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <span className="text-sm font-semibold text-ink">Como o cliente pagou?</span>
      <div className="grid grid-cols-2 gap-3">
        {FORMAS_PAGAMENTO.map((f) => {
          const sel = forma === f.valor;
          return (
            <button
              key={f.valor}
              type="button"
              onClick={() => onForma(f.valor)}
              className={`h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 font-bold transition-colors ${
                sel
                  ? "bg-accent text-white border-accent"
                  : "bg-surface text-ink border-line hover:bg-surface-2"
              }`}
            >
              {ICON[f.valor]}
              <span className="text-sm">{f.rotulo}</span>
            </button>
          );
        })}
      </div>

      {forma === "cartao" && (
        <div className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {(["debito", "credito"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModalidade(m)}
                className={`h-11 rounded-xl border font-semibold text-sm transition-colors ${
                  modalidade === m
                    ? "bg-accent-soft text-accent-ink border-accent"
                    : "bg-surface-2 text-ink border-line"
                }`}
              >
                {m === "debito" ? "Débito" : "Crédito"}
              </button>
            ))}
          </div>

          {modalidade === "credito" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Parcelas</span>
              <select
                value={parcelas}
                onChange={(e) => onParcelas(Number(e.target.value))}
                className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent appearance-none"
              >
                {Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    {p}x
                  </option>
                ))}
              </select>
            </label>
          )}

          <p className="text-sm text-muted">
            {nParcelas}× de{" "}
            <b className="text-ink">{formatarBRL(valorParcela)}</b>
            {" "}(total {formatarBRL(total)})
          </p>
        </div>
      )}

      {forma === "fiado" && (
        <div className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-3">
          <p className="text-sm text-muted">
            Escolha o cliente acima. O valor vira “a receber”.
          </p>
          <CampoValor
            label="Juros / acréscimo (opcional)"
            value={juros}
            onChange={onJuros}
            simbolo="R$"
            placeholder="0,00"
            dica="Some um valor se cobrar juros pelo prazo."
          />
        </div>
      )}
    </div>
  );
}
