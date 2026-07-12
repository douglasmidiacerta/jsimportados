import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/perfil";
import { obterVendaOperacao } from "@/lib/dados/vendas";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { ReciboVenda } from "@/components/vendas/ReciboVenda";

export default async function ReciboVendaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await exigirPerfil();
  const venda = await obterVendaOperacao(id);
  if (!venda) notFound();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <div className="rounded-2xl bg-[var(--good)]/10 border border-[var(--good)]/30 p-4 text-center mb-5">
          <div className="text-good font-bold text-lg">✅ Venda registrada!</div>
          <div className="text-3xl font-extrabold text-ink tabular-nums mt-1">
            {formatarBRL(venda.total)}
          </div>
        </div>

        <ReciboVenda venda={venda} />

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link
            href="/balcao/vender"
            className="h-14 flex-1 inline-flex items-center justify-center rounded-2xl bg-accent text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99]"
          >
            Nova venda
          </Link>
          <Link
            href="/balcao"
            className="h-14 inline-flex items-center justify-center rounded-2xl border border-line px-5 font-semibold text-ink hover:bg-surface-2"
          >
            Início
          </Link>
        </div>
      </main>
    </>
  );
}
