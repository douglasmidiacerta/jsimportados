import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarContasReceber } from "@/lib/dados/contasReceber";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

export default async function ContasReceberPage() {
  const perfil = await exigirGestao();
  const contas = await listarContasReceber("aberto");

  const totalLiquido = contas.reduce((s, c) => s + c.valor_liquido, 0);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Contas a receber"
          descricao={`${contas.length} em aberto · Líquido a receber ${formatarBRL(totalLiquido)}`}
          voltarHref="/gestao"
        />

        {contas.length === 0 ? (
          <p className="text-muted text-center py-10">
            Nada a receber no momento. Vendas no cartão e no fiado aparecem aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contas.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/gestao/vendas/${c.venda_id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 hover:bg-surface-2 transition-colors"
                >
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-ink truncate">
                        {c.cliente_nome ?? (c.tipo === "cartao" ? "Cartão" : "Fiado")}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-3 text-muted border border-line shrink-0">
                        {c.tipo === "cartao"
                          ? `cartão ${c.parcela_num}/${c.parcela_total}`
                          : "fiado"}
                      </span>
                    </span>
                    <span className="block text-sm text-muted">
                      vence {formatarData(c.vencimento)}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block font-semibold text-ink tabular-nums">
                      {formatarBRL(c.valor_liquido)}
                    </span>
                    {c.valor_taxa > 0 && (
                      <span className="block text-[11px] text-muted tabular-nums">
                        bruto {formatarBRL(c.valor_bruto)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
