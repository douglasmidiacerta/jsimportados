import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { lerExtrato, hojeBRT, inicioMesBRT } from "@/lib/dados/financeiro";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import type { ExtratoLinha } from "@/lib/dados/tipos";

type Params = { inicio?: string; fim?: string };

/** Valida FORMATO e validade real da data (30/02 não passa). */
function dataValida(v?: string): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function origemRotulo(l: ExtratoLinha): string {
  if (l.origem === "saldo_inicial") return "Saldo inicial";
  if (l.origem === "venda") return l.descricao.replace("Venda ", "Venda em ");
  if (l.origem === "recebimento") return "Recebimento (cartão/fiado)";
  return "Pagamento";
}

export default async function ExtratoPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;
  const inicio = dataValida(sp.inicio) ? sp.inicio : inicioMesBRT();
  const fim = dataValida(sp.fim) ? sp.fim : hojeBRT();

  const extrato = await lerExtrato(inicio, fim);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Extrato"
          descricao="Dinheiro que entrou e saiu de verdade (fluxo de caixa)."
          voltarHref="/gestao/financeiro"
        />

        <form
          method="get"
          className="flex flex-wrap items-end gap-3 mb-4 rounded-2xl border border-line bg-surface-2 p-3"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">De</span>
            <input type="date" name="inicio" defaultValue={inicio} className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-ink outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Até</span>
            <input type="date" name="fim" defaultValue={fim} className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-ink outline-none focus:border-accent" />
          </label>
          <button type="submit" className="h-11 px-4 rounded-lg bg-accent text-white font-bold">Ver</button>
          <Link href="/gestao/extrato" className="h-11 inline-flex items-center px-3 text-sm font-semibold text-muted hover:text-ink">Este mês</Link>
        </form>

        <p className="text-xs text-muted mb-4">
          Não inclui cartão/fiado que ainda não caíram, nem a sangria da gaveta do caixa.{" "}
          <Link href="/gestao/extrato/config" className="text-accent-ink underline underline-offset-2">Ajustar saldo inicial</Link>
        </p>

        <div className="rounded-2xl border border-line bg-surface-2 p-4 flex items-center justify-between mb-4">
          <span className="text-sm text-muted">Saldo no começo do período</span>
          <span className="text-lg font-bold text-ink tabular-nums">{formatarBRL(extrato.abertura)}</span>
        </div>

        {extrato.linhas.length === 0 ? (
          <p className="text-muted text-center py-10">Nenhum movimento nesse período.</p>
        ) : (
          <div className="rounded-2xl border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase tracking-wide border-b border-line">
                    <th className="text-left font-semibold px-4 py-2">Data</th>
                    <th className="text-left font-semibold px-2 py-2">Movimento</th>
                    <th className="text-right font-semibold px-2 py-2">Entrada</th>
                    <th className="text-right font-semibold px-2 py-2">Saída</th>
                    <th className="text-right font-semibold px-4 py-2">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {extrato.linhas.map((l, i) => (
                    <tr key={`${l.ref_id ?? "s"}-${i}`} className="border-b border-line/60 last:border-0">
                      <td className="px-4 py-2.5 text-muted whitespace-nowrap">{formatarData(l.data)}</td>
                      <td className="px-2 py-2.5 text-ink">{origemRotulo(l)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-good">
                        {l.entrada > 0 ? formatarBRL(l.entrada) : ""}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-danger">
                        {l.saida > 0 ? formatarBRL(l.saida) : ""}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-ink">
                        {formatarBRL(l.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <div className="text-xs text-muted">Entrou</div>
            <div className="text-good font-bold tabular-nums mt-0.5">{formatarBRL(extrato.entradas)}</div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <div className="text-xs text-muted">Saiu</div>
            <div className="text-danger font-bold tabular-nums mt-0.5">{formatarBRL(extrato.saidas)}</div>
          </div>
          <div className="rounded-xl border border-accent/40 bg-surface p-3 text-center">
            <div className="text-xs text-muted">Saldo final</div>
            <div className="text-ink font-extrabold tabular-nums mt-0.5">{formatarBRL(extrato.saldo_final)}</div>
          </div>
        </div>
      </main>
    </>
  );
}
