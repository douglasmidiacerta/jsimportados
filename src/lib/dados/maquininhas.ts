import { criarClienteServidor } from "@/lib/supabase/server";
import type { Maquininha, MaquininhaTaxa } from "./tipos";

const n = (v: unknown) => Number(v ?? 0);

function normalizar(r: Record<string, unknown>): Maquininha {
  return {
    id: String(r.id),
    nome: String(r.nome),
    adquirente: (r.adquirente as string) ?? null,
    observacoes: (r.observacoes as string) ?? null,
    ativo: Boolean(r.ativo),
  };
}

/** Todas as maquininhas (gestão). */
export async function listarMaquininhas(): Promise<Maquininha[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("maquininhas")
    .select("id, nome, adquirente, observacoes, ativo")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r) => normalizar(r as Record<string, unknown>));
}

/** Só as ativas — para o seletor do PDV (visível também à operação). */
export async function listarMaquininhasAtivas(): Promise<Maquininha[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("maquininhas")
    .select("id, nome, adquirente, observacoes, ativo")
    .eq("ativo", true)
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((r) => normalizar(r as Record<string, unknown>));
}

export async function obterMaquininha(id: string): Promise<Maquininha | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("maquininhas")
    .select("id, nome, adquirente, observacoes, ativo")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizar(data as Record<string, unknown>) : null;
}

/** Taxas MDR próprias de uma maquininha. */
export async function listarTaxasMaquininha(
  maquininhaId: string,
): Promise<MaquininhaTaxa[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("maquininha_taxas")
    .select("maquininha_id, modalidade, parcelas, percentual, prazo_dias, ativo")
    .eq("maquininha_id", maquininhaId)
    .order("modalidade")
    .order("parcelas");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const t = r as Record<string, unknown>;
    return {
      maquininha_id: String(t.maquininha_id),
      modalidade: t.modalidade as "debito" | "credito",
      parcelas: n(t.parcelas),
      percentual: n(t.percentual),
      prazo_dias: n(t.prazo_dias),
      ativo: Boolean(t.ativo),
    };
  });
}

/** Cria/edita uma maquininha. Retorna { id, error }. */
export async function salvarMaquininha(m: {
  id?: string;
  nome: string;
  adquirente: string | null;
  observacoes: string | null;
  ativo: boolean;
}): Promise<{ id: string | null; error: { message?: string } | null }> {
  const supabase = await criarClienteServidor();
  if (m.id) {
    const { error } = await supabase
      .from("maquininhas")
      .update({ nome: m.nome, adquirente: m.adquirente, observacoes: m.observacoes, ativo: m.ativo })
      .eq("id", m.id);
    return { id: error ? null : m.id, error };
  }
  const { data, error } = await supabase
    .from("maquininhas")
    .insert({ nome: m.nome, adquirente: m.adquirente, observacoes: m.observacoes, ativo: m.ativo })
    .select("id")
    .single();
  return { id: data?.id ?? null, error };
}

/** Upsert das taxas de uma maquininha. */
export async function upsertTaxasMaquininha(
  maquininhaId: string,
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
    .from("maquininha_taxas")
    .upsert(
      linhas.map((l) => ({ ...l, maquininha_id: maquininhaId })),
      { onConflict: "maquininha_id,modalidade,parcelas" },
    );
  return { error };
}
