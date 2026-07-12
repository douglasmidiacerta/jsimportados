"use client";

import { useActionState, useState } from "react";
import { CampoValor } from "@/components/compras/CampoValor";
import { CampoData } from "./CampoData";
import { numeroParaCampoBR } from "@/lib/formato";
import type { EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

export function ConfigSaldo({
  saldoInicial,
  dataInicial,
  action,
}: {
  saldoInicial: number;
  dataInicial: string;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [saldo, setSaldo] = useState(numeroParaCampoBR(saldoInicial));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <CampoValor
        label="Saldo inicial"
        value={saldo}
        onChange={setSaldo}
        dica="Quanto você já tinha (dinheiro + banco) antes de começar a usar o sistema."
      />
      <input type="hidden" name="saldo" value={saldo} />

      <CampoData
        label="A partir de qual data"
        name="data"
        defaultValue={dataInicial}
        dica="O extrato começa a contar desse dia."
      />

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-14 rounded-xl bg-accent text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
      >
        {enviando ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
