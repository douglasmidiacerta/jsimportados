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
import {
  numeroParaCampoBR,
  parseMoedaBR,
  formatarBRL,
  formatarQtd,
  codProduto,
  gerarEAN13,
  precoPorMargem,
} from "@/lib/formato";
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

  // Preço de varejo controlado (a margem% pode setar). Margens derivam dele.
  const [precoVarejoTexto, setPrecoVarejoTexto] = useState(
    produto ? numeroParaCampoBR(produto.preco_venda) : "",
  );
  const precoVarejo = parseMoedaBR(precoVarejoTexto);
  const [precoAtacado, setPrecoAtacado] = useState(produto?.preco_atacado ?? 0);

  // Código de barras (EAN digitado ou gerado) e margem% → preço.
  const [codigoBarras, setCodigoBarras] = useState(produto?.codigo_barras ?? "");
  const [margemPct, setMargemPct] = useState("");
  const custoBase = produto?.custo_ultima_compra ?? produto?.custo ?? null;

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

      {/* ---- Código de barras + código interno (Leva C) ---- */}
      {completo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Código de barras (opcional)</span>
            <div className="flex gap-2">
              <input
                name="codigo_barras"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="Escaneie ou digite o EAN"
                className="flex-1 min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink placeholder:text-muted outline-none focus:border-accent"
              />
              {produto?.codigo_sequencial != null && (
                <button
                  type="button"
                  onClick={() => setCodigoBarras(gerarEAN13(produto.codigo_sequencial!))}
                  title="Gera um código interno para etiquetar/escanear"
                  className="shrink-0 h-[52px] px-3 rounded-xl border border-line text-sm font-semibold text-accent-ink hover:bg-surface-2"
                >
                  Gerar
                </button>
              )}
            </div>
            <span className="text-xs text-muted">
              Use o código de fábrica, ou toque em “Gerar” para um código interno.
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">Código interno</span>
            <div className="min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 flex items-center text-base font-mono text-muted">
              {produto?.codigo_sequencial != null ? codProduto(produto.codigo_sequencial) : "gerado ao salvar"}
            </div>
            <span className="text-xs text-muted">Número curto do produto (automático).</span>
          </div>
        </div>
      )}

      <CampoPreco
        label="Preço de venda (varejo)"
        name="preco_venda"
        valor={precoVarejoTexto}
        onTexto={setPrecoVarejoTexto}
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

          {/* ---- Preço pela margem (custo → margem% → preço) ---- */}
          {custoBase != null && custoBase > 0 && (
            <div className="rounded-xl border border-line bg-surface-2 p-4 flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink">Definir preço pela margem</span>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-muted">Margem sobre a venda</span>
                  <span className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={margemPct}
                      onChange={(e) => setMargemPct(e.target.value)}
                      placeholder="Ex.: 30"
                      className="w-24 h-11 rounded-lg border border-line bg-surface px-3 text-ink outline-none focus:border-accent"
                    />
                    <span className="text-muted">%</span>
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!(parseMoedaBR(margemPct) > 0)}
                  onClick={() => setPrecoVarejoTexto(precoPorMargem(custoBase, parseMoedaBR(margemPct)))}
                  className="h-11 px-4 rounded-lg bg-accent text-white font-semibold disabled:opacity-50"
                >
                  Aplicar no preço
                </button>
                {parseMoedaBR(margemPct) > 0 && precoPorMargem(custoBase, parseMoedaBR(margemPct)) && (
                  <span className="text-sm text-muted">
                    → varejo {formatarBRL(parseMoedaBR(precoPorMargem(custoBase, parseMoedaBR(margemPct))))}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted">
                Sobre o custo da última compra ({formatarBRL(custoBase)}). Margem = lucro ÷ preço.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CampoFormulario
              label="Unidade de venda"
              name="unidade"
              as="select"
              defaultValue={produto?.unidade ?? "un"}
              opcoes={UNIDADES}
            />
            <CampoFormulario
              label="Estoque mínimo (reposição)"
              name="estoque_minimo"
              type="text"
              inputMode="decimal"
              defaultValue={produto && produto.estoque_minimo > 0 ? numeroParaCampoBR(produto.estoque_minimo) : ""}
              placeholder="Ex.: 5"
              dica="Avisa quando o saldo chega nesse número. Deixe vazio para não avisar."
            />
          </div>

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
