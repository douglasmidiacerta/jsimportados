/** Tipos das entidades de cadastro (Fase 2). */

export type Categoria = {
  id: string;
  nome: string;
  ativo: boolean;
};

export type Produto = {
  id: string;
  nome: string;
  categoria_id: string | null;
  unidade: string;
  preco_venda: number;
  custo: number | null;
  estoque_atual: number;
  foto_path: string | null;
  observacoes: string | null;
  ativo: boolean;
};

/** Produto com o nome da categoria embutido (para listagens). */
export type ProdutoLista = Produto & {
  categoria_nome: string | null;
};

export type Fornecedor = {
  id: string;
  nome: string;
  contato: string | null;
  telefone: string | null;
  cidade: string | null;
  pais: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  documento: string | null;
  observacoes: string | null;
  ativo: boolean;
};

/** Estado retornado pelas Server Actions de formulário. */
export type EstadoForm = { erro?: string };

/** Unidades de venda disponíveis (rótulo amigável -> valor gravado). */
export const UNIDADES: { valor: string; rotulo: string }[] = [
  { valor: "un", rotulo: "Unidade" },
  { valor: "cx", rotulo: "Caixa" },
  { valor: "pct", rotulo: "Pacote" },
  { valor: "dz", rotulo: "Dúzia" },
  { valor: "par", rotulo: "Par" },
  { valor: "kg", rotulo: "Quilo (kg)" },
  { valor: "g", rotulo: "Grama (g)" },
  { valor: "l", rotulo: "Litro (L)" },
  { valor: "ml", rotulo: "Mililitro (ml)" },
  { valor: "m", rotulo: "Metro (m)" },
];

/** Rótulo curto de uma unidade (ex.: "un", "kg"). */
export function rotuloUnidade(valor: string): string {
  return UNIDADES.find((u) => u.valor === valor)?.rotulo ?? valor;
}

// ============================ Fase 3: Compra / Estoque ============================

export type Moeda = "USD" | "PYG" | "BRL";

export const MOEDAS: { valor: Moeda; rotulo: string; simbolo: string }[] = [
  { valor: "USD", rotulo: "Dólar (US$)", simbolo: "US$" },
  { valor: "PYG", rotulo: "Guarani (G$)", simbolo: "G$" },
  { valor: "BRL", rotulo: "Real (R$)", simbolo: "R$" },
];

export function simboloMoeda(m: Moeda): string {
  return MOEDAS.find((x) => x.valor === m)?.simbolo ?? m;
}

/** Cabeçalho de compra (para listagem). */
export type Compra = {
  id: string;
  fornecedor_id: string | null;
  moeda: Moeda;
  cambio: number;
  data_compra: string;
  observacoes: string | null;
  total_itens_brl: number;
  total_despesas_brl: number;
  total_geral_brl: number;
  criado_em: string;
};

export type CompraItem = {
  id: string;
  produto_id: string;
  produto_nome: string | null;
  quantidade: number;
  custo_origem_unit: number;
  custo_item_brl: number;
  rateio_despesa: number;
  custo_total_brl: number;
  custo_real_unitario: number;
};

export type CompraDespesa = {
  id: string;
  descricao: string;
  valor_brl: number;
};

/** Compra com itens, despesas e fornecedor (recibo). */
export type CompraDetalhe = Compra & {
  fornecedor_nome: string | null;
  itens: CompraItem[];
  despesas: CompraDespesa[];
};

/** Produto no estoque do balcão (SEM custo). */
export type EstoqueBalcaoItem = {
  id: string;
  nome: string;
  unidade: string;
  foto_path: string | null;
  categoria_nome: string | null;
  estoque_atual: number;
};

/** Produto no estoque da gestão (com custo e valor parado). */
export type EstoqueGestaoItem = {
  id: string;
  nome: string;
  unidade: string;
  categoria_nome: string | null;
  estoque_atual: number;
  custo: number | null;
  valor_em_estoque: number;
};

// Entradas do formulário de compra (enviadas cruas ao servidor via RPC)
export type ItemCompraInput = {
  produto_id: string;
  quantidade: number;
  custo_origem: number;
};

export type DespesaInput = {
  descricao: string;
  valor_brl: number;
};

export type CompraPayload = {
  fornecedor_id: string | null;
  moeda: Moeda;
  cambio: number;
  data_compra: string;
  observacoes: string | null;
  itens: ItemCompraInput[];
  despesas: DespesaInput[];
};
