import { criarClienteServidor } from "@/lib/supabase/server";
import type { ContaReceber } from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

/** Lista contas a receber (gestão). Filtra por status se informado. */
export async function listarContasReceber(
  status?: "aberto" | "liquidado" | "cancelado",
): Promise<ContaReceber[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("contas_receber")
    .select("*, clientes(nome)")
    .order("vencimento");
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r) => {
    const cr = r as unknown as Record<string, unknown> & {
      clientes: { nome: string } | null;
    };
    return {
      id: String(cr.id),
      venda_id: String(cr.venda_id),
      cliente_id: (cr.cliente_id as string) ?? null,
      cliente_nome: cr.clientes?.nome ?? null,
      tipo: cr.tipo as "cartao" | "fiado",
      parcela_num: n(cr.parcela_num),
      parcela_total: n(cr.parcela_total),
      valor_bruto: n(cr.valor_bruto),
      valor_taxa: n(cr.valor_taxa),
      valor_liquido: n(cr.valor_liquido),
      taxa_percentual: cr.taxa_percentual == null ? null : n(cr.taxa_percentual),
      vencimento: String(cr.vencimento),
      status: cr.status as "aberto" | "liquidado" | "cancelado",
    };
  });
}
