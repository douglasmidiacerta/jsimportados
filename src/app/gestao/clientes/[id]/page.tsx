import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/perfil";
import { obterCliente } from "@/lib/dados/clientes";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioCliente } from "@/components/cadastros/FormularioCliente";
import { AvisoErro, mensagemAtivo } from "@/components/cadastros/AvisoErro";
import { atualizarCliente, definirAtivoCliente } from "../actions";

export default async function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const perfil = await exigirGestao();
  const cliente = await obterCliente(id);
  if (!cliente) notFound();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Editar cliente"
          voltarHref="/gestao/clientes"
        />
        <AvisoErro mensagem={mensagemAtivo(erro)} />
        <FormularioCliente
          action={atualizarCliente}
          cliente={cliente}
          voltarHref="/gestao/clientes"
        />

        <div className="mt-10 pt-6 border-t border-line">
          <form action={definirAtivoCliente}>
            <input type="hidden" name="id" value={cliente.id} />
            <input
              type="hidden"
              name="ativo"
              value={cliente.ativo ? "false" : "true"}
            />
            <p className="text-sm text-muted mb-2">
              {cliente.ativo
                ? "Arquivar esconde o cliente das listas."
                : "Este cliente está arquivado."}
            </p>
            <button
              type="submit"
              className={
                cliente.ativo
                  ? "h-11 inline-flex items-center rounded-xl border border-[var(--danger)]/40 text-danger px-4 font-semibold hover:bg-[var(--danger)]/10 transition-colors"
                  : "h-11 inline-flex items-center rounded-xl border border-line text-ink px-4 font-semibold hover:bg-surface-2 transition-colors"
              }
            >
              {cliente.ativo ? "Arquivar cliente" : "Reativar cliente"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
