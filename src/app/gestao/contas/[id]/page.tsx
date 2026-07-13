import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import {
  obterConta,
  listarLancamentos,
  listarContasComSaldo,
  obterContaPadraoId,
} from "@/lib/dados/contasFinanceiras";
import { listarMaquininhas } from "@/lib/dados/maquininhas";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { AvisoErro } from "@/components/cadastros/AvisoErro";
import { FormularioConta } from "@/components/financeiro/FormularioConta";
import { atualizarConta, ajustarContaAction } from "../actions";
import type { OrigemLancamento } from "@/lib/dados/tipos";

const ROTULO_ORIGEM: Record<OrigemLancamento, string> = {
  saldo_inicial: "Saldo inicial",
  venda_pix: "Venda no Pix",
  recebimento: "Recebimento",
  pagamento: "Pagamento",
  transferencia: "Transferência",
  ajuste: "Ajuste manual",
};

const CAMPO =
  "w-full min-h-[48px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent appearance-none";

export default async function ContaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const perfil = await exigirGestao();

  const conta = await obterConta(id);
  if (!conta) notFound();

  const [maquininhas, contas, padraoId, lancamentos] = await Promise.all([
    listarMaquininhas(),
    listarContasComSaldo(),
    obterContaPadraoId(),
    listarLancamentos(id),
  ]);
  const saldo = contas.find((c) => c.id === id)?.saldo ?? conta.saldo_inicial;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={conta.nome}
          descricao={`Saldo atual ${formatarBRL(saldo)}`}
          voltarHref="/gestao/contas"
        />
        <AvisoErro mensagem={erro} />

        {/* Extrato da conta */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Extrato</h2>
          {lancamentos.length === 0 ? (
            <p className="text-muted text-sm">Nenhum lançamento nesta conta ainda.</p>
          ) : (
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {lancamentos.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block text-ink font-medium">
                      {ROTULO_ORIGEM[l.origem]}
                      {l.conciliado && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-good">✓ conciliado</span>
                      )}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {formatarData(l.data)}
                      {l.descricao ? ` · ${l.descricao}` : ""}
                    </span>
                  </span>
                  <span className={`tabular-nums font-semibold shrink-0 ${l.valor < 0 ? "text-danger" : "text-good"}`}>
                    {l.valor < 0 ? "−" : "+"}
                    {formatarBRL(Math.abs(l.valor))}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-surface-2">
                <span className="font-bold text-ink">Saldo atual</span>
                <span className={`tabular-nums font-extrabold ${saldo < 0 ? "text-danger" : "text-ink"}`}>
                  {formatarBRL(saldo)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Ajuste manual */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Lançar ajuste</h2>
          <p className="text-sm text-muted mb-3">
            Corrige o saldo (tarifa bancária, acerto). Fica no extrato e na auditoria.
          </p>
          <form action={ajustarContaAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <input type="hidden" name="conta_id" value={conta.id} />
            <label className="flex flex-col gap-1.5 sm:col-span-1">
              <span className="text-sm font-semibold text-ink">Tipo</span>
              <select name="direcao" className={CAMPO}>
                <option value="saida">Tirar (−)</option>
                <option value="entrada">Colocar (+)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-1">
              <span className="text-sm font-semibold text-ink">Valor</span>
              <input name="valor" inputMode="decimal" placeholder="0,00" className={CAMPO} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-semibold text-ink">Motivo *</span>
              <input name="motivo" placeholder="Ex.: tarifa mensal do banco" className={CAMPO} />
            </label>
            <button
              type="submit"
              className="h-12 sm:col-span-4 rounded-xl bg-accent text-white font-bold shadow-[var(--shadow)] active:scale-[0.99]"
            >
              Lançar ajuste
            </button>
          </form>
        </section>

        {/* Editar dados da conta */}
        <section>
          <h2 className="text-lg font-bold text-ink tracking-tight mb-3">Dados da conta</h2>
          <FormularioConta
            action={atualizarConta}
            conta={conta}
            maquininhas={maquininhas}
            ehPadrao={padraoId === conta.id}
          />
        </section>
      </main>
    </>
  );
}
