import { exigirGestao } from "@/lib/perfil";
import { listarTaxasCartao } from "@/lib/dados/taxasCartao";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioTaxasCartao } from "@/components/vendas/FormularioTaxasCartao";
import { salvarTaxasCartao } from "./actions";

export default async function TaxasCartaoPage() {
  const perfil = await exigirGestao();
  const taxas = await listarTaxasCartao();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Taxas do cartão"
          descricao="A taxa da maquininha (MDR) de cada parcela. Ajuste com os valores reais da sua máquina."
          voltarHref="/gestao"
        />
        <p className="text-sm text-muted mb-4">
          O sistema desconta essa taxa para calcular o valor líquido de cada venda
          no cartão. “Cai em (dias)” é quando a 1ª parcela entra na conta.
        </p>
        <FormularioTaxasCartao taxas={taxas} action={salvarTaxasCartao} />
      </main>
    </>
  );
}
