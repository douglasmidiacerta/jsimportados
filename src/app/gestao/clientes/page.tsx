import { exigirGestao } from "@/lib/perfil";
import { listarClientes } from "@/lib/dados/clientes";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";

export default async function ClientesPage() {
  const perfil = await exigirGestao();
  const clientes = await listarClientes(undefined, true);

  const itens: ItemLista[] = clientes.map((c) => ({
    id: c.id,
    titulo: c.nome,
    subtitulo: c.telefone ?? undefined,
    arquivado: !c.ativo,
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Clientes"
          descricao={`${clientes.filter((c) => c.ativo).length} cliente(s)`}
          voltarHref="/gestao/cadastros"
          novoHref="/gestao/clientes/novo"
          novoTexto="Novo cliente"
        />
        <ListaCadastro
          itens={itens}
          hrefBase="/gestao/clientes"
          placeholder="Buscar cliente…"
          vazioTexto="Nenhum cliente cadastrado ainda."
        />
      </main>
    </>
  );
}
