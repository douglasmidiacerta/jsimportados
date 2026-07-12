import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterFornecedor } from "@/lib/dados/fornecedores";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioFornecedor } from "@/components/cadastros/FormularioFornecedor";
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
  const fornecedor = await obterFornecedor(id);
  if (!fornecedor) notFound();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Editar fornecedor"
          voltarHref="/gestao/fornecedores"
        />
        <AvisoErro mensagem={mensagemAtivo(erro)} />
        <FormularioFornecedor
          action={atualizarFornecedor}
          fornecedor={fornecedor}
          voltarHref="/gestao/fornecedores"
        />

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
