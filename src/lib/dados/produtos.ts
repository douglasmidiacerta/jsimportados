import { criarClienteServidor } from "@/lib/supabase/server";
import type { Produto, ProdutoLista } from "./tipos";

type CustoEmbed = { custo: string | number | null };

type LinhaProduto = Omit<Produto, "preco_venda" | "custo" | "estoque_atual"> & {
  preco_venda: string | number;
  estoque_atual?: string | number | null;
  categorias: { nome: string } | null;
  // custo vem da tabela isolada produtos_custo (só no caminho da gestão)
  produtos_custo?: CustoEmbed | CustoEmbed[] | null;
};

function custoDoEmbed(pc: CustoEmbed | CustoEmbed[] | null | undefined): number | null {
  const obj = Array.isArray(pc) ? pc[0] : pc;
  return obj?.custo == null ? null : Number(obj.custo);
}

function normalizarLinha(row: LinhaProduto): ProdutoLista {
  return {
    id: row.id,
    nome: row.nome,
    categoria_id: row.categoria_id,
    unidade: row.unidade,
    preco_venda: Number(row.preco_venda),
    // custo só existe no caminho da gestão (embed produtos_custo); no balcão é null.
    custo: custoDoEmbed(row.produtos_custo),
    estoque_atual: Number(row.estoque_atual ?? 0),
    foto_path: row.foto_path,
    observacoes: row.observacoes,
    ativo: row.ativo,
    categoria_nome: row.categorias?.nome ?? null,
  };
}

// Gestão pode ver o custo (join na tabela isolada produtos_custo).
const COLUNAS_GESTAO = "*, categorias(nome), produtos_custo(custo)";
// Balcão (operação): projeção SEM custo — o custo/margem nunca trafega para a operação.
const COLUNAS_BALCAO =
  "id, nome, categoria_id, unidade, preco_venda, estoque_atual, foto_path, observacoes, ativo, categorias(nome)";

/** Lista produtos para o Modo Gestão (inclui custo e nome da categoria). */
export async function listarProdutos(
  busca?: string,
  incluirInativos = false,
): Promise<ProdutoLista[]> {
  const supabase = await criarClienteServidor();
  let query = supabase.from("produtos").select(COLUNAS_GESTAO).order("nome");
  if (!incluirInativos) query = query.eq("ativo", true);
  if (busca && busca.trim()) query = query.ilike("nome", `%${busca.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as LinhaProduto[]).map(normalizarLinha);
}

/**
 * Lista produtos para o balcão (Modo Operação): só ativos, ordenados por nome,
 * SEM custo (projeção explícita). NÃO traz fornecedor.
 */
export async function listarProdutosBalcao(
  busca?: string,
): Promise<ProdutoLista[]> {
  const supabase = await criarClienteServidor();
  let query = supabase
    .from("produtos")
    .select(COLUNAS_BALCAO)
    .eq("ativo", true)
    .order("nome");
  if (busca && busca.trim()) query = query.ilike("nome", `%${busca.trim()}%`);

  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as LinhaProduto[]).map(normalizarLinha);
}

/** Obtém um produto por id (para edição na gestão — inclui custo). */
export async function obterProduto(id: string): Promise<ProdutoLista | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("produtos")
    .select(COLUNAS_GESTAO)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizarLinha(data as unknown as LinhaProduto);
}
