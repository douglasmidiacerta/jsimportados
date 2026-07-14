import { redirect } from "next/navigation";

/**
 * O hub "CRM & Preços" foi dissolvido: as 4 telas dele já existiam em outro
 * lugar (Clientes e Listas de preço em Cadastros; Carteira e Aniversariantes
 * viraram relatórios) e os lembretes pendentes subiram para o Painel.
 * A rota fica de pé só para não quebrar favorito antigo.
 */
export default function CrmPage() {
  redirect("/gestao/clientes");
}
