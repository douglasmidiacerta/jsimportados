import { exigirPerfil } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { EmBreve } from "@/components/EmBreve";

export default async function Page() {
  const perfil = await exigirPerfil();
  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <EmBreve
        titulo="Caixa"
        descricao="Abrir e fechar o caixa chega na próxima fase — com sangria, suprimento e fechamento do dia."
        voltarHref="/balcao"
      />
    </>
  );
}
