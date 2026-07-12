import { exigirGestao } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioFornecedor } from "@/components/cadastros/FormularioFornecedor";
import { criarFornecedor } from "../actions";

export default async function NovoFornecedorPage() {
  const perfil = await exigirGestao();
  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Novo fornecedor"
          voltarHref="/gestao/fornecedores"
        />
        <FormularioFornecedor
          action={criarFornecedor}
          voltarHref="/gestao/fornecedores"
        />
      </main>
    </>
  );
}
