import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterCompra } from "@/lib/dados/compras";
import { formatarBRL, formatarData, formatarQtd, numCompra } from "@/lib/formato";
import { simboloMoeda } from "@/lib/dados/tipos";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { CancelarCompra } from "@/components/compras/CancelarCompra";
import { cancelarCompraAction } from "../acoes-cancelar";

export default async function CompraDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await exigirGestao();
  const compra = await obterCompra(id);
  if (!compra) notFound();

  const simbolo = simboloMoeda(compra.moeda);
  const fmtOrigem = (n: number) =>
    `${simbolo} ${n.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={`Compra ${numCompra(compra.numero)}`}
          descricao={compra.fornecedor_nome ?? "Sem fornecedor"}
          voltarHref="/gestao/compras"
        />

        {/* Cabeçalho */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <Info rotulo="Data" valor={formatarData(compra.data_compra)} />
          <Info rotulo="Moeda" valor={compra.moeda} />
          {compra.moeda !== "BRL" && (
            <Info
              rotulo="Câmbio"
              valor={`1 ${simbolo} = ${formatarBRL(compra.cambio)}`}
            />
          )}
        </div>

        {/* Itens */}
        <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Itens</h2>
        <div className="rounded-2xl border border-line bg-surface overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                  <th className="text-left font-semibold px-4 py-3">Produto</th>
                  <th className="text-right font-semibold px-4 py-3">Qtd</th>
                  <th className="text-right font-semibold px-4 py-3">Preço pago</th>
                  <th className="text-right font-semibold px-4 py-3">Custo real/un</th>
                  <th className="text-right font-semibold px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {compra.itens.map((it) => (
                  <tr key={it.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink font-medium">
                      {it.produto_nome ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">
                      {formatarQtd(it.quantidade)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {fmtOrigem(it.custo_origem_unit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-accent-ink font-semibold">
                      {formatarBRL(it.custo_real_unitario)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink font-semibold">
                      {formatarBRL(it.custo_total_brl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Despesas */}
        {compra.despesas.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-ink tracking-tight mb-2">
              Despesas de importação
            </h2>
            <div className="rounded-2xl border border-line bg-surface divide-y divide-line mb-5">
              {compra.despesas.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-ink">{d.descricao}</span>
                  <span className="tabular-nums text-ink font-medium">
                    {formatarBRL(d.valor_brl)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Totais */}
        <div className="rounded-2xl border border-line bg-surface-2 p-4 flex flex-col gap-1.5">
          <Total rotulo="Total dos itens" valor={formatarBRL(compra.total_itens_brl)} />
          <Total rotulo="Despesas (rateadas)" valor={formatarBRL(compra.total_despesas_brl)} />
          <div className="border-t border-line my-1" />
          <Total rotulo="Total da compra" valor={formatarBRL(compra.total_geral_brl)} forte />
        </div>

        {compra.observacoes && (
          <p className="text-sm text-muted mt-4">
            <b className="text-ink">Observações:</b> {compra.observacoes}
          </p>
        )}

        {compra.status === "cancelada" ? (
          <p className="mt-6 text-sm font-semibold text-danger bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl px-4 py-3">
            ⛔ Compra CANCELADA — a entrada no estoque foi revertida e a conta a
            pagar cancelada.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted mt-6">
              Esta compra deu entrada no estoque e atualizou o custo médio de cada
              produto automaticamente.
            </p>
            <CancelarCompra compraId={compra.id} action={cancelarCompraAction} />
          </>
        )}
      </main>
    </>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <div className="text-[11px] font-mono uppercase tracking-wide text-muted">
        {rotulo}
      </div>
      <div className="text-ink font-semibold">{valor}</div>
    </div>
  );
}

function Total({
  rotulo,
  valor,
  forte,
}: {
  rotulo: string;
  valor: string;
  forte?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={forte ? "font-bold text-ink" : "text-muted text-sm"}>
        {rotulo}
      </span>
      <span
        className={`tabular-nums ${forte ? "text-xl font-extrabold text-ink" : "text-ink font-semibold"}`}
      >
        {valor}
      </span>
    </div>
  );
}
