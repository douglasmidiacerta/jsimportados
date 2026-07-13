import { exigirGestao } from "@/lib/perfil";
import { listarClientes } from "@/lib/dados/clientes";
import { formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";
import { TabelaBusca, type LinhaBusca } from "@/components/TabelaBusca";

export default async function ClientesPage() {
  const perfil = await exigirGestao();
  const clientes = await listarClientes(undefined, true);

  const itens: ItemLista[] = clientes.map((c) => ({
    id: c.id,
    titulo: c.nome,
    subtitulo: c.telefone ?? undefined,
    arquivado: !c.ativo,
  }));

  const linhas: LinhaBusca[] = clientes.map((c) => ({
    id: c.id,
    href: `/gestao/clientes/${c.id}`,
    arquivado: !c.ativo,
    celulas: [
      c.nome,
      c.telefone,
      c.documento,
      c.aniversario ? formatarData(c.aniversario) : null,
      c.observacoes ? "📝" : null,
    ],
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Clientes"
          descricao={`${clientes.filter((c) => c.ativo).length} cliente(s)`}
          voltarHref="/gestao/cadastros"
          novoHref="/gestao/clientes/novo"
          novoTexto="Novo cliente"
        />
        <div className="lg:hidden">
          <ListaCadastro
            itens={itens}
            hrefBase="/gestao/clientes"
            placeholder="Buscar cliente…"
            vazioTexto="Nenhum cliente cadastrado ainda."
          />
        </div>
        <div className="hidden lg:block">
          <TabelaBusca
            colunas={[
              { titulo: "Cliente" },
              { titulo: "Telefone" },
              { titulo: "Documento" },
              { titulo: "Aniversário" },
              { titulo: "Obs." },
            ]}
            linhas={linhas}
            placeholder="Pesquisar cliente…"
            vazio="Nenhum cliente cadastrado ainda."
          />
        </div>
      </main>
    </>
  );
}
