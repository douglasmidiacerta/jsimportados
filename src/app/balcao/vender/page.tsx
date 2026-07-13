import Link from "next/link";
import { exigirPerfil } from "@/lib/perfil";
import { listarProdutosPDV } from "@/lib/dados/vendas";
import { listarClientes } from "@/lib/dados/clientes";
import { listarListasPreco, obterListaDefault } from "@/lib/dados/listasPreco";
import { obterCaixaAberto } from "@/lib/dados/caixa";
import { BarraTopo } from "@/components/BarraTopo";
import { PDV } from "@/components/vendas/PDV";
import { registrarVendaAction } from "./actions";

export default async function VenderPage() {
  const perfil = await exigirPerfil();
  const [produtos, clientes, listas, listaDefault, caixa] = await Promise.all([
    listarProdutosPDV(),
    listarClientes(),
    listarListasPreco(),
    obterListaDefault(),
    obterCaixaAberto(),
  ]);

  // Regra do ERP: toda venda exige caixa aberto (travado no banco pela 0014).
  if (!caixa) {
    return (
      <>
        <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
        <main className="flex-1 grid place-items-center p-6">
          <div className="max-w-sm w-full text-center flex flex-col gap-4">
            <span className="text-5xl" aria-hidden="true">🔒</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              Abra o caixa primeiro
            </h1>
            <p className="text-muted">
              Para vender, o caixa do dia precisa estar aberto. Assim todo
              dinheiro que entra e sai fica registrado direitinho.
            </p>
            <Link
              href="/balcao/caixa"
              className="h-16 rounded-2xl bg-accent text-white text-lg font-bold grid place-items-center shadow-[var(--shadow)] active:scale-[0.99]"
            >
              Abrir o caixa
            </Link>
            <Link href="/balcao" className="text-sm font-semibold text-muted hover:text-ink">
              Voltar
            </Link>
          </div>
        </main>
      </>
    );
  }
  const listaDefaultId = listaDefault?.id ?? listas.find((l) => l.is_default)?.id ?? "";

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 flex-1">
        <Link
          href="/balcao"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink transition-colors mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          Voltar
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink mb-4">
          Vender
        </h1>

        {produtos.length === 0 ? (
          <p className="text-muted">
            Nenhum produto cadastrado ainda. Cadastre produtos antes de vender.
          </p>
        ) : (
          <PDV
            produtos={produtos}
            clientes={clientes}
            listas={listas}
            listaDefaultId={listaDefaultId}
            podeEditarPreco={perfil.papel === "gestao"}
            action={registrarVendaAction}
          />
        )}
      </main>
    </>
  );
}
