# Onda 2 — Conciliação em 3 pontas (design)
> Decisão do dono (12/07/2026, regras-erp.md §5): a sessão de caixa concilia
> TRÊS meios, cada um contra a sua fonte: cédulas × contagem física; Pix ×
> conta bancária; cartão × adquirente POR MAQUININHA (bruto → taxa → líquido
> → data que caiu). Regra de ouro mantida: toda trava vale NO BANCO.

## Partes (2 migrations + telas)

### 0015 — contas, maquininhas e ledger financeiro (núcleo)
1. **`maquininhas`** — cadastro (nome, adquirente). Visível a todos os perfis
   (o PDV precisa listar); escrita só gestão.
2. **`taxas_cartao.maquininha_id`** — cada maquininha tem a própria tabela de
   MDR; as taxas atuais (maquininha NULL) viram o padrão/fallback.
3. **`vendas.maquininha_id`** + trava no banco: venda no CARTÃO exige escolher
   a maquininha **quando houver maquininha ativa cadastrada** (compatível com
   o banco de hoje, que não tem nenhuma).
4. **`contas_financeiras`** — banco / adquirente / outro, com dados bancários,
   `recebe_pix` (a conta onde o Pix cai — só 1) e conta padrão p/ liquidações.
5. **`lancamentos_financeiros`** — ledger IMUTÁVEL por conta (só os campos de
   conciliação podem mudar). Saldo da conta = SOMA dos lançamentos (nunca um
   número editável). `vw_contas_saldo`.
6. **`transferencias`** + RPC atômica (1 transferência = 2 lançamentos): cobre
   depósito do dinheiro da gaveta no banco e repasse adquirente→banco.
7. **Integração automática (triggers, sem recriar RPCs — padrão da Onda 1):**
   - venda **Pix** → lançamento na conta `recebe_pix`;
   - **recebimento** (baixa de cartão/fiado, forma ≠ dinheiro) → lançamento
     LÍQUIDO na conta padrão; estorno → lançamento espelho negativo;
   - **pagamento** (forma ≠ dinheiro) → lançamento negativo; estorno espelho;
   - dinheiro físico continua no módulo caixa (gaveta) — vira banco só por
     TRANSFERÊNCIA explícita (depósito).
8. **`conferencia_sessao(uuid)`** — a "3 colunas" de uma sessão: dinheiro
   (esperado × contado × diferença) · Pix (vendido na sessão × lançado na
   conta) · cartão POR MAQUININHA (bruto → taxa → líquido, parcelas e datas).
9. Auditoria (0013) estendida às novas tabelas sensíveis.

### 0016 — extrato importado (OFX/CSV) e casamento
- `extrato_importado` (linha do banco: data, valor, descrição, FITID p/ não
  duplicar) + casamento com lançamentos (auto-sugestão por valor+data,
  confirmação manual) → marca `conciliado` dos dois lados.

### Telas (branch `onda2` → preview → teste → merge)
- **/gestao/contas** — contas com saldo (soma do ledger) + nova/editar + extrato da conta.
- **/gestao/cadastros → Maquininhas** — cadastro + taxas por maquininha (reusa a tela de taxas).
- **/gestao/transferencias** — transferir entre contas (gaveta→banco = depósito).
- **PDV cartão** — depois de escolher parcelas, botões grandes "Qual maquininha?".
- **/gestao/caixa/[id]** — seção "Conferência em 3 pontas" (dinheiro · Pix · cartão).
- **/gestao/conciliacao** — importar OFX/CSV e casar (0016).

## Decisões de design
- **Sem recriar RPCs** (`registrar_venda`, `baixar_receber`…): integrações por
  trigger de tabela — valem para qualquer caminho de escrita (lição da 0014).
- **Compatibilidade**: sem maquininha cadastrada e sem contas configuradas o
  sistema se comporta EXATAMENTE como hoje (nada quebra na loja).
- **Dinheiro** não gera lançamento bancário — a fonte da verdade da gaveta é o
  caixa; banco só via transferência (como na vida real).
- **Cancelamento de venda Pix** devolve pela gaveta (sangria — já era assim na
  0013); o acerto na conta Pix, se precisar, é ajuste manual na conta.
