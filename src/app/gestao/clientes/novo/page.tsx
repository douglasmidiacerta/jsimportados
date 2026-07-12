import { exigirGestao } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { FormularioCliente } from "@/components/cadastros/FormularioCliente";
import { criarCliente } from "../actions";

export default async function NovoClientePage() {
  const perfil = await exigirGestao();
  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro titulo="Novo cliente" voltarHref="/gestao/clientes" />
        <FormularioCliente
          action={criarCliente}
          voltarHref="/gestao/clientes"
        />
      </main>
    </>
  );
}
