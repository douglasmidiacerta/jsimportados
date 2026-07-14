import { exigirGestao } from "@/lib/perfil";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { listarProdutos } from "@/lib/dados/produtos";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { VazioComSaida } from "@/components/VazioComSaida";
import { FormularioCompra } from "@/components/compras/FormularioCompra";
import { registrarCompraAction } from "../actions";

export default async function NovaCompraPage() {
  const perfil = await exigirGestao();
  const [fornecedores, produtos] = await Promise.all([
    listarFornecedores(undefined, false, true),
    listarProdutos(),
  ]);

  // Data de hoje no fuso do Brasil (evita virar o dia à noite por causa do UTC).
  const hoje = new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Nova compra"
          descricao="O custo real de cada produto é calculado automaticamente."
          voltarHref="/gestao/compras"
        />
        {produtos.length === 0 ? (
          <VazioComSaida
            icone={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7 12 3 4 7v10l8 4 8-4Z" /><path d="M4 7l8 4 8-4" /><path d="M12 21V11" /></svg>
            }
            titulo="Cadastre um produto primeiro"
            descricao="A compra registra quanto você pagou por cada produto — então o produto precisa existir antes. Leva menos de um minuto."
            acaoHref="/gestao/produtos/novo"
            acaoTexto="Cadastrar produto"
          />
        ) : (
          <FormularioCompra
            action={registrarCompraAction}
            fornecedores={fornecedores}
            produtos={produtos}
            dataInicial={hoje}
          />
        )}
      </main>
    </>
  );
}
