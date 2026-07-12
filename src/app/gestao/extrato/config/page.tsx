import { exigirGestao } from "@/lib/perfil";
import { obterFinanceiroConfig } from "@/lib/dados/financeiro";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ConfigSaldo } from "@/components/financeiro/ConfigSaldo";
import { salvarSaldoInicialAction } from "./actions";

export default async function ConfigSaldoPage() {
  const perfil = await exigirGestao();
  const config = await obterFinanceiroConfig();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-lg w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Saldo inicial"
          descricao="O ponto de partida do seu extrato."
          voltarHref="/gestao/extrato"
        />
        <ConfigSaldo
          saldoInicial={config.saldo_inicial}
          dataInicial={config.data_inicial}
          action={salvarSaldoInicialAction}
        />
      </main>
    </>
  );
}
