import { exigirGestao } from "@/lib/perfil";
import {
  listarCategoriasDespesa,
  hojeBRT,
} from "@/lib/dados/financeiro";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioDespesa } from "@/components/financeiro/FormularioDespesa";
import { registrarDespesaAction } from "../actions";

export default async function NovaDespesaPage() {
  const perfil = await exigirGestao();
  const [categorias, fornecedores] = await Promise.all([
    listarCategoriasDespesa(),
    listarFornecedores(undefined, false, true),
  ]);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-lg w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Nova despesa"
          descricao="Aluguel, luz, frete, salários… entra no DRE pela competência."
          voltarHref="/gestao/contas-pagar"
        />
        <FormularioDespesa
          categorias={categorias}
          fornecedores={fornecedores.map((f) => ({ valor: f.id, rotulo: f.nome }))}
          hoje={hojeBRT()}
          action={registrarDespesaAction}
        />
      </main>
    </>
  );
}
