import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterProduto } from "@/lib/dados/produtos";
import { listarCategorias } from "@/lib/dados/categorias";
import { listarListasPreco, precosDoProduto } from "@/lib/dados/listasPreco";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioProduto } from "@/components/cadastros/FormularioProduto";
import { CampoPrecoLista } from "@/components/precos/CampoPrecoLista";
import { AvisoErro, mensagemAtivo } from "@/components/cadastros/AvisoErro";
import { atualizarProduto, definirAtivoProduto } from "../actions";
import { definirPrecoAction } from "../../listas-preco/actions";

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
  const [produto, categorias, listas, overrides] = await Promise.all([
    obterProduto(id),
    listarCategorias(),
    listarListasPreco(),
    precosDoProduto(id),
  ]);

  if (!produto) notFound();

  const outrasListas = listas.filter((l) => !l.is_default);

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

        {outrasListas.length > 0 && (
          <div className="mt-8 pt-6 border-t border-line">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wide mb-1">Preços por lista</h2>
            <p className="text-xs text-muted mb-3">
              O preço de venda acima é o de <b>Varejo</b>. Vazio = a lista usa o preço de varejo.
            </p>
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {outrasListas.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-ink font-medium">{l.nome}</span>
                  <CampoPrecoLista
                    produtoId={produto.id}
                    listaId={l.id}
                    override={l.id in overrides ? overrides[l.id] : null}
                    varejo={produto.preco_venda}
                    revalidar={`/gestao/produtos/${produto.id}`}
                    action={definirPrecoAction}
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-2">Varejo: {formatarBRL(produto.preco_venda)}</p>
          </div>
        )}

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
