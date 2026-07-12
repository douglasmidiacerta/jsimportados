import { exigirGestao } from "@/lib/perfil";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";

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

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Fornecedores"
          descricao="De quem você compra (Paraguai)."
          voltarHref="/gestao/cadastros"
          novoHref="/gestao/fornecedores/novo"
          novoTexto="Novo fornecedor"
        />
        <ListaCadastro
          itens={itens}
          hrefBase="/gestao/fornecedores"
          placeholder="Buscar fornecedor…"
          vazioTexto="Nenhum fornecedor cadastrado ainda."
        />
      </main>
    </>
  );
}
