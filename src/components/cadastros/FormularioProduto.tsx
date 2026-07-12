"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CampoFormulario } from "./CampoFormulario";
import { CampoPreco } from "./CampoPreco";
import { FotoUpload } from "./FotoUpload";
import { BotaoSalvar } from "./BotaoSalvar";
import { numeroParaCampoBR } from "@/lib/formato";
import { UNIDADES, type Categoria, type ProdutoLista, type EstadoForm } from "@/lib/dados/tipos";

type Acao = (prev: EstadoForm, fd: FormData) => Promise<EstadoForm>;

/**
 * Formulário de produto. modo="balcao" mostra a versão enxuta (só nome,
 * categoria e preço) para o Modo Operação; modo="gestao" mostra tudo.
 */
export function FormularioProduto({
  action,
  categorias,
  produto,
  modo = "gestao",
  voltarHref,
}: {
  action: Acao;
  categorias: Categoria[];
  produto?: ProdutoLista;
  modo?: "gestao" | "balcao";
  voltarHref: string;
}) {
  const [estado, formAction, enviando] = useActionState(action, {});
  const completo = modo === "gestao";

  const opcoesCategoria = categorias.map((c) => ({
    valor: c.id,
    rotulo: c.nome,
  }));

  // Garante que a categoria atual do produto apareça, mesmo que arquivada
  // (senão o select cairia em "Sem categoria" e apagaria o vínculo ao salvar).
  if (
    produto?.categoria_id &&
    !opcoesCategoria.some((o) => o.valor === produto.categoria_id)
  ) {
    opcoesCategoria.push({
      valor: produto.categoria_id,
      rotulo: `${produto.categoria_nome ?? "Categoria"} (arquivada)`,
    });
  }

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

      <CampoFormulario
        label="Categoria"
        name="categoria_id"
        as="select"
        defaultValue={produto?.categoria_id ?? ""}
        opcoes={opcoesCategoria}
        opcaoVazia="Sem categoria"
      />

      <CampoPreco
        label="Preço de venda"
        name="preco_venda"
        defaultValue={produto ? numeroParaCampoBR(produto.preco_venda) : ""}
        dica={
          completo
            ? undefined
            : "Se não souber agora, deixe em branco — a gestão completa depois."
        }
      />

      {completo && (
        <>
          <CampoFormulario
            label="Unidade de venda"
            name="unidade"
            as="select"
            defaultValue={produto?.unidade ?? "un"}
            opcoes={UNIDADES}
          />

          <CampoPreco
            label="Custo (opcional)"
            name="custo"
            defaultValue={produto ? numeroParaCampoBR(produto.custo) : ""}
            dica="Será atualizado automaticamente pelas compras/importações (Fase 3)."
          />

          <FotoUpload name="foto_path" valorInicial={produto?.foto_path} />

          <CampoFormulario
            label="Observações"
            name="observacoes"
            as="textarea"
            defaultValue={produto?.observacoes ?? ""}
            placeholder="Anotações internas (opcional)"
          />
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
