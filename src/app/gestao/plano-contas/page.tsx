import { exigirGestao } from "@/lib/perfil";
import { listarPlanoContas } from "@/lib/dados/resultado";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { criarCategoriaAction, renomearCategoriaAction, arquivarCategoriaAction } from "./actions";

export default async function PlanoContasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const perfil = await exigirGestao();
  const { erro } = await searchParams;
  const cats = await listarPlanoContas();
  const ativas = cats.filter((c) => c.ativo);
  const arquivadas = cats.filter((c) => !c.ativo);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Plano de contas"
          descricao="As categorias de despesa que organizam o financeiro e o resultado geral."
          voltarHref="/gestao/financeiro"
        />

        {erro === "dup" && (
          <p className="mb-4 text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
            Já existe uma categoria com esse nome.
          </p>
        )}
        {erro === "nome" && (
          <p className="mb-4 text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
            Digite o nome da categoria.
          </p>
        )}

        {/* Nova categoria */}
        <form action={criarCategoriaAction} className="flex gap-2 mb-6">
          <input
            name="nome"
            placeholder="Nova categoria (ex.: Comissões)"
            className="flex-1 min-h-[48px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent"
          />
          <button type="submit" className="h-12 rounded-xl bg-accent text-white px-5 font-bold shadow-[var(--shadow)] active:scale-[0.99]">
            Adicionar
          </button>
        </form>

        <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
          {ativas.map((c) => (
            <form key={c.id} action={renomearCategoriaAction} className="flex items-center gap-2 px-3 py-2.5">
              <input type="hidden" name="id" value={c.id} />
              <input
                name="nome"
                defaultValue={c.nome}
                className="flex-1 min-h-[40px] rounded-lg border border-transparent bg-transparent px-2 text-ink outline-none focus:border-line focus:bg-surface-2"
              />
              <button type="submit" className="h-9 rounded-lg border border-line px-3 text-xs font-semibold text-ink hover:bg-surface-2">
                Salvar
              </button>
              <button
                type="submit"
                formAction={arquivarCategoriaAction}
                name="ativo"
                value="false"
                className="h-9 rounded-lg px-3 text-xs font-semibold text-muted hover:text-danger"
              >
                Arquivar
              </button>
            </form>
          ))}
          {ativas.length === 0 && (
            <div className="px-4 py-4 text-sm text-muted">Nenhuma categoria ativa.</div>
          )}
        </div>

        {arquivadas.length > 0 && (
          <>
            <h2 className="text-sm font-bold text-muted uppercase tracking-wide mt-6 mb-2">Arquivadas</h2>
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
              {arquivadas.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-muted line-through">{c.nome}</span>
                  <form action={arquivarCategoriaAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" name="ativo" value="true" className="h-9 rounded-lg border border-line px-3 text-xs font-semibold text-accent-ink hover:bg-surface-2">
                      Reativar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-muted mt-4">
          Arquivar não apaga o histórico: as despesas já lançadas continuam contando no
          resultado. A categoria só some da lista ao registrar uma nova despesa.
        </p>
      </main>
    </>
  );
}
