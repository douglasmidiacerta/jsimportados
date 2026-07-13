import { criarClienteServidor } from "@/lib/supabase/server";
import type { ProdutoLista } from "./tipos";

type CustoEmbed = {
  custo: string | number | null;
  custo_ultima_compra?: string | number | null;
};
type NomeEmbed = { nome: string } | null;
type FotoEmbed = { path: string; ordem: number | string | null };

// Linha crua do PostgREST: campos podem faltar no caminho do balcão (projeção enxuta).
type LinhaProduto = {
  id: string;
  nome: string;
  categoria_id: string | null;
  subcategoria_id?: string | null;
  unidade: string;
  preco_venda: string | number;
  preco_atacado?: string | number | null;
  qtde_min_atacado?: string | number | null;
  estoque_atual?: string | number | null;
  marca?: string | null;
  modelo?: string | null;
  foto_path: string | null;
  observacoes: string | null;
  loja_ativo?: boolean | null;
  destaque_home?: boolean | null;
  vender_sem_estoque?: boolean | null;
  descricao?: string | null;
  garantia?: string | null;
  itens_inclusos?: string | null;
  especificacoes?: string | null;
  codigo_barras?: string | null;
  codigo_sequencial?: string | number | null;
  estoque_minimo?: string | number | null;
  ativo: boolean;
  categorias: NomeEmbed; // categoria (FK categoria_id) — mantém a chave 'categorias'
  subcategoria?: NomeEmbed; // FK subcategoria_id (alias)
  // custo vem da tabela isolada produtos_custo (só no caminho da gestão)
  produtos_custo?: CustoEmbed | CustoEmbed[] | null;
  produto_fotos?: FotoEmbed[] | null;
};

function num(v: string | number | null | undefined): number | null {
  return v == null ? null : Number(v);
}

function custoDoEmbed(pc: CustoEmbed | CustoEmbed[] | null | undefined) {
  const obj = Array.isArray(pc) ? pc[0] : pc;
  return {
    custo: obj?.custo == null ? null : Number(obj.custo),
    custo_ultima_compra:
      obj?.custo_ultima_compra == null ? null : Number(obj.custo_ultima_compra),
  };
}

function normalizarLinha(row: LinhaProduto): ProdutoLista {
  const c = custoDoEmbed(row.produtos_custo);
  const fotos = (row.produto_fotos ?? [])
    .slice()
    .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0))
    .map((f) => f.path);
  return {
    id: row.id,
    nome: row.nome,
    categoria_id: row.categoria_id,
    subcategoria_id: row.subcategoria_id ?? null,
    unidade: row.unidade,
    preco_venda: Number(row.preco_venda),
    preco_atacado: num(row.preco_atacado),
    qtde_min_atacado: num(row.qtde_min_atacado),
    // custo (médio e última compra) só existe no caminho da gestão; no balcão é null.
    custo: c.custo,
    custo_ultima_compra: c.custo_ultima_compra,
    estoque_atual: Number(row.estoque_atual ?? 0),
    marca: row.marca ?? null,
    modelo: row.modelo ?? null,
    foto_path: row.foto_path,
    observacoes: row.observacoes,
    loja_ativo: Boolean(row.loja_ativo),
    destaque_home: Boolean(row.destaque_home),
    vender_sem_estoque: row.vender_sem_estoque ?? true,
    descricao: row.descricao ?? null,
    garantia: row.garantia ?? null,
    itens_inclusos: row.itens_inclusos ?? null,
    especificacoes: row.especificacoes ?? null,
    codigo_barras: row.codigo_barras ?? null,
    codigo_sequencial: num(row.codigo_sequencial),
    estoque_minimo: Number(row.estoque_minimo ?? 0),
    ativo: row.ativo,
    categoria_nome: row.categorias?.nome ?? null,
    subcategoria_nome: row.subcategoria?.nome ?? null,
    fotos,
  };
}

// Gestão vê custo (médio + última compra), subcategoria e galeria. Dois FKs para
// categorias => desambiguar cada embed pelo nome da coluna FK (!categoria_id / !subcategoria_id).
const COLUNAS_GESTAO =
  "*, categorias!categoria_id(nome), subcategoria:categorias!subcategoria_id(nome), produtos_custo(custo, custo_ultima_compra), produto_fotos(path, ordem)";
// Balcão (operação): projeção SEM custo/margem — nunca trafega para a operação.
const COLUNAS_BALCAO =
  "id, nome, categoria_id, unidade, preco_venda, estoque_atual, foto_path, observacoes, ativo, categorias!categoria_id(nome)";

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
