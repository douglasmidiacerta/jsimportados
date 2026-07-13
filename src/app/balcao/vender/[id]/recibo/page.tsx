import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/perfil";
import { obterVendaOperacao } from "@/lib/dados/vendas";
import { obterEmpresa } from "@/lib/dados/empresa";
import { BotoesRecibo } from "@/components/vendas/BotoesRecibo";
import { ReciboImpressao } from "@/components/vendas/ReciboImpressao";

export default async function ReciboBalcaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await exigirPerfil();
  const [venda, empresa] = await Promise.all([obterVendaOperacao(id), obterEmpresa()]);
  if (!venda) notFound();

  return (
    <main className="mx-auto max-w-3xl w-full px-4 py-6 flex-1">
      <BotoesRecibo voltarHref={`/balcao/vender/${id}`} />
      <ReciboImpressao venda={venda} empresa={empresa} />
    </main>
  );
}
