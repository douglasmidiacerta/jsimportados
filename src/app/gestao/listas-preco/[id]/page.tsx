import { notFound, redirect } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { listarListasPreco, matrizPrecosDaLista } from "@/lib/dados/listasPreco";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { CampoPrecoLista } from "@/components/precos/CampoPrecoLista";
import { FormularioLista } from "@/components/precos/FormularioLista";
import { definirPrecoAction, renomearListaAction } from "../actions";

export default async function MatrizListaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ busca?: string }>;
}) {
  const { id } = await params;
  const { busca } = await searchParams;
  const perfil = await exigirGestao();

  const listas = await listarListasPreco(true);
  const lista = listas.find((l) => l.id === id);
  if (!lista) notFound();
  if (lista.is_default) redirect("/gestao/listas-preco");

  const rows = await matrizPrecosDaLista(id, busca);
  const revalidar = `/gestao/listas-preco/${id}`;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={`Preços · ${lista.nome}`}
          descricao="Vazio = usa o preço de varejo do produto. Salva ao sair do campo."
          voltarHref="/gestao/listas-preco"
        />

        <details className="mb-4 rounded-2xl border border-line bg-surface-2 p-4">
          <summary className="text-sm font-semibold text-ink cursor-pointer">Renomear lista</summary>
          <div className="mt-3">
            <FormularioLista action={renomearListaAction} lista={lista} voltarHref={revalidar} />
          </div>
        </details>

        <form method="get" className="mb-4">
          <input
            name="busca"
            defaultValue={busca ?? ""}
            placeholder="Buscar produto…"
            className="w-full min-h-[48px] rounded-xl border border-line bg-surface-2 px-4 text-ink placeholder:text-muted outline-none focus:border-accent"
          />
        </form>

        {rows.length === 0 ? (
          <p className="text-muted text-center py-10">Nenhum produto.</p>
        ) : (
          <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
            {rows.map((r) => (
              <div key={r.produto_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-ink font-medium truncate">{r.nome}</span>
                  <span className="block text-xs text-muted">Varejo {formatarBRL(r.preco_venda)}</span>
                </span>
                <CampoPrecoLista
                  produtoId={r.produto_id}
                  listaId={id}
                  override={r.override}
                  varejo={r.preco_venda}
                  revalidar={revalidar}
                  action={definirPrecoAction}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
