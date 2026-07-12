import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterCategoria } from "@/lib/dados/categorias";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioCategoria } from "@/components/cadastros/FormularioCategoria";
import { AvisoErro, mensagemAtivo } from "@/components/cadastros/AvisoErro";
import { atualizarCategoria, definirAtivoCategoria } from "../actions";

export default async function EditarCategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const perfil = await exigirGestao();
  const categoria = await obterCategoria(id);
  if (!categoria) notFound();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Editar categoria"
          voltarHref="/gestao/categorias"
        />
        <AvisoErro mensagem={mensagemAtivo(erro)} />
        <FormularioCategoria
          action={atualizarCategoria}
          categoria={categoria}
          voltarHref="/gestao/categorias"
        />

        <div className="mt-10 pt-6 border-t border-line">
          <form action={definirAtivoCategoria}>
            <input type="hidden" name="id" value={categoria.id} />
            <input
              type="hidden"
              name="ativo"
              value={categoria.ativo ? "false" : "true"}
            />
            <p className="text-sm text-muted mb-2">
              {categoria.ativo
                ? "Arquivar esconde a categoria. Os produtos dela continuam existindo."
                : "Esta categoria está arquivada."}
            </p>
            <button
              type="submit"
              className={
                categoria.ativo
                  ? "h-11 inline-flex items-center rounded-xl border border-[var(--danger)]/40 text-danger px-4 font-semibold hover:bg-[var(--danger)]/10 transition-colors"
                  : "h-11 inline-flex items-center rounded-xl border border-line text-ink px-4 font-semibold hover:bg-surface-2 transition-colors"
              }
            >
              {categoria.ativo ? "Arquivar categoria" : "Reativar categoria"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
