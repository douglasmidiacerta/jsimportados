"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CampoValor } from "@/components/compras/CampoValor";
import { BotaoSalvar } from "@/components/cadastros/BotaoSalvar";
import { formatarBRL } from "@/lib/formato";
import type { ContaSaldo, EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

const CAMPO =
  "w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent appearance-none";

export function FormularioTransferencia({
  contas,
  action,
}: {
  contas: ContaSaldo[];
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [valor, setValor] = useState("");

  const saldoDe = (id: string) => contas.find((c) => c.id === id)?.saldo;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">De qual conta sai?</span>
        <select name="origem_id" value={origem} onChange={(e) => setOrigem(e.target.value)} className={CAMPO}>
          <option value="">Escolha…</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id} disabled={c.id === destino}>
              {c.nome} — {formatarBRL(c.saldo)}
            </option>
          ))}
        </select>
        {origem && (
          <span className="text-xs text-muted">Saldo atual: {formatarBRL(saldoDe(origem) ?? 0)}</span>
        )}
      </label>

      <div className="grid place-items-center text-muted">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Para qual conta vai?</span>
        <select name="destino_id" value={destino} onChange={(e) => setDestino(e.target.value)} className={CAMPO}>
          <option value="">Escolha…</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id} disabled={c.id === origem}>
              {c.nome} — {formatarBRL(c.saldo)}
            </option>
          ))}
        </select>
      </label>

      <CampoValor label="Valor" value={valor} onChange={setValor} simbolo="R$" placeholder="0,00" />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Descrição (opcional)</span>
        <input name="descricao" placeholder="Ex.: depósito do caixa, repasse da Stone" className={CAMPO} />
      </label>

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link
          href="/gestao/contas"
          className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Cancelar
        </Link>
        <BotaoSalvar enviando={enviando}>Transferir</BotaoSalvar>
      </div>
    </form>
  );
}
