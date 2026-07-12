"use client";

import { useActionState, useState } from "react";
import { CampoValor } from "@/components/compras/CampoValor";
import { CampoData, FORMAS_FINANCEIRAS } from "./CampoData";
import { CampoFormulario } from "@/components/cadastros/CampoFormulario";
import { parseMoedaBR } from "@/lib/formato";
import type { EstadoForm, DespesaCategoria } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
type Opcao = { valor: string; rotulo: string };

export function FormularioDespesa({
  categorias,
  fornecedores,
  hoje,
  action,
}: {
  categorias: DespesaCategoria[];
  fornecedores: Opcao[];
  hoje: string;
  action: Acao;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const [valor, setValor] = useState("");
  const [pagarAgora, setPagarAgora] = useState(false);
  const v = parseMoedaBR(valor);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <CampoFormulario
        label="Descrição"
        name="descricao"
        required
        placeholder="Ex.: Aluguel de agosto"
      />

      <CampoFormulario
        label="Categoria"
        name="categoria_id"
        as="select"
        opcaoVazia="Sem categoria"
        opcoes={categorias.map((c) => ({ valor: c.id, rotulo: c.nome }))}
      />

      <CampoFormulario
        label="Fornecedor (opcional)"
        name="fornecedor_id"
        as="select"
        opcaoVazia="—"
        opcoes={fornecedores}
      />

      <CampoValor label="Valor" value={valor} onChange={setValor} />
      <input type="hidden" name="valor" value={valor} />

      <div className="grid grid-cols-2 gap-3">
        <CampoData label="Vencimento" name="vencimento" defaultValue={hoje} />
        <CampoData
          label="Competência"
          name="competencia"
          defaultValue={hoje}
          dica="Mês a que a despesa pertence no DRE"
        />
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          name="pagar_agora"
          checked={pagarAgora}
          onChange={(e) => setPagarAgora(e.target.checked)}
          className="size-5 accent-[var(--accent)]"
        />
        <span className="text-sm font-semibold text-ink">Já paguei</span>
      </label>

      {pagarAgora && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">Forma do pagamento</span>
          <select
            name="forma"
            defaultValue="dinheiro"
            className="w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent focus:bg-surface appearance-none"
          >
            {FORMAS_FINANCEIRAS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </select>
        </label>
      )}

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || v <= 0}
        className="h-14 rounded-xl bg-accent text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99] disabled:opacity-60"
      >
        {enviando ? "Salvando…" : "Salvar despesa"}
      </button>
    </form>
  );
}
