import { formatarBRL } from "@/lib/formato";
import type { ConferenciaSessao } from "@/lib/dados/tipos";

/**
 * Conferência em 3 pontas de uma sessão de caixa (decisão do dono):
 *  1. Dinheiro — esperado × contado × diferença (contagem física da gaveta);
 *  2. Pix — vendido na sessão × lançado na conta que recebe Pix;
 *  3. Cartão — por maquininha: bruto → taxa → líquido → recebido.
 */
export function ConferenciaTresPontas({ conf }: { conf: ConferenciaSessao }) {
  const { dinheiro, pix, cartao } = conf;
  const difDinheiro = dinheiro.diferenca ?? 0;
  const difPix = pix.vendido - pix.lancado_na_conta;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-ink tracking-tight mb-1">
        Conferência em 3 pontas
      </h2>
      <p className="text-sm text-muted mb-3">
        Cada meio conferido contra a sua fonte — gaveta, banco e adquirente.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Ponta 1: dinheiro */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💵</span>
            <span className="font-bold text-ink">Dinheiro (gaveta)</span>
          </div>
          {dinheiro.status === "fechado" ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <Linha rotulo="Esperado" valor={dinheiro.esperado ?? 0} />
              <Linha rotulo="Contado" valor={dinheiro.contado ?? 0} />
              <div className="border-t border-line my-1" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-ink">
                  {difDinheiro === 0 ? "Bateu" : difDinheiro > 0 ? "Sobrou" : "Faltou"}
                </span>
                <span className={`font-extrabold tabular-nums ${cor(difDinheiro)}`}>
                  {formatarBRL(Math.abs(difDinheiro))}
                </span>
              </div>
              {difDinheiro !== 0 && dinheiro.justificativa && (
                <p className="text-xs text-muted mt-1">{dinheiro.justificativa}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Caixa ainda aberto — feche para conferir.</p>
          )}
        </div>

        {/* Ponta 2: Pix */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚡</span>
            <span className="font-bold text-ink">Pix (banco)</span>
          </div>
          {pix.conta ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <Linha rotulo="Vendido no Pix" valor={pix.vendido} />
              <Linha rotulo={`Caiu em ${pix.conta}`} valor={pix.lancado_na_conta} />
              <div className="border-t border-line my-1" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-ink">
                  {difPix === 0 ? "Bateu" : "Divergência"}
                </span>
                <span className={`font-extrabold tabular-nums ${cor(-Math.abs(difPix))}`}>
                  {formatarBRL(Math.abs(difPix))}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Nenhuma conta marcada como “recebe Pix”. Configure em Contas.
            </p>
          )}
        </div>

        {/* Ponta 3: cartão por maquininha */}
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💳</span>
            <span className="font-bold text-ink">Cartão (adquirente)</span>
          </div>
          {cartao.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma venda no cartão nesta sessão.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {cartao.map((m) => (
                <div key={m.maquininha} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{m.maquininha}</span>
                    <span className="text-xs text-muted">{m.vendas} venda(s)</span>
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    <Linha rotulo="Bruto" valor={m.bruto} />
                    <Linha rotulo="Taxa (MDR)" valor={-m.taxa} />
                    <Linha rotulo="Líquido a receber" valor={m.liquido} forte />
                    {m.recebido > 0 && <Linha rotulo="Já recebido" valor={m.recebido} />}
                  </div>
                  {m.parcelas_abertas > 0 && (
                    <p className="text-xs text-muted mt-1">
                      {m.parcelas_abertas} parcela(s) ainda a receber
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function cor(v: number) {
  return v === 0 ? "text-good" : v > 0 ? "text-amber" : "text-danger";
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={forte ? "font-semibold text-ink" : "text-muted"}>{rotulo}</span>
      <span className={`tabular-nums ${forte ? "font-bold text-ink" : "text-ink"}`}>
        {formatarBRL(valor)}
      </span>
    </div>
  );
}
