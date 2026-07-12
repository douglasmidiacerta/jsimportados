import { exigirGestao } from "@/lib/perfil";
import { lerDreMensal, hojeBRT } from "@/lib/dados/financeiro";
import { formatarBRL } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import type { DreMes } from "@/lib/dados/tipos";

type Params = { de?: string; ate?: string };

/** Valida FORMATO e mês real (01–12), não só o padrão. */
function mesValido(v?: string): v is string {
  if (!v || !/^\d{4}-\d{2}$/.test(v)) return false;
  const mm = Number(v.slice(5, 7));
  return mm >= 1 && mm <= 12;
}

function addMeses(yy: number, mm1: number): string {
  const idx = mm1 - 1;
  const yr = yy + Math.floor(idx / 12);
  const mo = ((idx % 12) + 12) % 12;
  return `${yr}-${String(mo + 1).padStart(2, "0")}`;
}

function mesLabel(mes: string): string {
  const d = new Date(`${mes.slice(0, 10)}T12:00:00Z`);
  const s = d.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function LinhaDre({ rotulo, valor, sinal, forte }: { rotulo: string; valor: number; sinal: "+" | "-"; forte?: boolean }) {
  const zero = Math.abs(valor) < 0.005;
  return (
    <div className="flex items-center justify-between">
      <span className={forte ? "font-bold text-ink" : "text-muted text-sm"}>{rotulo}</span>
      <span className={`tabular-nums ${forte ? "font-extrabold text-ink" : "text-ink"} ${sinal === "-" && !zero ? "text-danger" : ""}`}>
        {sinal === "-" && !zero ? "− " : ""}
        {formatarBRL(valor)}
      </span>
    </div>
  );
}

function CartaoMes({ d }: { d: DreMes }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-ink">{mesLabel(d.mes)}</h3>
        <span className={`text-lg font-extrabold tabular-nums ${d.resultado >= 0 ? "text-good" : "text-danger"}`}>
          {formatarBRL(d.resultado)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <LinhaDre rotulo="Receita de produtos" valor={d.receita_produtos} sinal="+" />
        <div className="flex items-center justify-between">
          <span className="text-muted text-sm">
            Custo dos produtos (CMV)
            {!d.cmv_completo && (
              <span className="ml-1 text-[10px] font-mono uppercase text-amber">estimado</span>
            )}
          </span>
          <span className="tabular-nums text-danger">− {formatarBRL(d.cmv)}</span>
        </div>
        <div className="border-t border-line my-1" />
        <LinhaDre rotulo="Lucro bruto" valor={d.lucro_bruto} sinal="+" forte />
        <LinhaDre rotulo="Despesas" valor={d.despesas_operacionais} sinal="-" />
        <LinhaDre rotulo="Taxas de cartão" valor={d.taxas_cartao} sinal="-" />
        {d.juros_fiado > 0.005 && <LinhaDre rotulo="Juros de fiado" valor={d.juros_fiado} sinal="+" />}
        <div className="border-t border-line my-1" />
        <LinhaDre rotulo="Resultado do mês" valor={d.resultado} sinal="+" forte />
      </div>
    </div>
  );
}

export default async function DrePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const perfil = await exigirGestao();
  const sp = await searchParams;

  const [ay, am] = hojeBRT().split("-").map(Number);
  const ateDefault = `${ay}-${String(am).padStart(2, "0")}`;
  const deDefault = addMeses(ay, am - 11);

  const de = mesValido(sp.de) ? sp.de : deDefault;
  const ate = mesValido(sp.ate) ? sp.ate : ateDefault;

  const meses = await lerDreMensal(`${de}-01`, `${ate}-01`);

  const tot = meses.reduce(
    (a, d) => ({
      receita: a.receita + d.receita_produtos,
      cmv: a.cmv + d.cmv,
      despesas: a.despesas + d.despesas_operacionais,
      resultado: a.resultado + d.resultado,
    }),
    { receita: 0, cmv: 0, despesas: 0, resultado: 0 },
  );
  const algumIncompleto = meses.some((d) => !d.cmv_completo);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="DRE gerencial"
          descricao="Resultado por competência (o mês em que a venda/despesa aconteceu)."
          voltarHref="/gestao/financeiro"
        />

        <form method="get" className="flex flex-wrap items-end gap-3 mb-4 rounded-2xl border border-line bg-surface-2 p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">De</span>
            <input type="month" name="de" defaultValue={de} className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-ink outline-none focus:border-accent" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Até</span>
            <input type="month" name="ate" defaultValue={ate} className="min-h-[44px] rounded-lg border border-line bg-surface px-3 text-ink outline-none focus:border-accent" />
          </label>
          <button type="submit" className="h-11 px-4 rounded-lg bg-accent text-white font-bold">Ver</button>
        </form>

        {algumIncompleto && (
          <p className="text-sm text-amber bg-[var(--amber-soft)] border border-[var(--amber)]/30 rounded-xl px-3 py-2 mb-4">
            ⚠️ Há produtos vendidos sem custo cadastrado — o CMV está subestimado e o
            lucro pode parecer maior do que é.
          </p>
        )}

        {meses.length === 0 ? (
          <p className="text-muted text-center py-10">Sem movimento nesse período.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-accent/30 bg-accent-soft/50 p-4 mb-4">
              <div className="text-sm text-accent-ink font-semibold mb-1">Resultado do período</div>
              <div className={`text-3xl font-extrabold tabular-nums ${tot.resultado >= 0 ? "text-good" : "text-danger"}`}>
                {formatarBRL(tot.resultado)}
              </div>
              <div className="text-xs text-muted mt-1">
                Receita {formatarBRL(tot.receita)} · CMV {formatarBRL(tot.cmv)} · Despesas {formatarBRL(tot.despesas)}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {meses.map((d) => (
                <CartaoMes key={d.mes} d={d} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
