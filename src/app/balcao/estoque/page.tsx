import { exigirPerfil } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { EmBreve } from "@/components/EmBreve";

export default async function Page() {
  const perfil = await exigirPerfil();
  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <EmBreve
        titulo="Estoque"
        descricao="Ver e ajustar o estoque chega na próxima fase — com busca por produto e saldo atual."
        voltarHref="/balcao"
      />
    </>
  );
}
