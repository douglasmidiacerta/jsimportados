import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarContasReceber } from "@/lib/dados/contasReceber";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

type Params = { status?: string };

function Chip({
  href,
  ativo,
  children,
}: {
  href: string;
  ativo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
        ativo
          ? "bg-accent text-white border-accent"
          : "bg-surface text-muted border-line hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function ContasReceberPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const status = (sp.status ?? "aberto") as "aberto" | "liquidado" | "todas";

  const contas = await listarContasReceber(
    status === "todas" ? undefined : status,
  );

  const totalAberto = contas
    .filter((c) => c.status === "aberto")
    .reduce((s, c) => s + c.saldo, 0);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Contas a receber"
          descricao="Cartão e fiado. Dê baixa quando o dinheiro cair."
          voltarHref="/gestao/financeiro"
        />

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Chip href="/gestao/contas-receber?status=aberto" ativo={status === "aberto"}>A receber</Chip>
          <Chip href="/gestao/contas-receber?status=liquidado" ativo={status === "liquidado"}>Recebidas</Chip>
          <Chip href="/gestao/contas-receber?status=todas" ativo={status === "todas"}>Todas</Chip>
        </div>

        {contas.length === 0 ? (
          <p className="text-muted text-center py-10">
            Nada por aqui. Vendas no cartão e no fiado aparecem aqui.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {contas.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/gestao/contas-receber/${c.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface-2 transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ink truncate">
                          {c.cliente_nome ?? (c.tipo === "cartao" ? "Cartão" : "Fiado")}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-line shrink-0">
                          {c.tipo === "cartao" ? `cartão ${c.parcela_num}/${c.parcela_total}` : "fiado"}
                        </span>
                        {c.status === "liquidado" && (
                          <span className="text-[10px] font-mono uppercase tracking-wide text-good shrink-0">✓ recebida</span>
                        )}
                        {c.status === "aberto" && c.valor_recebido > 0 && (
                          <span className="text-[10px] font-mono uppercase tracking-wide text-amber shrink-0">parcial</span>
                        )}
                      </span>
                      <span className="block text-sm text-muted">
                        {c.status === "liquidado" && c.liquidado_em
                          ? `recebida ${formatarData(c.liquidado_em)}`
                          : `vence ${formatarData(c.vencimento)}`}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className={`block font-semibold tabular-nums ${c.status === "liquidado" ? "text-muted" : "text-ink"}`}>
                        {formatarBRL(c.valor_liquido)}
                      </span>
                      {c.status === "aberto" && c.valor_recebido > 0 && (
                        <span className="block text-[11px] text-muted tabular-nums">
                          falta {formatarBRL(c.saldo)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4 flex items-center justify-between">
              <div className="text-sm text-muted">Líquido a receber (em aberto)</div>
              <div className="text-2xl font-extrabold text-ink tabular-nums">
                {formatarBRL(totalAberto)}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
