"use client";

import { useState } from "react";
import { MovimentoCaixa } from "./MovimentoCaixa";
import { FecharCaixa } from "./FecharCaixa";
import { formatarBRL } from "@/lib/formato";
import type { CaixaPainel, EstadoForm, EstadoFechar } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
type AcaoFechar = (prev: EstadoFechar, fd: FormData) => Promise<EstadoFechar>;

function horaAbertura(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  } catch {
    return "";
  }
}

export function PainelCaixa({
  caixa,
  sangriaAction,
  suprimentoAction,
  fecharAction,
  esperado,
  mostrarCard,
}: {
  caixa: CaixaPainel;
  sangriaAction: Acao;
  suprimentoAction: Acao;
  fecharAction: AcaoFechar;
  /**
   * Quanto DEVERIA ter na gaveta agora.
   *
   * ⚠️ Passou a ir também para o BALCÃO por decisão do dono (14/07/2026): ele
   * quer ver a diferença caindo até zero enquanto digita. Isso ENCERRA a
   * contagem às cegas — ver o comentário em CampoDinheiro. As travas do banco
   * (abrir/fechar com diferença exige justificativa) continuam valendo.
   */
  esperado: number;
  /** Mostra o card grande "deveria ter na gaveta" (só a gestão usa). */
  mostrarCard?: boolean;
}) {
  const [view, setView] = useState<"painel" | "sangria" | "suprimento" | "fechar">(
    "painel",
  );

  if (view === "sangria")
    return (
      <MovimentoCaixa
        tipo="sangria"
        action={sangriaAction}
        onCancelar={() => setView("painel")}
      />
    );
  if (view === "suprimento")
    return (
      <MovimentoCaixa
        tipo="suprimento"
        action={suprimentoAction}
        onCancelar={() => setView("painel")}
      />
    );
  if (view === "fechar")
    return (
      <FecharCaixa
        action={fecharAction}
        esperado={esperado}
        onCancelar={() => setView("painel")}
      />
    );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-good/30 bg-[var(--good)]/10 p-4 text-center">
        <div className="text-good font-bold">🟢 Caixa aberto</div>
        <div className="text-sm text-muted mt-0.5">
          desde as {horaAbertura(caixa.aberto_em)} · abertura {formatarBRL(caixa.valor_abertura)}
        </div>
      </div>

      {mostrarCard && (
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/50 p-4 text-center">
          <div className="text-xs text-accent-ink font-semibold uppercase tracking-wide">
            Deveria ter na gaveta agora
          </div>
          <div className="text-3xl font-extrabold text-accent-ink tabular-nums mt-1">
            {formatarBRL(esperado)}
          </div>
          <div className="text-[11px] text-muted mt-1">
            abertura + vendas em dinheiro + colocado − tirado
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card titulo="Vendas em dinheiro" valor={formatarBRL(caixa.vendas_dinheiro)} destaque />
        <Card
          titulo="Vendas no Pix"
          valor={formatarBRL(caixa.vendas_pix)}
          nota="cai no banco"
        />
        {caixa.suprimentos > 0 && (
          <Card titulo="Dinheiro colocado" valor={formatarBRL(caixa.suprimentos)} />
        )}
        {caixa.sangrias < 0 && (
          <Card titulo="Dinheiro tirado" valor={formatarBRL(caixa.sangrias)} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setView("suprimento")}
          className="h-16 rounded-2xl border border-line bg-surface text-ink font-bold flex flex-col items-center justify-center gap-0.5 hover:bg-surface-2 active:scale-[0.99]"
        >
          <span className="text-2xl leading-none text-good">＋</span>
          Colocar dinheiro
        </button>
        <button
          type="button"
          onClick={() => setView("sangria")}
          className="h-16 rounded-2xl border border-line bg-surface text-ink font-bold flex flex-col items-center justify-center gap-0.5 hover:bg-surface-2 active:scale-[0.99]"
        >
          <span className="text-2xl leading-none text-danger">−</span>
          Tirar dinheiro
        </button>
      </div>

      <button
        type="button"
        onClick={() => setView("fechar")}
        className="h-16 rounded-2xl bg-accent text-white text-xl font-bold shadow-[var(--shadow)] active:scale-[0.99]"
      >
        Fechar o caixa
      </button>
    </div>
  );
}

function Card({
  titulo,
  valor,
  nota,
  destaque,
}: {
  titulo: string;
  valor: string;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-xs text-muted">{titulo}</div>
      <div className={`tabular-nums font-extrabold mt-0.5 ${destaque ? "text-xl text-ink" : "text-lg text-ink"}`}>
        {valor}
      </div>
      {nota && <div className="text-[11px] text-muted mt-0.5">{nota}</div>}
    </div>
  );
}
