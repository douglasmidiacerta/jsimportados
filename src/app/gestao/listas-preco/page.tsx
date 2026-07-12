import Link from "next/link";
import { exigirGestao } from "@/lib/perfil";
import { listarListasPreco } from "@/lib/dados/listasPreco";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { AvisoErro } from "@/components/cadastros/AvisoErro";
import { BotaoConfirmar } from "@/components/BotaoConfirmar";
import {
  tornarPadraoAction,
  definirAtivoListaAction,
  apagarListaAction,
} from "./actions";

export default async function ListasPrecoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const perfil = await exigirGestao();
  const { erro } = await searchParams;
  const listas = await listarListasPreco(true);

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Listas de preço"
          descricao="Varejo, atacado, promoção. A padrão usa o preço de venda do produto."
          voltarHref="/gestao/cadastros"
          novoHref="/gestao/listas-preco/novo"
          novoTexto="Nova lista"
        />
        <AvisoErro
          mensagem={
            erro === "guard"
              ? "A lista padrão não pode ser apagada nem desativada. Defina outra como padrão antes."
              : undefined
          }
        />

        <ul className="flex flex-col gap-2">
          {listas.map((l) => (
            <li
              key={l.id}
              className={`rounded-2xl border bg-surface p-4 ${l.ativo ? "border-line" : "border-line opacity-60"}`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-ink text-lg">{l.nome}</span>
                {l.is_default && (
                  <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white">
                    padrão
                  </span>
                )}
                {!l.ativo && (
                  <span className="text-[10px] font-mono uppercase tracking-wide text-muted">arquivada</span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3 flex-wrap text-sm">
                {!l.is_default && (
                  <Link href={`/gestao/listas-preco/${l.id}`} className="font-semibold text-accent-ink hover:underline">
                    Editar preços
                  </Link>
                )}
                {l.is_default && (
                  <span className="text-muted text-xs">Preços da padrão = preço de venda do produto</span>
                )}
                {!l.is_default && l.ativo && (
                  <form action={tornarPadraoAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button type="submit" className="text-xs font-semibold text-muted hover:text-ink">Tornar padrão</button>
                  </form>
                )}
                {!l.is_default && (
                  <form action={definirAtivoListaAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="ativo" value={l.ativo ? "false" : "true"} />
                    <button type="submit" className="text-xs font-semibold text-muted hover:text-ink">
                      {l.ativo ? "Arquivar" : "Reativar"}
                    </button>
                  </form>
                )}
                {!l.is_default && (
                  <BotaoConfirmar
                    action={apagarListaAction}
                    hidden={{ id: l.id }}
                    rotulo="Apagar"
                    confirmar={`Apagar a lista "${l.nome}"? Os preços dela serão removidos.`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
