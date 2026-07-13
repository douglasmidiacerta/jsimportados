# Design — Onda 1 "poder desfazer + regras de ERP"
> Decisões técnicas para as migrations 0013/0014 e telas. Baseado no recon do
> schema (0003–0006) + decisões do dono (D1-D3 + regras §5). (12/07/2026)

## Escopo em 2 migrations
- **0013**: auditoria + devoluções/cancelamentos + ajuste com motivo + colunas
  novas (não mexe em RPCs existentes).
- **0014**: recria `registrar_venda` (toda venda exige caixa aberto + respeitar
  vender_sem_estoque) e `fechar_caixa` (divergência ≠ 0 exige justificativa).
  Exige LER o fonte atual em 0005 antes de reescrever (nunca recriar às cegas —
  lição do produtos_operacao_guard).

## 0013 — peças

### 1. Trilha de auditoria ("logs de tudo")
- Tabela `auditoria(id, tabela, registro_id, acao, usuario default auth.uid(),
  dados jsonb, criado_em)`. RLS: SELECT gestão; sem policy de INSERT/UPDATE/
  DELETE (só escreve via função DEFINER `registrar_auditoria`).
- Triggers de UPDATE que auditam campos sensíveis: `produtos` (preco_venda,
  preco_atacado, loja_ativo, ativo), `perfis` (papel, ativo). As RPCs de
  cancelar/devolver/ajustar também gravam auditoria explicitamente.

### 2. Colunas novas
- `produtos.vender_sem_estoque boolean not null default true` (interruptor;
  enforcement na 0014).
- `movimentacoes_estoque.motivo text` (perda|quebra|inventario|devolucao|
  cancelamento_venda|cancelamento_compra|outro) p/ relatório de Perdas.
- `vendas.status`: widen CHECK → ('liquidado','a_receber','cancelada',
  'devolvida_parcial') + colunas cancelada_em, cancelada_por, motivo_cancelamento.
- `compras.status`: CHECK ('confirmada','cancelada') + mesmas colunas de cancelamento.
- `caixa_sessoes.justificativa_diferenca text` (obrigatória via 0014 quando
  diferença ≠ 0).

### 3. Devolução/cancelamento de VENDA
- Tabelas: `devolucoes(id, venda_id, tipo devolucao|cancelamento, motivo,
  criado_por, criado_em)` + `devolucao_itens(devolucao_id, venda_item_id,
  produto_id, quantidade>0, revendavel bool, preco_unitario, subtotal,
  custo_unitario)`. RLS SELECT/escrita: gestão (operação usa a RPC).
- RPC **`devolver_venda(p_venda, p_itens jsonb [{venda_item_id, quantidade,
  revendavel}], p_motivo)`** DEFINER, atômica:
  - **Autorização D3**: gestão OU (operação && venda.criado_por=auth.uid() &&
    data_venda=hoje_brt() && caixa aberto).
  - Valida: venda não cancelada; qtd devolvida ≤ vendida − já devolvida.
  - **Estoque**: item revendável → `movimentacoes_estoque` tipo 'ajuste'
    quantidade +q, motivo 'devolucao' (AJUSTE NÃO mexe no custo médio — recon
    B; nunca 'entrada' com custo, senão bagunça a média). Não revendável →
    estoque intacto (perda; aparece no relatório de perdas via devolucao_itens).
  - **Receita/DRE**: espelho negativo — INSERT em `venda_itens` com quantidade
    negativa e subtotal negativo (referenciando produto) + linha correspondente
    em `venda_itens_custo` com custo NEGATIVO **apenas se revendável** (perda
    mantém CMV; margem cai — contabilmente correto). Recalcular `vendas_custo`
    (custo_total, lucro_bruto) e `vendas.subtotal/total`? NÃO alterar
    vendas.total histórico: o DRE/relatórios leem venda_itens/venda_itens_custo
    (recon H), então o espelho negativo corrige DRE, lucratividade e ABC sem
    tocar no cabeçalho. Conferir CHECKs de positividade em venda_itens/custo
    ANTES (ler 0004; se houver CHECK >0, remover/ajustar na 0013).
  - **Financeiro**:
    - dinheiro/pix → devolver dinheiro da gaveta: `caixa_movimentos` tipo
      'sangria' (valor −q, meio dinheiro, SEM venda_id — índice único; obs
      "devolução venda …"). Exige caixa aberto.
    - cartão/fiado → REGRA SIMÉTRICA ao cancelar_conta_pagar: cancelamento/
      devolução só se os recebíveis da venda tiverem **zero recebido**
      (recebimentos devem ser estornados antes na tela do financeiro; a UI
      orienta). Aí os recebíveis abertos viram status 'cancelado'
      (proporcional na parcial: reduz valor? v1: parcial NÃO mexe em recebível
      de cartão — raise orientando cancelamento total ou acerto manual; fiado
      parcial reduz o valor_liquido do recebível aberto).
  - **Status**: tudo devolvido → 'cancelada' (+cancelada_em/por/motivo);
    parcial → 'devolvida_parcial'. Auditoria em ambos.
- RPC **`cancelar_venda(p_venda, p_motivo, p_revendavel)`** = devolve todos os
  itens restantes via devolver_venda.

### 4. Cancelamento de COMPRA
- RPC **`cancelar_compra(p_compra, p_motivo)`** DEFINER, gestão-only:
  - Exige conta a pagar com zero pago → seta 'cancelado' (reusa regra 0006).
  - Estoque: por item, `movimentacoes_estoque` tipo 'ajuste' −qtd, motivo
    'cancelamento_compra' (média NÃO é des-mesclada — documentado; saldo pode
    ficar negativo, aparece vermelho).
  - `compras.status='cancelada'` + auditoria. Excluir compras canceladas dos
    relatórios de compras (filtrar status nas queries).

### 5. Ajuste manual de estoque
- RPC **`ajustar_estoque(p_produto, p_quantidade ≠0, p_motivo in (perda,quebra,
  inventario,outro), p_observacoes)`** gestão-only → movimentacoes 'ajuste' com
  motivo + auditoria. Tela /gestao/estoque/ajuste.

## 0014 — regras de venda/caixa (ler 0005 antes)
- `registrar_venda`: (a) TODA venda (dinheiro, pix, cartão, fiado) exige
  caixa aberto → raise 'Abra o caixa antes de vender.' + grava caixa_sessao_id
  SEMPRE; (b) por item: se produto.vender_sem_estoque=false e saldo < qtd →
  raise com nome do produto.
- `fechar_caixa`: se diferença ≠ 0 e justificativa vazia → raise; grava
  justificativa_diferenca. Relatório de divergências: listar sessões com
  diferença ≠ 0 (justificativa, operadora, data) em /gestao/caixa.
- PDV/balcão: aviso amigável "abra o caixa primeiro" com botão.

## Verificação E2E (rollback) — mínimo
1. devolução parcial revendável: estoque +1 (custo médio INTACTO), venda_itens
   espelho −1, DRE recalcula, status devolvida_parcial.
2. devolução perda: estoque intacto, CMV mantido, receita cai.
3. cancelar venda dinheiro c/ caixa aberto: sangria criada; sem caixa → raise.
4. cancelar venda cartão com recebimento → raise; sem recebimento → recebíveis
   cancelados.
5. D3: operação cancela a própria de hoje c/ caixa aberto; de ontem → raise;
   de outro usuário → raise.
6. cancelar compra: estoque revertido, conta cancelada, status.
7. ajuste com motivo aparece no ledger; auditoria registra tudo.
8. 0014: venda sem caixa → raise (todas as formas); vender_sem_estoque=false
   trava; fechar caixa com diferença sem justificativa → raise.
