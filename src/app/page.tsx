import { redirect } from "next/navigation";
import { exigirPerfil, inicioPorPapel } from "@/lib/perfil";

export default async function Home() {
  const perfil = await exigirPerfil();
  redirect(inicioPorPapel(perfil.papel));
}
