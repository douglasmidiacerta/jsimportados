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
