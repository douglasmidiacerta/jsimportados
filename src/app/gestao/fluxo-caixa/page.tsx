import { exigirGestao } from "@/lib/perfil";
import { relFluxoCaixa } from "@/lib/dados/conciliacao";
import { hojeBRT, inicioMesBRT } from "@/lib/dados/financeiro";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";

const CAMPO =
  "h-11 rounded-xl border border-line bg-surface-2 px-3 text-base text-ink outline-none focus:border-accent";

export default async function FluxoCaixaPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const inicio = sp.inicio || inicioMesBRT();
  const fim = sp.fim || hojeBRT();

  const linhas = await relFluxoCaixa(inicio, fim);
  const ativas = linhas.filter(
    (l) => l.saldo_inicial !== 0 || l.entradas !== 0 || l.saidas !== 0 || l.saldo_final !== 0,
  );

  const tot = ativas.reduce(
    (a, l) => ({
      inicial: a.inicial + l.saldo_inicial,
      entradas: a.entradas + l.entradas,
      saidas: a.saidas + l.saidas,
      final: a.final + l.saldo_final,
    }),
    { inicial: 0, entradas: 0, saidas: 0, final: 0 },
  );

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl lg:max-w-4xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Fluxo de caixa"
          descricao="Quanto entrou e saiu de cada conta no período, com saldo inicial e final."
          voltarHref="/gestao/financeiro"
        />

        <form className="flex flex-wrap items-end gap-3 mb-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">De</span>
            <input type="date" name="inicio" defaultValue={inicio} className={CAMPO} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Até</span>
            <input type="date" name="fim" defaultValue={fim} className={CAMPO} />
          </label>
          <button className="h-11 rounded-xl bg-accent text-white px-5 font-semibold shadow-[var(--shadow)]">
            Aplicar
          </button>
        </form>

        {ativas.length === 0 ? (
          <p className="text-muted">
            Sem movimento no período. Cadastre contas e lance movimentos, ou mude as datas.
          </p>
        ) : (
          <div className="rounded-2xl border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                    <th className="text-left font-semibold px-4 py-2.5">Conta</th>
                    <th className="text-right font-semibold px-4 py-2.5">Saldo inicial</th>
                    <th className="text-right font-semibold px-4 py-2.5">Entradas</th>
                    <th className="text-right font-semibold px-4 py-2.5">Saídas</th>
                    <th className="text-right font-semibold px-4 py-2.5">Saldo final</th>
                  </tr>
                </thead>
                <tbody>
                  {ativas.map((l) => (
                    <tr key={l.conta_id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 text-ink font-medium">{l.conta_nome}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink">{formatarBRL(l.saldo_inicial)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-good">{formatarBRL(l.entradas)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-danger">{formatarBRL(l.saidas)}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold ${l.saldo_final < 0 ? "text-danger" : "text-ink"}`}>
                        {formatarBRL(l.saldo_final)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-2 font-bold">
                    <td className="px-4 py-3 text-ink">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-ink">{formatarBRL(tot.inicial)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-good">{formatarBRL(tot.entradas)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-danger">{formatarBRL(tot.saidas)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${tot.final < 0 ? "text-danger" : "text-ink"}`}>
                      {formatarBRL(tot.final)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted mt-3">
          Período: {formatarData(inicio)} a {formatarData(fim)}. Saldo inicial =
          tudo que entrou/saiu antes da data “De”. O dinheiro em espécie (gaveta)
          fica no módulo Caixa; aqui aparece o que está em conta.
        </p>
      </main>
    </>
  );
}
