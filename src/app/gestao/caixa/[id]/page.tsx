import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import {
  obterSessaoResumo,
  listarMovimentos,
  totaisAReceberDaSessao,
} from "@/lib/dados/caixa";
import { formatarBRL, formatarData } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import type { CaixaMovimento } from "@/lib/dados/tipos";

function rotuloMov(m: CaixaMovimento): string {
  if (m.tipo === "venda") return m.meio === "pix" ? "Venda (Pix)" : "Venda (dinheiro)";
  if (m.tipo === "sangria") return "Sangria (tirou)";
  if (m.tipo === "suprimento") return "Suprimento (colocou)";
  return "Ajuste";
}

export default async function CaixaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const perfil = await exigirGestao();
  const sessao = await obterSessaoResumo(id);
  if (!sessao) notFound();

  const [movimentos, aReceber] = await Promise.all([
    listarMovimentos(id),
    totaisAReceberDaSessao(id),
  ]);

  const fechado = sessao.status === "fechado";
  const dif = sessao.diferenca ?? 0;

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-3xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo={`Caixa de ${formatarData(sessao.aberto_em.slice(0, 10))}`}
          descricao={fechado ? "Fechado" : "Aberto"}
          voltarHref="/gestao/caixa"
        />

        {/* Resumo do dinheiro */}
        <div className="rounded-2xl border border-line bg-surface-2 p-4 flex flex-col gap-1.5 mb-5">
          <Linha rotulo="Abertura" valor={formatarBRL(sessao.valor_abertura)} />
          <Linha rotulo="Vendas em dinheiro" valor={formatarBRL(sessao.vendas_dinheiro)} />
          {sessao.suprimentos > 0 && <Linha rotulo="Dinheiro colocado" valor={formatarBRL(sessao.suprimentos)} />}
          {sessao.sangrias < 0 && <Linha rotulo="Dinheiro tirado" valor={formatarBRL(sessao.sangrias)} />}
          {sessao.ajustes !== 0 && <Linha rotulo="Ajustes" valor={formatarBRL(sessao.ajustes)} />}
          <div className="border-t border-line my-1" />
          <Linha
            rotulo={fechado ? "Esperado na gaveta" : "Esperado agora"}
            valor={formatarBRL(fechado ? (sessao.esperado_dinheiro ?? 0) : sessao.esperado_dinheiro_atual)}
            forte
          />
          {fechado && (
            <>
              <Linha rotulo="Contado" valor={formatarBRL(sessao.valor_contado ?? 0)} />
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">
                  {dif === 0 ? "Bateu" : dif > 0 ? "Sobrou" : "Faltou"}
                </span>
                <span className={`text-xl font-extrabold tabular-nums ${dif === 0 ? "text-good" : dif > 0 ? "text-amber" : "text-danger"}`}>
                  {formatarBRL(Math.abs(dif))}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Outros meios do dia */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Mini titulo="Pix" valor={formatarBRL(sessao.vendas_pix)} />
          <Mini titulo="Cartão" valor={formatarBRL(aReceber.cartao)} />
          <Mini titulo="Fiado" valor={formatarBRL(aReceber.fiado)} />
        </div>

        {/* Extrato */}
        <h2 className="text-lg font-bold text-ink tracking-tight mb-2">Movimentos</h2>
        {movimentos.length === 0 ? (
          <p className="text-muted text-sm">Nenhum movimento nesta sessão.</p>
        ) : (
          <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
            {movimentos.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-ink font-medium">{rotuloMov(m)}</span>
                  {m.observacoes && (
                    <span className="block text-xs text-muted truncate">{m.observacoes}</span>
                  )}
                </span>
                <span className={`tabular-nums font-semibold shrink-0 ${m.valor < 0 ? "text-danger" : "text-ink"}`}>
                  {m.valor < 0 ? "−" : "+"}
                  {formatarBRL(Math.abs(m.valor))}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={forte ? "font-bold text-ink" : "text-muted text-sm"}>{rotulo}</span>
      <span className={`tabular-nums ${forte ? "text-lg font-extrabold text-ink" : "text-ink font-semibold"}`}>
        {valor}
      </span>
    </div>
  );
}
function Mini({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-center">
      <div className="text-xs text-muted">{titulo}</div>
      <div className="text-ink font-bold tabular-nums mt-0.5">{valor}</div>
    </div>
  );
}
