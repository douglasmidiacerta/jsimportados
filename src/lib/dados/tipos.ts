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
  aniversario: string | null; // Fase 7 (YYYY-MM-DD)
  lista_preco_id: string | null; // Fase 7: lista de preço padrão do cliente
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
  preco_venda: number; // = preço da lista padrão (Varejo)
  precos: Record<string, number>; // Fase 7: lista_id -> preço override (só listas != padrão)
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
  valor_recebido: number; // Fase 6: denorm do ledger recebimentos
  saldo: number; // Fase 6: valor_liquido - valor_recebido (derivado)
  taxa_percentual: number | null;
  vencimento: string;
  liquidado_em: string | null; // Fase 6
  status: "aberto" | "liquidado" | "cancelado";
};

export type TaxaCartao = {
  modalidade: "debito" | "credito";
  parcelas: number;
  percentual: number;
  prazo_dias: number;
  ativo: boolean;
};

// ============================ Fase 5: Caixa ============================

export type CaixaStatus = "aberto" | "fechado";
export type CaixaTipoMov = "venda" | "sangria" | "suprimento" | "ajuste";
export type CaixaMeio = "dinheiro" | "pix";

export type CaixaSessao = {
  id: string;
  status: CaixaStatus;
  valor_abertura: number;
  valor_contado: number | null;
  esperado_dinheiro: number | null;
  diferenca: number | null;
  observacoes_abertura: string | null;
  observacoes_fechamento: string | null;
  aberto_por: string | null;
  aberto_em: string;
  fechado_em: string | null;
};

/** Sessão com os totais recomputados (view vw_caixa_resumo). */
export type CaixaResumo = CaixaSessao & {
  vendas_dinheiro: number;
  vendas_pix: number;
  suprimentos: number;
  sangrias: number; // negativo
  ajustes: number;
  esperado_dinheiro_atual: number;
  n_movimentos: number;
};

/**
 * Subconjunto seguro para o painel da OPERAÇÃO (balcão). NÃO inclui
 * esperado_dinheiro_atual / esperado_dinheiro: entregar o total esperado ao
 * cliente da operação furaria a contagem às cegas do fechamento. O painel
 * mostra só os componentes (abertura, vendas, colocado, tirado).
 */
export type CaixaPainel = Pick<
  CaixaResumo,
  | "id"
  | "status"
  | "valor_abertura"
  | "aberto_em"
  | "vendas_dinheiro"
  | "vendas_pix"
  | "suprimentos"
  | "sangrias"
>;

export type CaixaMovimento = {
  id: string;
  sessao_id: string;
  tipo: CaixaTipoMov;
  meio: CaixaMeio;
  valor: number; // assinado
  venda_id: string | null;
  observacoes: string | null;
  criado_em: string;
};

/** Retorno da RPC fechar_caixa (revelação inline). */
export type FechamentoResumo = {
  sessao_id: string;
  esperado: number;
  contado: number;
  diferenca: number;
  vendas_dinheiro: number;
  vendas_pix: number;
  suprimentos: number;
  sangrias: number;
  ajustes: number;
  cartao: number;
  fiado: number;
};

/** Estado do formulário de fechamento (mostra o resumo revelado no sucesso). */
export type EstadoFechar = { erro?: string; resumo?: FechamentoResumo };

// ========================== Fase 6: Financeiro ==========================

export type TipoContaPagar = "compra" | "despesa";
export type StatusContaPagar = "aberto" | "pago" | "cancelado";
export type FormaFinanceira =
  | "dinheiro"
  | "pix"
  | "cartao"
  | "transferencia"
  | "boleto"
  | "outro";

export type DespesaCategoria = { id: string; nome: string; ativo: boolean };

export type ContaPagar = {
  id: string;
  tipo: TipoContaPagar;
  categoria_id: string | null;
  categoria_nome: string | null;
  fornecedor_id: string | null;
  fornecedor_nome: string | null;
  compra_id: string | null;
  descricao: string;
  valor: number;
  competencia: string;
  vencimento: string;
  status: StatusContaPagar;
  valor_pago: number;
  saldo: number; // derivado: valor - valor_pago
  pago_em: string | null;
  observacoes: string | null;
  parcial: boolean; // status 'aberto' && valor_pago > 0
  vencida: boolean; // vencimento < hoje && status 'aberto'
};

export type Pagamento = {
  id: string;
  conta_pagar_id: string;
  data_pagamento: string;
  valor: number; // >0 pagamento; <0 estorno
  forma_pagamento: FormaFinanceira | null;
  estorno_de: string | null;
  observacoes: string | null;
  criado_em: string;
};

export type Recebimento = {
  id: string;
  conta_receber_id: string;
  data_recebimento: string;
  valor: number; // líquido; <0 estorno
  forma_pagamento: FormaFinanceira | null;
  estorno_de: string | null;
  observacoes: string | null;
  criado_em: string;
};

/** Conta a pagar com o histórico de pagamentos (detalhe). */
export type ContaPagarDetalhe = ContaPagar & { pagamentos: Pagamento[] };

/** Conta a receber com o histórico de recebimentos (detalhe). */
export type ContaReceberDetalhe = ContaReceber & { recebimentos: Recebimento[] };

export type DespesaPayload = {
  categoria_id: string | null;
  fornecedor_id: string | null;
  descricao: string;
  valor: number;
  competencia: string | null;
  vencimento: string | null;
  pagar_agora?: boolean;
  forma_pagamento?: string | null;
  observacoes?: string | null;
};

export type ExtratoOrigem =
  | "saldo_inicial"
  | "venda"
  | "recebimento"
  | "pagamento";

export type ExtratoLinha = {
  data: string;
  origem: ExtratoOrigem;
  descricao: string;
  entrada: number;
  saida: number;
  valor: number;
  ref_id: string | null;
  saldo: number;
};

export type Extrato = {
  linhas: ExtratoLinha[];
  abertura: number;
  entradas: number;
  saidas: number;
  saldo_final: number;
};

export type DreMes = {
  mes: string;
  receita_produtos: number;
  cmv: number;
  cmv_completo: boolean;
  lucro_bruto: number;
  despesas_operacionais: number;
  taxas_cartao: number;
  juros_fiado: number;
  resultado: number;
};

export type FinanceiroConfig = { saldo_inicial: number; data_inicial: string };

// ===================== Fase 7: CRM & Listas de Preço =====================

export type ListaPreco = {
  id: string;
  nome: string;
  is_default: boolean;
  ativo: boolean;
  ordem: number;
};

export type Etiqueta = {
  id: string;
  nome: string;
  cor: string; // token: accent | good | amber | danger
  ativo: boolean;
};

export type CrmTipo = "nota" | "lembrete" | "ligacao" | "whatsapp";

export const TIPOS_INTERACAO: { valor: CrmTipo; rotulo: string }[] = [
  { valor: "nota", rotulo: "Anotação" },
  { valor: "lembrete", rotulo: "Lembrete" },
  { valor: "ligacao", rotulo: "Ligação" },
  { valor: "whatsapp", rotulo: "WhatsApp" },
];

export type CrmInteracao = {
  id: string;
  cliente_id: string;
  tipo: CrmTipo;
  texto: string;
  lembrete_em: string | null;
  concluido: boolean;
  criado_em: string;
};

export type CrmLembretePendente = CrmInteracao & { cliente_nome: string };

export type CarteiraCliente = {
  cliente_id: string;
  nome: string;
  telefone: string | null;
  n_compras: number;
  total_comprado: number;
  ultima_compra: string | null;
  ticket_medio: number;
  ranking: number;
};

export type Aniversariante = {
  cliente_id: string;
  nome: string;
  telefone: string | null;
  aniversario: string;
  mes: number;
  dia: number;
};

/** Linha do editor de preços por lista (matriz de uma lista). */
export type PrecoProdutoLista = {
  produto_id: string;
  nome: string;
  preco_venda: number; // Varejo (referência)
  override: number | null; // preço específico da lista (null = herda Varejo)
  preco_efetivo: number;
};

// ======================== Fase 8: Relatórios ========================

export type ProdutoLucro = {
  produto_id: string;
  nome: string;
  quantidade: number;
  faturamento: number;
  custo: number;
  lucro: number;
  margem: number; // fração 0..1
  custo_incompleto: boolean;
};

export type VendasResumo = {
  n_vendas: number;
  faturamento: number;
  custo: number;
  lucro: number;
  desconto: number;
  juros: number;
  ticket_medio: number;
  custo_completo: boolean;
};

export type VendaDia = {
  dia: string;
  n_vendas: number;
  faturamento: number;
  lucro: number;
};

export type VendaForma = {
  forma: string;
  n_vendas: number;
  faturamento: number;
  lucro: number;
};

export type EstoqueParado = {
  produto_id: string;
  nome: string;
  estoque_atual: number;
  custo: number | null;
  valor_parado: number;
  custo_ausente: boolean;
};

export type ClientePeriodo = {
  cliente_id: string;
  nome: string;
  n_compras: number;
  faturamento: number;
  lucro: number;
  ticket_medio: number;
  custo_completo: boolean;
};

export type EmAbertoResumo = {
  receber: { total: number; vencido: number; n: number; nVencidas: number };
  pagar: { total: number; vencido: number; n: number; nVencidas: number };
  saldo: number;
};
