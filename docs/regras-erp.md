# Regras de funcionamento do ERP — bloqueios, divergências e rastreio
> A lógica de controle do JS Importados: o que o sistema IMPEDE, o que EXIGE,
> o que REGISTRA e como se rastreia tudo. Regra de ouro do projeto: toda trava
> vale NO BANCO (RPC/RLS/trigger), nunca só na tela. (12/07/2026)

## 1. O que JÁ é travado hoje (verificado por testes E2E)

### Caixa
- Máx. **1 caixa aberto por vez** (índice único no banco).
- Movimentar/fechar **exige sessão aberta**; sinais validados (venda>0, sangria<0…).
- Fechamento com **contagem às cegas** (o esperado nunca vai à tela da operação)
  → diferença (contado − esperado) calculada e **registrada** na sessão.
- Venda dinheiro/Pix lança no caixa automaticamente **se houver sessão aberta**.

### Estoque
- Ledger **imutável** (sem UPDATE/DELETE — correção só por linha nova).
- Saldo SEMPRE = soma dos movimentos (função de reconciliação p/ auditoria).
- Operação só registra **entrada, sem custo** (guard no banco); custo médio
  intocado por saída/ajuste.

### Vendas
- RPC **atômica**: itens + baixa de estoque + COGS + recebíveis + caixa numa
  transação (tudo ou nada).
- Operação **só vê as próprias vendas**; custo/margem NUNCA trafegam ao balcão.
- Fiado **exige cliente**; cartão gera parcelas com MDR e vencimentos reais.
- Venda salva é **imutável** — não existe editar; correção será cancelar/devolver (Onda 1).

### Financeiro
- Ledgers imutáveis; **estorno = linha negativa** (1 estorno por recebimento).
- Cartão **liquida integral**; baixa nunca excede o saldo; conta cancelada não recebe.
- Cancelar conta a pagar exige **zero pago**; compra sempre gera conta a pagar.
- Anti-dupla-contagem: compra nunca vira despesa no DRE (é CMV na venda);
  cartão/fiado entram no extrato **líquidos na data real**.

### Acesso
- Autorização **no banco** (papel + ativo; inativo perde tudo, inclusive API).
- Convites; cadastro aberto só cria operação; último gestor ativo é protegido;
  fornecedor **bloqueado** some da seleção de compra/despesa.

## 2. FUROS conhecidos (o que um ERP de verdade trava e o nosso ainda não)

| # | Furo | Risco | Correção | Onde |
|---|------|-------|----------|------|
| F1 | Venda dinheiro/Pix **sem caixa aberto** passa e fica FORA do caixa | fura o fechamento; dinheiro na gaveta sem registro na sessão | bloquear no `registrar_venda` (decisão do dono) | ONDA 1 |
| F2 | Fechamento com **divergência** não exige justificativa | falta/sobra some sem explicação | diferença ≠ 0 → observação obrigatória + relatório de divergências | ONDA 1 |
| F3 | Operação pode dar **qualquer desconto** no PDV | desconto vira vazamento de margem | teto de desconto p/ operação (decisão do dono), validado na RPC | ONDA 1 |
| F4 | **Cancelar/devolver não existe** | erro vira sujeira permanente | Onda 1 (já projetada: D1 parcial+total, D2 revendável/perda, D3 operação só a própria do dia c/ caixa aberto) | ONDA 1 |
| F5 | ~~Fiado sem limite de crédito e cliente sem status bloqueado~~ | fiado sem teto p/ mau pagador | ✔ FEITO (0019): cliente bloqueado não faz fiado; limite_credito trava por trigger em contas_receber (saldo devedor + venda <= limite) | LEVA D |
| F6 | **Mudança de preço/custo não deixa rastro** | não dá pra responder "quem mudou e quando" | trilha de auditoria (log imutável de alterações sensíveis) | ONDA 1 |
| F7 | Ajuste de estoque **sem motivo** obrigatório | perdas/quebras viram nº solto | ajuste manual exige motivo (perda, quebra, inventário…) + relatório Perdas | ONDA 1 |
| F8 | Documentos **sem número amigável** | rastreio por telefone impossível | V-000123 / C-000045 / O-000012 / R-000007 | LEVA B |
| F9 | Sem **linha do tempo do documento** | rastreio manual entre telas | tela "trilha": venda → recebíveis → recebimentos → caixa → extrato | LEVA F |
| F10 | Estoque zerado na venda: permite + avisa | pode mascarar cadastro atrasado | manter/bloquear/por-produto (decisão do dono) | ONDA 1 |

## 3. Rastreio ponta a ponta (como cada real é seguido)
Compra (multi-moeda) → rateio → custo real → **entrada no ledger de estoque** →
venda (snapshot de custo) → **saída no ledger** → recebível (parcela, MDR, venc.)
→ recebimento (ledger, estorno=linha negativa) → caixa (sessão, contagem) →
extrato (regime caixa) + DRE (competência). Cada elo guarda `criado_por` +
`criado_em`; a Onda 1 acrescenta a **trilha de auditoria** para UPDATEs sensíveis
(preço, custo, status, papel de usuário) e os cancelamentos/estornos com motivo.

## 4. Alçadas (quem pode o quê)
| Ação | Operação | Gestão |
|------|----------|--------|
| Vender / entrada de mercadoria / abrir-fechar caixa | ✔ | ✔ |
| Ver custo, margem, financeiro, fornecedores, relatórios | ✖ (travado no banco) | ✔ |
| Desconto no PDV | até o teto (F3) | livre |
| Cancelar/devolver venda | só a própria, do dia, caixa aberto (Onda 1) | qualquer |
| Ajuste manual de estoque / estornos / cadastros sensíveis | ✖ | ✔ |
| Usuários, convites, papéis, config da empresa | ✖ | ✔ |

## 5. Decisões do dono (12/07/2026)
- **F1 AMPLIADO — TODA venda exige caixa aberto** (dinheiro, Pix E cartão):
  toda venda pertence a uma sessão de caixa; nada fica fora do registro.
- **Cartão rastreado por MAQUININHA (adquirente)**: cada venda de cartão
  registra QUAL maquininha passou → valor bruto → taxa descontada pela
  adquirente → líquido → data em que caiu. (Cadastro de maquininhas + taxas
  por maquininha; conciliação dos recebíveis por adquirente entra na Onda 2.)
- **"Tudo tem que ter registros/logs"**: trilha de auditoria (F6) é requisito
  central — empresa organizada, informação de tudo.
- **F2**: divergência de caixa exige justificativa + relatório de divergências.
- **F3**: desconto da operação SEM teto (mantém livre).
- **F10**: vender sem estoque vira interruptor POR PRODUTO (padrão MarketUp).
- **CONCILIAÇÃO EM 3 PONTAS (dono, 12/07/2026):** venda NUNCA sem caixa aberto;
  a sessão de caixa concilia TRÊS meios, cada um contra sua fonte:
  1. **Cédulas** → contagem física da gaveta (já existe: contagem às cegas);
  2. **Pix** → o recebido via Pix na sessão tem que bater com o extrato/saldo da
     **conta bancária** que recebe os Pix;
  3. **Cartão** → o passado na(s) **maquininha(s)** tem que condizer com o saldo
     a receber/recebido da **adquirente** (por maquininha: bruto → taxa → líquido
     → data que caiu).
  Implementação: a trava "toda venda exige caixa" entra na 0014 (Onda 1); as
  pontas 2 e 3 exigem cadastro de contas bancárias e maquininhas → Onda 2, com
  tela de fechamento/conferência em 3 colunas (dinheiro · Pix · cartão).

## 6. Onda 2 — conciliação (migration 0015, aplicada 13/07/2026)
- **Maquininhas** com MDR próprio; `taxas_cartao` (Fase 4) vira fallback.
- **Venda no cartão EXIGE maquininha** quando houver alguma ativa cadastrada
  (trava na RPC `registrar_venda` v3); grava `vendas.maquininha_id`.
- **Contas financeiras** (banco/adquirente): saldo = SOMA do ledger
  (`lancamentos_financeiros`), nunca editável. `saldo_inicial` imutável
  (acerto = ajuste justificado). Lançamento **imutável** (só a conciliação
  muda; DELETE bloqueado) — mesma regra de ouro dos outros ledgers.
- **Integração automática por trigger** (não recria RPCs): venda Pix → conta
  `recebe_pix` (máx. 1 conta); recebimento/pagamento não-dinheiro → conta
  padrão (`financeiro_config.conta_padrao_id`); estorno = espelho negativo.
  Dinheiro NÃO vira banco automático — só por **transferência** (depósito).
- **Transferência** atômica = 2 lançamentos (RPC `transferir_entre_contas`);
  transferência e ledger imutáveis (correção = inversa).
- **`conferencia_sessao(uuid)`**: as 3 pontas de uma sessão — dinheiro
  (esperado×contado×dif) · Pix (vendido×lançado na conta) · cartão por
  maquininha (bruto→taxa→líquido→recebido).
- RLS: financeiro **só-gestão**; `maquininhas` visível à operação (o PDV lista).
- Bug de fuso eliminado na fonte: `registrar_venda` agora usa `hoje_brt()`
  internamente (não só o DEFAULT da coluna).
- **Compatibilidade**: sem maquininha/contas cadastradas, tudo se comporta como
  antes — a trava do cartão só liga ao cadastrar a 1ª maquininha.

## 7. Onda 2 parte 2 — conciliação OFX/CSV (migration 0016, 13/07/2026)
- **extrato_importado**: linha do banco (data, valor assinado, descrição, fitid).
  `unique(conta_id, fitid)` impede reimportar a mesma linha; um lançamento só
  casa com UMA linha (`unique(lancamento_id)`).
- **importar_extrato(conta, jsonb)**: insere ignorando duplicatas por fitid;
  parse do arquivo é no app (OFX SGML e CSV, valor BR/US assinado).
- **sugestoes_conciliacao(conta)**: casa linha↔lançamento por valor IGUAL e data
  ±3 dias, só não-conciliados. **conciliar_linha/desconciliar_linha** marcam o
  `conciliado` dos dois lados (valida valor e conta; bloqueia duplo-casamento).
- **rel_fluxo_caixa(inicio, fim)**: por conta = saldo inicial (antes) + entradas
  + saídas + saldo final. Dinheiro em espécie fica no módulo Caixa.
- RLS: extrato só-gestão; escrita só via RPC.

> Este arquivo é o contrato de regras. Toda leva/onda que criar trava nova
> ATUALIZA este documento (com o nº da migration que a implementou).
