import { exigirPerfil } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { EmBreve } from "@/components/EmBreve";

export default async function Page() {
  const perfil = await exigirPerfil();
  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <EmBreve
        titulo="Entrada de mercadoria"
        descricao="Registrar a chegada da mercadoria chega na próxima fase — ligada à compra e ao custo real."
        voltarHref="/balcao"
      />
    </>
  );
}
