import { exigirPerfil } from "@/lib/perfil";
import { BarraTopo } from "@/components/BarraTopo";
import { EmBreve } from "@/components/EmBreve";

export default async function Page() {
  const perfil = await exigirPerfil();
  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="balcao" />
      <EmBreve
        titulo="Vender"
        descricao="A tela de vendas chega na próxima fase — com produtos, formas de pagamento e recibo."
        voltarHref="/balcao"
      />
    </>
  );
}
