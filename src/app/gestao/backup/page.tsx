import { exigirGestao } from "@/lib/perfil";
import { listarProdutos } from "@/lib/dados/produtos";
import { listarClientes } from "@/lib/dados/clientes";
import { listarFornecedores } from "@/lib/dados/fornecedores";
import { listarVendasGestao } from "@/lib/dados/vendas";
import { listarCompras } from "@/lib/dados/compras";
import { codProduto, numVenda, numCompra } from "@/lib/formato";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { ExportarCSV } from "@/components/ExportarCSV";

export default async function BackupPage() {
  const perfil = await exigirGestao();
  const [produtos, clientes, fornecedores, vendas, compras] = await Promise.all([
    listarProdutos(undefined, true),
    listarClientes(undefined, true),
    listarFornecedores(undefined, true),
    listarVendasGestao(),
    listarCompras(),
  ]);

  const tabelas = [
    {
      nome: "Produtos",
      qtd: produtos.length,
      colunas: ["Código", "Nome", "Categoria", "Cód. barras", "Custo médio", "Preço venda", "Estoque", "Mínimo", "Ativo"],
      linhas: produtos.map((p) => [
        codProduto(p.codigo_sequencial),
        p.nome,
        p.categoria_nome ?? "",
        p.codigo_barras ?? "",
        p.custo ?? "",
        p.preco_venda,
        p.estoque_atual,
        p.estoque_minimo,
        p.ativo ? "sim" : "não",
      ]),
    },
    {
      nome: "Clientes",
      qtd: clientes.length,
      colunas: ["Nome", "Telefone", "E-mail", "Documento", "Cidade", "UF", "Limite fiado", "Deve (fiado)", "Situação"],
      linhas: clientes.map((c) => [
        c.nome,
        c.telefone ?? "",
        c.email ?? "",
        c.documento ?? "",
        c.cidade ?? "",
        c.uf ?? "",
        c.limite_credito ?? "",
        c.saldo_devedor ?? 0,
        c.situacao,
      ]),
    },
    {
      nome: "Fornecedores",
      qtd: fornecedores.length,
      colunas: ["Nome", "Documento", "Telefone", "E-mail", "Cidade", "País", "Ativo"],
      linhas: fornecedores.map((f) => [
        f.nome,
        f.documento ?? "",
        f.telefone ?? "",
        f.email ?? "",
        f.cidade ?? "",
        f.pais ?? "",
        f.ativo ? "sim" : "não",
      ]),
    },
    {
      nome: "Vendas",
      qtd: vendas.length,
      colunas: ["Nº", "Data", "Cliente", "Forma", "Total", "Custo", "Lucro", "Situação"],
      linhas: vendas.map((v) => [
        numVenda(v.numero),
        v.data_venda,
        v.cliente_nome ?? "Balcão",
        v.forma_pagamento,
        v.total,
        v.custo_total,
        v.lucro_bruto,
        v.status,
      ]),
    },
    {
      nome: "Compras",
      qtd: compras.length,
      colunas: ["Nº", "Data", "Fornecedor", "Moeda", "Total (R$)", "Situação"],
      linhas: compras.map((c) => [
        numCompra(c.numero),
        c.data_compra,
        c.fornecedor_nome ?? "",
        c.moeda,
        c.total_geral_brl,
        c.status,
      ]),
    },
  ];

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Backup / Exportar"
          descricao="Baixe seus dados em CSV (abre no Excel). Guarde uma cópia de vez em quando."
          voltarHref="/gestao"
        />

        <div className="rounded-2xl border border-line bg-surface divide-y divide-line">
          {tabelas.map((t) => (
            <div key={t.nome} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{t.nome}</span>
                <span className="block text-sm text-muted">{t.qtd} registro(s)</span>
              </span>
              <ExportarCSV nomeArquivo={t.nome.toLowerCase()} colunas={t.colunas} linhas={t.linhas} />
            </div>
          ))}
        </div>

        <p className="text-xs text-muted mt-4">
          Cada arquivo é uma “foto” de agora. Para um backup completo do banco, o
          Supabase também mantém cópias automáticas — isto aqui é a sua cópia fácil
          de abrir e conferir.
        </p>
      </main>
    </>
  );
}
