import { exigirGestao } from "@/lib/perfil";
import { listarPatrimonio } from "@/lib/dados/estoque";
import { formatarBRL, formatarQtd, codProduto } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ExportarCSV } from "@/components/ExportarCSV";

export default async function PatrimonioPage() {
  const perfil = await exigirGestao();
  const itens = await listarPatrimonio();

  const totalCusto = itens.reduce((s, i) => s + i.valor_custo, 0);
  const totalVenda = itens.reduce((s, i) => s + i.valor_venda, 0);
  const lucroPotencial = totalVenda - totalCusto;
  const nRepor = itens.filter((i) => i.abaixo_minimo).length;

  const csvColunas = ["Código", "Produto", "Estoque", "Mínimo", "Custo médio", "Preço venda", "Valor a custo", "Valor a venda"];
  const csvLinhas = itens.map((i) => [
    codProduto(i.codigo_sequencial),
    i.nome,
    i.estoque,
    i.estoque_minimo,
    i.custo_medio ?? 0,
    i.preco_venda,
    i.valor_custo,
    i.valor_venda,
  ]);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-5xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Patrimônio em estoque"
          descricao="Quanto vale o que está parado — a custo (o que você pagou) e a preço de venda."
          voltarHref="/gestao/relatorios"
        />

        {/* Cartões de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <Cartao rotulo="Valor a custo" valor={formatarBRL(totalCusto)} dica="O que você investiu" />
          <Cartao rotulo="Valor a venda" valor={formatarBRL(totalVenda)} dica="Se vender tudo pelo preço de tabela" />
          <Cartao rotulo="Lucro potencial" valor={formatarBRL(lucroPotencial)} dica="Venda − custo" cor={lucroPotencial >= 0 ? "good" : "danger"} />
        </div>

        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-sm text-muted">
            {itens.length} produto(s){nRepor > 0 ? ` · ${nRepor} para repor` : ""}
          </span>
          <ExportarCSV nomeArquivo="patrimonio" colunas={csvColunas} linhas={csvLinhas} />
        </div>

        {itens.length === 0 ? (
          <p className="text-muted">Nenhum produto ativo com estoque.</p>
        ) : (
          <div className="rounded-2xl border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                    <th className="text-left font-semibold px-4 py-3">Código</th>
                    <th className="text-left font-semibold px-4 py-3">Produto</th>
                    <th className="text-right font-semibold px-4 py-3">Estoque</th>
                    <th className="text-right font-semibold px-4 py-3">Custo médio</th>
                    <th className="text-right font-semibold px-4 py-3">Preço venda</th>
                    <th className="text-right font-semibold px-4 py-3">Valor a custo</th>
                    <th className="text-right font-semibold px-4 py-3">Valor a venda</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i) => (
                    <tr key={i.produto_id} className={`border-b border-line last:border-0 ${i.abaixo_minimo ? "linha-amarela" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{codProduto(i.codigo_sequencial)}</td>
                      <td className="px-4 py-3 text-ink font-medium">
                        {i.nome}
                        {i.abaixo_minimo && <span className="ml-2 text-[10px] font-bold uppercase text-amber">repor</span>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatarQtd(i.estoque)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{i.custo_medio == null ? "—" : formatarBRL(i.custo_medio)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{formatarBRL(i.preco_venda)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">{formatarBRL(i.valor_custo)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink font-semibold">{formatarBRL(i.valor_venda)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-2 font-bold">
                    <td className="px-4 py-3 text-ink" colSpan={5}>Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{formatarBRL(totalCusto)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{formatarBRL(totalVenda)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Cartao({
  rotulo,
  valor,
  dica,
  cor,
}: {
  rotulo: string;
  valor: string;
  dica: string;
  cor?: "good" | "danger";
}) {
  const c = cor === "good" ? "text-good" : cor === "danger" ? "text-danger" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-xs text-muted">{rotulo}</div>
      <div className={`text-xl font-extrabold tabular-nums mt-1 ${c}`}>{valor}</div>
      <div className="text-[11px] text-muted mt-0.5">{dica}</div>
    </div>
  );
}
