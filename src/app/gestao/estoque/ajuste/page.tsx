import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirGestao } from "@/lib/perfil";
import { criarClienteServidor } from "@/lib/supabase/server";
import { listarProdutos } from "@/lib/dados/produtos";
import { formatarQtd, parseMoedaBR } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { AvisoErro } from "@/components/cadastros/AvisoErro";

async function ajustarAction(fd: FormData): Promise<void> {
  "use server";
  await exigirGestao();
  const produtoId = String(fd.get("produto_id") ?? "");
  const direcao = String(fd.get("direcao") ?? "saida");
  const qtd = parseMoedaBR(String(fd.get("quantidade") ?? ""));
  const motivo = String(fd.get("motivo") ?? "outro");
  const obs = String(fd.get("observacoes") ?? "").trim() || null;

  const volta = (e: string) => redirect(`/gestao/estoque/ajuste?erro=${encodeURIComponent(e)}`);
  if (!produtoId) volta("Escolha o produto.");
  if (!(qtd > 0)) volta("Informe uma quantidade maior que zero.");

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("ajustar_estoque", {
    p_produto: produtoId,
    p_quantidade: direcao === "saida" ? -qtd : qtd,
    p_motivo: motivo,
    p_observacoes: obs,
  });
  if (error) volta("Não deu para ajustar. Confira e tente de novo.");

  revalidatePath("/gestao/estoque");
  revalidatePath("/balcao/estoque");
  redirect("/gestao/estoque");
}

export default async function AjusteEstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const perfil = await exigirGestao();
  const { erro } = await searchParams;
  const produtos = await listarProdutos();

  const CAMPO =
    "w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink outline-none focus:border-accent appearance-none";

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Ajuste de estoque"
          descricao="Perda, quebra ou acerto de inventário — sempre com motivo (fica na auditoria)."
          voltarHref="/gestao/estoque"
        />
        <AvisoErro mensagem={erro} />

        <form action={ajustarAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Produto *</span>
            <select name="produto_id" required className={CAMPO}>
              <option value="">Escolha…</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} (saldo {formatarQtd(p.estoque_atual)})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Tipo</span>
              <select name="direcao" className={CAMPO}>
                <option value="saida">Tirar do estoque (−)</option>
                <option value="entrada">Colocar no estoque (+)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Quantidade *</span>
              <input name="quantidade" required inputMode="decimal" placeholder="Ex.: 2" className={CAMPO} />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Motivo *</span>
            <select name="motivo" className={CAMPO}>
              <option value="perda">Perda (sumiu/extraviou)</option>
              <option value="quebra">Quebra / danificado</option>
              <option value="inventario">Acerto de inventário (contagem)</option>
              <option value="outro">Outro</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Observações</span>
            <input name="observacoes" placeholder="Detalhe o que houve (opcional)" className={CAMPO} />
          </label>

          <button
            type="submit"
            className="h-14 rounded-xl bg-accent text-white text-lg font-bold shadow-[var(--shadow)] active:scale-[0.99]"
          >
            Registrar ajuste
          </button>
          <p className="text-xs text-muted">
            O ajuste vira uma linha no histórico do estoque (nunca apaga nada) e
            aparece no relatório de perdas. O custo médio não é alterado.
          </p>
        </form>
      </main>
    </>
  );
}
