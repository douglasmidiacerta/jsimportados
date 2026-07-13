import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterVendaGestao } from "@/lib/dados/vendas";
import { obterEmpresa } from "@/lib/dados/empresa";
import { BotoesRecibo } from "@/components/vendas/BotoesRecibo";
import { ReciboImpressao } from "@/components/vendas/ReciboImpressao";

export default async function ReciboGestaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await exigirGestao();
  const [venda, empresa] = await Promise.all([obterVendaGestao(id), obterEmpresa()]);
  if (!venda) notFound();

  return (
    <main className="mx-auto max-w-3xl w-full px-4 py-6 flex-1">
      <BotoesRecibo voltarHref={`/gestao/vendas/${id}`} />
      <ReciboImpressao venda={venda} empresa={empresa} />
    </main>
  );
}
