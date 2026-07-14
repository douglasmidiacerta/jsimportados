import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarOrcamentos } from "@/lib/dados/orcamentos";
import { formatarBRL, formatarData, numOrcamento } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { TabelaBusca, type LinhaBusca } from "@/components/TabelaBusca";
import { ListaCadastro, type ItemLista } from "@/components/cadastros/ListaCadastro";
import { AbasVendas } from "@/components/vendas/AbasVendas";

function hoje(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export default async function OrcamentosPage() {
  const perfil = await exigirGestao();
  const orcamentos = await listarOrcamentos();
  const hj = hoje();

  const n = { aberto: 0, convertido: 0, cancelado: 0, expirado: 0 };
  for (const o of orcamentos) {
    if (o.status === "aberto" && o.validade && o.validade < hj) n.expirado++;
    else n[o.status]++;
  }
  const totalAberto = orcamentos
    .filter((o) => o.status === "aberto")
    .reduce((s, o) => s + o.total, 0);

  const situacao = (o: (typeof orcamentos)[number]) =>
    o.status === "convertido"
      ? { rot: "✓ virou venda", cor: "verde" as const }
      : o.status === "cancelado"
        ? { rot: "⛔ cancelado", cor: "vermelha" as const }
        : o.validade && o.validade < hj
          ? { rot: "⏰ vencido", cor: "amarela" as const }
          : { rot: "aberto", cor: "amarela" as const };

  const linhas: LinhaBusca[] = orcamentos.map((o) => {
    const s = situacao(o);
    return {
      id: o.id,
      href: `/gestao/orcamentos/${o.id}`,
      cor: s.cor,
      celulas: [
        numOrcamento(o.numero),
        o.cliente_nome ?? "Sem cliente",
        formatarData(o.criado_em.slice(0, 10)),
        o.validade ? formatarData(o.validade) : "—",
        formatarBRL(o.total),
        s.rot,
      ],
    };
  });

  const itens: ItemLista[] = orcamentos.map((o) => ({
    id: o.id,
    titulo: `${numOrcamento(o.numero)} · ${o.cliente_nome ?? "Sem cliente"}`,
    subtitulo: `${formatarData(o.criado_em.slice(0, 10))} · ${situacao(o).rot}`,
    extra: formatarBRL(o.total),
  }));

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-none w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Orçamentos"
          descricao="Propostas para o cliente. Um orçamento aberto vira venda com um clique."
          voltarHref="/gestao"
        />

        <AbasVendas atual="orcamentos" />

        <div className="flex flex-wrap gap-2 mb-5">
          <Link href="/gestao/orcamentos/novo" className="h-11 inline-flex items-center gap-2 rounded-xl bg-accent text-white px-4 font-semibold shadow-[var(--shadow)] active:scale-[0.99]">
            <span className="text-lg leading-none">+</span> Novo orçamento
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Contador rotulo="Abertos" valor={n.aberto} sub={formatarBRL(totalAberto)} cor="amber" />
          <Contador rotulo="Vencidos" valor={n.expirado} cor="amber" />
          <Contador rotulo="Viraram venda" valor={n.convertido} cor="good" />
          <Contador rotulo="Cancelados" valor={n.cancelado} cor="muted" />
        </div>

        {orcamentos.length === 0 ? (
          <p className="text-muted">Nenhum orçamento ainda. Crie o primeiro no botão acima.</p>
        ) : (
          <>
            <div className="lg:hidden">
              <ListaCadastro itens={itens} hrefBase="/gestao/orcamentos" placeholder="Buscar…" vazioTexto="Nenhum orçamento." />
            </div>
            <div className="hidden lg:block">
              <TabelaBusca
                colunas={[
                  { titulo: "Nº" },
                  { titulo: "Cliente" },
                  { titulo: "Data" },
                  { titulo: "Vale até" },
                  { titulo: "Total", alinhar: "dir" },
                  { titulo: "Situação" },
                ]}
                linhas={linhas}
                legenda={[
                  { cor: "amarela", rotulo: "Aberto / vencido" },
                  { cor: "verde", rotulo: "Virou venda" },
                  { cor: "vermelha", rotulo: "Cancelado" },
                ]}
                placeholder="Pesquisar por cliente ou nº…"
                vazio="Nenhum orçamento."
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}

function Contador({
  rotulo,
  valor,
  sub,
  cor,
}: {
  rotulo: string;
  valor: number;
  sub?: string;
  cor: "amber" | "good" | "muted";
}) {
  const c = cor === "good" ? "text-good" : cor === "amber" ? "text-amber" : "text-muted";
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-xs text-muted">{rotulo}</div>
      <div className={`text-2xl font-extrabold tabular-nums mt-1 ${c}`}>{valor}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}
