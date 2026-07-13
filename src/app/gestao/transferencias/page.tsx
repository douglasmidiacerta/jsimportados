import { exigirGestao } from "@/lib/perfil";
import { listarContasAtivas } from "@/lib/dados/contasFinanceiras";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioTransferencia } from "@/components/financeiro/FormularioTransferencia";
import { transferirAction } from "../contas/actions";

export default async function TransferenciasPage() {
  const perfil = await exigirGestao();
  const contas = await listarContasAtivas();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Transferir entre contas"
          descricao="Depósito do dinheiro do caixa no banco, repasse da maquininha… Vira dois lançamentos (sai de uma, entra na outra)."
          voltarHref="/gestao/contas"
        />
        {contas.length < 2 ? (
          <p className="text-muted">
            É preciso ter pelo menos duas contas ativas para transferir.{" "}
            <a href="/gestao/contas/nova" className="text-accent-ink font-semibold underline">
              Criar conta
            </a>
            .
          </p>
        ) : (
          <FormularioTransferencia contas={contas} action={transferirAction} />
        )}
      </main>
    </>
  );
}
