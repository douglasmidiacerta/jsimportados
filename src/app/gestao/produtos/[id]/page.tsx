import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterProduto } from "@/lib/dados/produtos";
import { listarCategorias } from "@/lib/dados/categorias";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioProduto } from "@/components/cadastros/FormularioProduto";
import { AvisoErro, mensagemAtivo } from "@/components/cadastros/AvisoErro";
import { atualizarProduto, definirAtivoProduto } from "../actions";

export default async function EditarProdutoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const perfil = await exigirGestao();
  const [produto, categorias] = await Promise.all([
    obterProduto(id),
    listarCategorias(),
  ]);

  if (!produto) notFound();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Editar produto"
          voltarHref="/gestao/produtos"
        />

        <AvisoErro mensagem={mensagemAtivo(erro)} />

        <FormularioProduto
          action={atualizarProduto}
          categorias={categorias}
          produto={produto}
          voltarHref="/gestao/produtos"
        />

        <div className="mt-10 pt-6 border-t border-line">
          <form action={definirAtivoProduto}>
            <input type="hidden" name="id" value={produto.id} />
            <input
              type="hidden"
              name="ativo"
              value={produto.ativo ? "false" : "true"}
            />
            {produto.ativo ? (
              <>
                <p className="text-sm text-muted mb-2">
                  Arquivar esconde o produto das telas sem apagar o histórico.
                </p>
                <button
                  type="submit"
                  className="h-11 inline-flex items-center rounded-xl border border-[var(--danger)]/40 text-danger px-4 font-semibold hover:bg-[var(--danger)]/10 transition-colors"
                >
                  Arquivar produto
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted mb-2">
                  Este produto está arquivado (não aparece nas listas).
                </p>
                <button
                  type="submit"
                  className="h-11 inline-flex items-center rounded-xl border border-line text-ink px-4 font-semibold hover:bg-surface-2 transition-colors"
                >
                  Reativar produto
                </button>
              </>
            )}
          </form>
        </div>
      </main>
    </>
  );
}
