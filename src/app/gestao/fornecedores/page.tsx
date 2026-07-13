import { exigirGestao } from "@/lib/perfil";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";
import { TabelaBusca, type LinhaBusca } from "@/components/TabelaBusca";

export default async function FornecedoresPage() {
  const perfil = await exigirGestao();
  const fornecedores = await listarFornecedores(undefined, true);

  const itens: ItemLista[] = fornecedores.map((f) => ({
    id: f.id,
    titulo: f.nome,
    subtitulo: [f.cidade, f.pais].filter(Boolean).join(" · ") || undefined,
    arquivado: !f.ativo,
    badge: f.situacao === "bloqueado" ? "bloqueado" : undefined,
  }));

  const linhas: LinhaBusca[] = fornecedores.map((f) => ({
    id: f.id,
    href: `/gestao/fornecedores/${f.id}`,
    arquivado: !f.ativo,
    badge: f.situacao === "bloqueado" ? "bloqueado" : undefined,
    cor: f.situacao === "bloqueado" ? "amarela" : null,
    celulas: [
      f.nome,
      f.tipo_pessoa === "fisica" ? "Física" : "Jurídica",
      f.documento,
      f.contato,
      [f.telefone, f.celular].filter(Boolean).join(" · ") || null,
      [f.cidade, f.pais].filter(Boolean).join(" · ") || null,
      f.eh_transportadora ? "🚚" : null,
    ],
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Fornecedores"
          descricao="De quem você compra (Paraguai)."
          voltarHref="/gestao/cadastros"
          novoHref="/gestao/fornecedores/novo"
          novoTexto="Novo fornecedor"
        />
        <div className="lg:hidden">
          <ListaCadastro
            itens={itens}
            hrefBase="/gestao/fornecedores"
            placeholder="Buscar fornecedor…"
            vazioTexto="Nenhum fornecedor cadastrado ainda."
          />
        </div>
        <div className="hidden lg:block">
          <TabelaBusca
            colunas={[
              { titulo: "Fornecedor" },
              { titulo: "Pessoa" },
              { titulo: "CNPJ/CPF" },
              { titulo: "Contato" },
              { titulo: "Telefones" },
              { titulo: "Cidade" },
              { titulo: "Transp." },
            ]}
            linhas={linhas}
            placeholder="Pesquisar fornecedor…"
            vazio="Nenhum fornecedor cadastrado ainda."
            legenda={[{ cor: "amarela", rotulo: "Bloqueado (fora da seleção de compras)" }]}
          />
        </div>
      </main>
    </>
  );
}
