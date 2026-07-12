import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterFornecedor, parcelasDoFornecedor } from "@/lib/dados/fornecedores";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioFornecedor } from "@/components/cadastros/FormularioFornecedor";
import { FinanceiroFornecedor } from "@/components/cadastros/FinanceiroFornecedor";
import { AvisoErro, mensagemAtivo } from "@/components/cadastros/AvisoErro";
import { atualizarFornecedor, definirAtivoFornecedor } from "../actions";

export default async function EditarFornecedorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const perfil = await exigirGestao();
  const [fornecedor, parcelas] = await Promise.all([
    obterFornecedor(id),
    parcelasDoFornecedor(id),
  ]);
  if (!fornecedor) notFound();

  const temParcelas =
    parcelas.vencidas.length + parcelas.aVencer.length + parcelas.pagas.length > 0;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Editar fornecedor"
          voltarHref="/gestao/fornecedores"
        />
        <AvisoErro
          mensagem={
            erro === "filhos"
              ? "O fornecedor foi salvo, mas os endereços/contatos/bancos/documentos não. Ajuste e salve de novo."
              : mensagemAtivo(erro)
          }
        />
        <FormularioFornecedor
          action={atualizarFornecedor}
          fornecedor={fornecedor}
          voltarHref="/gestao/fornecedores"
        />

        <section className="mt-8 pt-6 border-t border-line">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-1">
            Financeiro por fornecedor
          </h2>
          <p className="text-xs text-muted mb-3">
            Parcelas deste fornecedor (das compras e contas a pagar).
          </p>
          {temParcelas ? (
            <FinanceiroFornecedor dados={parcelas} />
          ) : (
            <p className="text-sm text-muted italic">
              Nenhuma parcela para este fornecedor ainda.
            </p>
          )}
        </section>

        <div className="mt-10 pt-6 border-t border-line">
          <form action={definirAtivoFornecedor}>
            <input type="hidden" name="id" value={fornecedor.id} />
            <input
              type="hidden"
              name="ativo"
              value={fornecedor.ativo ? "false" : "true"}
            />
            <p className="text-sm text-muted mb-2">
              {fornecedor.ativo
                ? "Arquivar esconde o fornecedor das listas."
                : "Este fornecedor está arquivado."}
            </p>
            <button
              type="submit"
              className={
                fornecedor.ativo
                  ? "h-11 inline-flex items-center rounded-xl border border-[var(--danger)]/40 text-danger px-4 font-semibold hover:bg-[var(--danger)]/10 transition-colors"
                  : "h-11 inline-flex items-center rounded-xl border border-line text-ink px-4 font-semibold hover:bg-surface-2 transition-colors"
              }
            >
              {fornecedor.ativo ? "Arquivar fornecedor" : "Reativar fornecedor"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
