import { criarClienteServidor } from "@/lib/supabase/server";
import type {
  Fornecedor,
  FornecedorDetalhe,
  FornecedorDocumento,
  ParcelasFornecedor,
} from "./tipos";
import { listarContasPagar } from "./financeiro";
import { hojeBRT } from "./financeiro";

const COLUNAS =
  "id, nome, contato, telefone, cidade, pais, observacoes, ativo, tipo_pessoa, situacao, razao_social, nome_fantasia, documento, celular, email, site, eh_transportadora";

/**
 * Lista fornecedores (só ativos por padrão). Só gestão enxerga (RLS).
 * paraSelecao=true exclui os BLOQUEADOS (para escolher em compra/despesa).
 */
export async function listarFornecedores(
  busca?: string,
  incluirInativos = false,
  paraSelecao = false,
): Promise<Fornecedor[]> {
  const supabase = await criarClienteServidor();
  let query = supabase.from("fornecedores").select(COLUNAS).order("nome");
  if (!incluirInativos) query = query.eq("ativo", true);
  if (paraSelecao) query = query.eq("situacao", "geral");
  if (busca && busca.trim()) query = query.ilike("nome", `%${busca.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Fornecedor[];
}

type LinhaFilho = Record<string, unknown> & { ordem?: number | null };
function ordenar<T extends LinhaFilho>(arr: T[] | null | undefined): T[] {
  return (arr ?? [])
    .slice()
    .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0));
}

/** Fornecedor com as coleções filhas + links assinados dos documentos. */
export async function obterFornecedor(
  id: string,
): Promise<FornecedorDetalhe | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("fornecedores")
    .select(
      `${COLUNAS}, fornecedor_enderecos(*), fornecedor_contatos(*), fornecedor_bancos(*), fornecedor_documentos(*)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const enderecos = ordenar(row.fornecedor_enderecos as LinhaFilho[]).map((e) => ({
    cep: (e.cep as string) ?? null,
    logradouro: (e.logradouro as string) ?? null,
    numero: (e.numero as string) ?? null,
    complemento: (e.complemento as string) ?? null,
    bairro: (e.bairro as string) ?? null,
    cidade: (e.cidade as string) ?? null,
    uf: (e.uf as string) ?? null,
    exterior: Boolean(e.exterior),
  }));
  const contatos = ordenar(row.fornecedor_contatos as LinhaFilho[]).map((c) => ({
    nome: (c.nome as string) ?? null,
    cargo: (c.cargo as string) ?? null,
    telefone: (c.telefone as string) ?? null,
    email: (c.email as string) ?? null,
  }));
  const bancos = ordenar(row.fornecedor_bancos as LinhaFilho[]).map((b) => ({
    tipo: (b.tipo as string) ?? null,
    banco: (b.banco as string) ?? null,
    agencia: (b.agencia as string) ?? null,
    agencia_digito: (b.agencia_digito as string) ?? null,
    conta: (b.conta as string) ?? null,
    conta_digito: (b.conta_digito as string) ?? null,
  }));

  // Documentos vivem num bucket PRIVADO -> gera link assinado (1h) para exibir.
  const docsRaw = ordenar(row.fornecedor_documentos as LinhaFilho[]);
  const documentos: FornecedorDocumento[] = await Promise.all(
    docsRaw.map(async (d) => {
      const arquivo_path = String(d.arquivo_path ?? "");
      let url: string | null = null;
      if (arquivo_path) {
        const { data: signed } = await supabase.storage
          .from("fornecedor-docs")
          .createSignedUrl(arquivo_path, 3600);
        url = signed?.signedUrl ?? null;
      }
      return {
        tipo: (d.tipo as string) ?? null,
        descricao: (d.descricao as string) ?? null,
        arquivo_path,
        tipo_arquivo: (d.tipo_arquivo as string) ?? null,
        url,
      };
    }),
  );

  const f: FornecedorDetalhe = {
    ...(row as unknown as Fornecedor),
    enderecos,
    contatos,
    bancos,
    documentos,
  };
  return f;
}

/**
 * Parcelas (contas a pagar) de um fornecedor, agrupadas para o financeiro por
 * fornecedor: vencidas, a vencer e pagas, com os totais.
 */
export async function parcelasDoFornecedor(
  fornecedorId: string,
): Promise<ParcelasFornecedor> {
  const todas = await listarContasPagar({ fornecedorId });
  const hoje = hojeBRT();
  const vencidas = todas.filter(
    (c) => c.status === "aberto" && c.vencimento < hoje,
  );
  const aVencer = todas.filter(
    (c) => c.status === "aberto" && c.vencimento >= hoje,
  );
  const pagas = todas.filter((c) => c.status === "pago");
  const soma = (arr: typeof todas, campo: "saldo" | "valor_pago") =>
    Math.round(arr.reduce((s, c) => s + c[campo], 0) * 100) / 100;
  return {
    vencidas,
    aVencer,
    pagas,
    totalVencidas: soma(vencidas, "saldo"),
    totalAVencer: soma(aVencer, "saldo"),
    totalPagas: soma(pagas, "valor_pago"),
  };
}
