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

// ============================ Fase 4: Vendas / PDV ============================

export type FormaPagamento = "dinheiro" | "pix" | "cartao" | "fiado";

export const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "pix", rotulo: "Pix" },
  { valor: "cartao", rotulo: "Cartão" },
  { valor: "fiado", rotulo: "Fiado (anotar)" },
];

export const MAX_PARCELAS = 18;

/** Produto disponível no PDV (com preço; SEM custo). */
export type ProdutoPDV = {
  id: string;
  nome: string;
  unidade: string;
  foto_path: string | null;
  categoria_nome: string | null;
  estoque_atual: number;
  preco_venda: number;
};

export type ItemVendaInput = {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
};

export type VendaPayload = {
  cliente_id: string | null;
  forma_pagamento: FormaPagamento;
  desconto: number;
  observacoes: string | null;
  itens: ItemVendaInput[];
  cartao?: { modalidade: "debito" | "credito"; parcelas: number };
  fiado?: { juros: number; prazo_dias: number; vencimento: string | null };
};

export type Venda = {
  id: string;
  cliente_id: string | null;
  forma_pagamento: FormaPagamento;
  data_venda: string;
  subtotal: number;
  desconto: number;
  juros: number;
  total: number;
  cartao_modalidade: "debito" | "credito" | null;
  cartao_parcelas: number | null;
  fiado_vencimento: string | null;
  status: "liquidado" | "a_receber";
  observacoes: string | null;
  criado_em: string;
};

export type VendaItem = {
  id: string;
  produto_id: string;
  produto_nome: string | null;
  produto_unidade: string | null;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
};

/** Recibo (operação): venda + itens, SEM custo. */
export type VendaDetalhe = Venda & {
  cliente_nome: string | null;
  itens: VendaItem[];
};

/** Venda na visão da gestão (com custo/lucro). */
export type VendaGestao = Venda & {
  cliente_nome: string | null;
  custo_total: number;
  custo_completo: boolean;
  lucro_bruto: number;
};

export type ContaReceber = {
  id: string;
  venda_id: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  tipo: "cartao" | "fiado";
  parcela_num: number;
  parcela_total: number;
  valor_bruto: number;
  valor_taxa: number;
  valor_liquido: number;
  taxa_percentual: number | null;
  vencimento: string;
  status: "aberto" | "liquidado" | "cancelado";
};

export type TaxaCartao = {
  modalidade: "debito" | "credito";
  parcelas: number;
  percentual: number;
  prazo_dias: number;
  ativo: boolean;
};
