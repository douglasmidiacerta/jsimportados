import { criarClienteServidor } from "@/lib/supabase/server";
import type { TaxaCartao } from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

/** Lista as taxas de cartão configuradas (gestão). */
export async function listarTaxasCartao(): Promise<TaxaCartao[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("taxas_cartao")
    .select("modalidade, parcelas, percentual, prazo_dias, ativo")
    .order("modalidade")
    .order("parcelas");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const t = r as Record<string, unknown>;
    return {
      modalidade: t.modalidade as "debito" | "credito",
      parcelas: n(t.parcelas),
      percentual: n(t.percentual),
      prazo_dias: n(t.prazo_dias),
      ativo: Boolean(t.ativo),
    };
  });
}

/** Atualiza (upsert) as taxas de cartão. Só gestão (RLS). */
export async function upsertTaxasCartao(
  linhas: {
    modalidade: "debito" | "credito";
    parcelas: number;
    percentual: number;
    prazo_dias: number;
    ativo: boolean;
  }[],
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("taxas_cartao")
    .upsert(linhas, { onConflict: "modalidade,parcelas" });
  return { error };
}
