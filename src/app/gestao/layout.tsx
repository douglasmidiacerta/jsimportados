import { exigirGestao } from "@/lib/perfil";
import { SidebarGestao } from "@/components/SidebarGestao";

/**
 * Layout do Modo Gestão. No DESKTOP mostra o menu lateral fixo + conteúdo à
 * direita; no MOBILE o menu some (cada página mostra a BarraTopo). O
 * exigirGestao aqui protege toda a área e, via cache do perfil, não adiciona
 * ida extra ao servidor (a página reaproveita o mesmo resultado).
 */
export default async function GestaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const perfil = await exigirGestao();

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      <SidebarGestao nome={perfil.nome} />
      <div className="flex-1 flex flex-col min-w-0">{children}</div>
    </div>
  );
}
