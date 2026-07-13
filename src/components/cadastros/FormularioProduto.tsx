"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CampoFormulario } from "./CampoFormulario";
import { CampoPreco } from "./CampoPreco";
import { FotoUpload } from "./FotoUpload";
import { GaleriaFotos } from "./GaleriaFotos";
import { Interruptor } from "./Interruptor";
import { SeletorCategorias } from "./SeletorCategorias";
import { MargensProduto } from "./MargensProduto";
import { BotaoSalvar } from "./BotaoSalvar";
import { numeroParaCampoBR, formatarBRL, formatarQtd } from "@/lib/formato";
import {
  UNIDADES,
  type Categoria,
  type ProdutoLista,
  type EstadoForm,
} from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;
type CriarCategoria = (
  nome: string,
  parentId: string | null,
) => Promise<{ categoria?: Categoria; erro?: string }>;

/**
 * Formulário de produto. modo="balcao" = versão enxuta (nome, categoria, preço)
 * para o Modo Operação. modo="gestao" = ficha completa (Produto 2.0): sub-
 * categoria, marca/modelo, atacado, margens ao vivo, loja virtual e galeria.
 */
export function FormularioProduto({
  action,
  categorias,
  produto,
  modo = "gestao",
  voltarHref,
  onCriarCategoria,
}: {
  action: Acao;
  categorias: Categoria[];
  produto?: ProdutoLista;
  modo?: "gestao" | "balcao";
  voltarHref: string;
  onCriarCategoria?: CriarCategoria;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const completo = modo === "gestao";

  // Preços em estado para as margens ao vivo.
  const [precoVarejo, setPrecoVarejo] = useState(produto?.preco_venda ?? 0);
  const [precoAtacado, setPrecoAtacado] = useState(produto?.preco_atacado ?? 0);

  // Garante que a categoria/subcategoria atuais apareçam mesmo se arquivadas.
  const listaCategorias = [...categorias];
  const injetar = (id: string | null | undefined, nome: string | null, parent: string | null) => {
    if (id && !listaCategorias.some((c) => c.id === id)) {
      listaCategorias.push({ id, nome: `${nome ?? "Categoria"} (arquivada)`, ativo: false, parent_id: parent });
    }
  };
  injetar(produto?.categoria_id, produto?.categoria_nome ?? null, null);
  injetar(produto?.subcategoria_id, produto?.subcategoria_nome ?? null, produto?.categoria_id ?? null);

  const opcoesTopo = listaCategorias
    .filter((c) => c.parent_id == null)
    .map((c) => ({ valor: c.id, rotulo: c.nome }));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {produto && <input type="hidden" name="id" value={produto.id} />}

      <CampoFormulario
        label="Nome do produto"
        name="nome"
        defaultValue={produto?.nome}
        placeholder="Ex.: Perfume 212 VIP"
        required
      />

      {/* Categoria / subcategoria */}
      {completo && onCriarCategoria ? (
        <SeletorCategorias
          categoriasIniciais={listaCategorias}
          defaultCategoriaId={produto?.categoria_id}
          defaultSubcategoriaId={produto?.subcategoria_id}
          onCriar={onCriarCategoria}
        />
      ) : (
        <CampoFormulario
          label="Categoria"
          name="categoria_id"
          as="select"
          defaultValue={produto?.categoria_id ?? ""}
          opcoes={opcoesTopo}
          opcaoVazia="Sem categoria"
        />
      )}

      {completo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoFormulario label="Marca (opcional)" name="marca" defaultValue={produto?.marca ?? ""} placeholder="Ex.: Carolina Herrera" />
          <CampoFormulario label="Modelo (opcional)" name="modelo" defaultValue={produto?.modelo ?? ""} placeholder="Ex.: 212 VIP" />
        </div>
      )}

      <CampoPreco
        label="Preço de venda (varejo)"
        name="preco_venda"
        defaultValue={produto ? numeroParaCampoBR(produto.preco_venda) : ""}
        onValor={setPrecoVarejo}
        dica={completo ? undefined : "Se não souber agora, deixe em branco — a gestão completa depois."}
      />

      {completo && (
        <>
          {/* ---- Preços de atacado ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CampoPreco
              label="Preço de atacado"
              name="preco_atacado"
              defaultValue={produto?.preco_atacado != null ? numeroParaCampoBR(produto.preco_atacado) : ""}
              onValor={setPrecoAtacado}
            />
            <CampoFormulario
              label="Qtde mínima p/ atacado"
              name="qtde_min_atacado"
              type="text"
              inputMode="decimal"
              defaultValue={produto?.qtde_min_atacado != null ? numeroParaCampoBR(produto.qtde_min_atacado) : ""}
              placeholder="Ex.: 6"
              dica="Referência — o atacado é aplicado manualmente na venda."
            />
          </div>

          {/* ---- Margens ao vivo ---- */}
          <MargensProduto
            precoVarejo={precoVarejo}
            precoAtacado={precoAtacado}
            custoUltima={produto?.custo_ultima_compra ?? null}
            custoMedio={produto?.custo ?? null}
          />

          <CampoFormulario
            label="Unidade de venda"
            name="unidade"
            as="select"
            defaultValue={produto?.unidade ?? "un"}
            opcoes={UNIDADES}
          />

          <Interruptor
            name="vender_sem_estoque"
            titulo="Vender mesmo sem estoque?"
            descricao="Ligado: a venda passa e o saldo fica negativo (vermelho). Desligado: o sistema trava a venda além do saldo."
            defaultLigado={produto?.vender_sem_estoque ?? true}
          />

          {produto && (
            <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
              <Linha rotulo="Custo última compra" valor={produto.custo_ultima_compra} />
              <Linha rotulo="Custo médio" valor={produto.custo} />
              <div className="flex justify-between mt-1">
                <span className="text-muted">Em estoque</span>
                <span className="font-semibold text-ink tabular-nums">{formatarQtd(produto.estoque_atual)}</span>
              </div>
              <p className="text-xs text-muted mt-2">Atualizados automaticamente pelas compras e entradas de estoque.</p>
            </div>
          )}

          <FotoUpload name="foto_path" valorInicial={produto?.foto_path} />

          {/* ---- Loja Virtual ---- */}
          <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
            <legend className="px-2 text-sm font-bold text-ink uppercase tracking-wide">Loja virtual</legend>

            <Interruptor
              name="loja_ativo"
              titulo="Ativar na loja virtual"
              descricao="Deixa o produto visível no seu catálogo online."
              avisoDesligado="Este produto está INATIVO para venda na sua loja virtual."
              defaultLigado={produto?.loja_ativo ?? false}
            />
            <Interruptor
              name="destaque_home"
              titulo="Destacar na página inicial"
              descricao="Aparece em destaque na home da loja."
              defaultLigado={produto?.destaque_home ?? false}
            />

            <GaleriaFotos name="fotos" valorInicial={produto?.fotos} />

            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">Textos do anúncio</span>
              <button
                type="button"
                disabled
                title="Em breve — precisa configurar a chave de IA."
                className="h-8 px-3 rounded-lg border border-line text-xs font-semibold text-muted opacity-60 cursor-not-allowed"
              >
                ✨ Preencher com IA
              </button>
            </div>
            <CampoFormulario label="Descrição" name="descricao" as="textarea" defaultValue={produto?.descricao ?? ""} placeholder="Descrição do produto para a loja" />
            <CampoFormulario label="Garantia" name="garantia" as="textarea" defaultValue={produto?.garantia ?? ""} placeholder="Ex.: 3 meses contra defeito de fábrica" />
            <CampoFormulario label="Itens inclusos" name="itens_inclusos" as="textarea" defaultValue={produto?.itens_inclusos ?? ""} placeholder="Ex.: 1 perfume, caixa, manual" />
            <CampoFormulario label="Especificações" name="especificacoes" as="textarea" defaultValue={produto?.especificacoes ?? ""} placeholder="Ex.: 100ml, importado" />
          </fieldset>

          <CampoFormulario label="Observações internas" name="observacoes" as="textarea" defaultValue={produto?.observacoes ?? ""} placeholder="Anotações internas (opcional)" />
        </>
      )}

      {estado.erro && (
        <p className="text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
          {estado.erro}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <Link
          href={voltarHref}
          className="h-14 sm:h-12 inline-flex items-center justify-center rounded-xl border border-line px-5 font-semibold text-ink hover:bg-surface-2 transition-colors"
        >
          Cancelar
        </Link>
        <BotaoSalvar enviando={enviando}>
          {produto ? "Salvar alterações" : "Cadastrar produto"}
        </BotaoSalvar>
      </div>
    </form>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{rotulo}</span>
      <span className="font-semibold text-ink tabular-nums">
        {valor == null ? "—" : formatarBRL(valor)}
      </span>
    </div>
  );
}
