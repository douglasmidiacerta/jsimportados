import { exigirGestao } from "@/lib/perfil";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { listarProdutos } from "@/lib/dados/produtos";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioCompra } from "@/components/compras/FormularioCompra";
import { registrarCompraAction } from "../actions";

export default async function NovaCompraPage() {
  const perfil = await exigirGestao();
  const [fornecedores, produtos] = await Promise.all([
    listarFornecedores(),
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
          <p className="text-muted">
            Você precisa ter produtos cadastrados antes de registrar uma compra.
          </p>
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
