# Auditorias de referência — FPQ System e MarketUp
> Base de decisão da UX 2.0 do JS Importados (12/07/2026).
> Decisões do dono já tomadas item a item; execução organizada nas Levas A–G.

---

## AUDITORIA 1 — FPQ System v4.6 (fpqsystem.com.br)
ERP desktop Windows clássico. 37 telas analisadas (prints em anexo da sessão).
Plano visual publicado: https://claude.ai/code/artifact/e87427d3-3109-445b-bccc-32e6cf90fedf

### Os 8 padrões que fazem o FPQ parecer "completo e fácil"
1. **Grades densas** — 8–10 colunas visíveis, linhas finas.
2. **Cores por estado** — verde/amarelo/vermelho na linha + legenda no rodapé.
3. **Totais sempre visíveis** — rodapé Total · Pagos · Saldo; TOTAL gigante na venda.
4. **Filtros em tudo** — período, nome, categoria, status, ordenação.
5. **Ação na própria linha** — Receber, Recibo, Alterar sem trocar de tela.
6. **Nº de documento amigável** — Venda 000001, OS 000017.
7. **Ciclo de vida com status + contadores** — pendentes/finalizados/cancelados.
8. **Tudo imprime** — A4 com logo, cupom 40 col, recibo com valor por extenso, fichas.

### Inventário resumido (tela → veredito vs JS Importados)
- Tela inicial (toolbar atalhos + status bar + logo personalizável) → FAZER (Leva E)
- Calculadora → NÃO (decisão do dono)
- Backup → exportar CSV (Leva E)
- Configuração OS/Pedido (logo, mensagens rodapé, numeração, vias) → FAZER (Leva E)
- Pesquisa de produtos (grade + cores estoque + filtros) → FAZER (Leva A) ✔ parte 1 no ar
- Código de barras → HABILITAR (EAN real OU código sequencial) (Leva C)
- Relatório de produtos → + impressão + CSV (Leva F)
- Patrimônio em estoque (custo×venda=margem+total) → FAZER (Leva C)
- Pesquisa de clientes (grade FPQ) → FAZER (Leva A/D)
- Cadastro de cliente → completar (endereço, email, bloquear) (Leva D); ficha impressa NÃO
- Fornecedores → manter o nosso (já superior)
- Menu vendas/OS (por status + cancelar) → melhorar (Leva B + Onda 1)
- Tela de venda → padrão FPQ na gestão, MAS balcão continua leigo e MOBILE é prioridade
- Orçamento (vira venda) → FAZER (Leva B)
- Impressões da venda → foco TELA + opção imprimir (A4/cupom) (Leva F)
- Ordem de Serviço → NÃO (não se aplica)
- Menu financeiro / Movimento de caixa / Contas a receber / Recibo / Filtros de
  relatório / Contadores por status → TUDO padrão FPQ (Levas A, F, G)
- Lucratividade → JÁ TEMOS MELHOR (ABC por faturamento e lucro)
- Multi-caixa + transferência entre caixas → junto com a Onda 2

---

## AUDITORIA 2 — MarketUp (conta real: 48688012000187.marketup.com)
ERP web (Angular SPA). Exploração logada, SÓ-LEITURA, com extração via DOM
(informação exata). O plano original do projeto foi inspirado neste sistema
(lista de relatórios idêntica).

### Mapa de rotas do MarketUp (131 — resumo por módulo)
- **Catálogo**: item(+new), service, category, brand, item_unit, combo,
  item_production, print_label, promotion, discount_campaign, coupon
- **Vendas**: sale_order/new, sale_order/search (pedidos, consignados),
  sale_order_query (em aberto), sale_budget (orçamentos), sale_return
  (devoluções), sale_crm, client, client_type (listas de preço),
  seller_commission, pending_delivery, pos_operation
- **Estoque**: stock_query, new_stock_movement, stock_transfer, stock_location
  (inventário/mapa), storage_type, stock_movement_reason
- **Compras**: purchase_order(+new), purchase_budget, purchase_order_query,
  purchase_return, supplier, invoice_manifest
- **Financeiro**: cash_flow, cash_movement, account (conta corrente),
  bank_statement, reconciliation, payable, receivable, management_account,
  payment_type
- **Relatórios (23)**: DRE, lucratividade por produto, pagamentos, recebimentos,
  cobranças, TEF, carteira, aniversários, newsletter, ABC (vendidos/clientes/
  estoque), vendas por período/pagamento/PDV/vendedor/CFOP/desconto/item,
  ticket por vendedor, item por cliente, compras, lista de preços, kardex,
  localização/status, estoque baixo, perdas e avarias, consignados,
  fechamento detalhado, auditoria operacional
- **Config**: empresa, fiscal (NF-E/NFC-E/NFS-E/CT-E), usuários+permissões,
  PDV, e-commerce (aparência/domínio/pagamentos/entrega/publicação), integrações
- **Loja virtual**: banners, spotlight (destaques), ecommerce_category (menu)

### Formulários extraídos campo a campo
**Produto (/item/new)** — Encontrar produto (catálogo global por cód. barras) OU
cadastro manual · Descrição · Tipo de item · Unidade · Categoria+Sub (com "+") ·
Código de balança · Marca · Modelo · Tags · Código interno · PREÇOS: custo
(última compra), venda varejo, MARGEM (aprox., calculada), venda atacado, qtde
mín. atacado, listas de preço por tipo de cliente · ESTOQUE: tipo, mínimo,
atual, movimento, transferência · FISCAL: NCM, origem, CEST, classificação ·
LOJA: nome, preço De/Por, menu, submenu, dimensões+peso, destacar na home,
imagem secundária.

**Cliente (/client/new)** — PF/PJ · Tipo (lista de preços) · Bloqueado · nome/
apelido/CPF/RG/emissor/UF/sexo/aniversário · razão social/fantasia/CNPJ/IE/IM ·
telefone/celular/email/site/email NFe · **LIMITE DE CRÉDITO** · observação ·
flags fiscais · Endereços 1:N · Contatos 1:N (nome, cargo) · Bancos 1:N ·
Documentos 1:N (tipo, documento, data, descrição, status).

**Venda (/sale_order/new)** — vendedor (+novo) · emissão · entrega (data+hora) ·
cliente (+cadastrar) · endereço de entrega + rastreamento · itens (produto/
serviço, qtde, unitário, total; variações tamanho/cor) · desconto · frete ·
outros custos · forma de pagamento · **parcelamento (vencimento+valor por
linha)** · comissão · observação · Confirmar/Concluir/Entregar.

**Fluxo de caixa (/cash_flow)** — cadastrar CONTAS BANCÁRIAS (banco, agência,
conta, saldo atual) → fluxo por período + contas (todas) + modos de visualização
+ "acesso rápido" (ações em 1 clique por dia). = modelo da Onda 2.

**Dashboard (/dashboard)** — toggle HOJE|MÊS · KPIs: vendas totais, lucro bruto,
atendimentos, ticket médio · **META DE VENDAS do mês com barra de progresso** ·
evolução de vendas (por horário/dia) · TOP 5 · widgets home: faturamento hoje/
mês, ticket hoje, clientes atendidos, meio de pagamento mais usado, horário de
maior movimento, últimas vendas, principais contas, saldo disponível/estimado,
investimento em estoque, nível do estoque.

### Novidades do MarketUp adotadas no plano
1. Limite de crédito do cliente (trava fiado) → Leva D
2. Meta de vendas do mês + barra de progresso → Leva E (dashboard)
3. Kardex, Perdas e Avarias, motivo de movimentação → Onda 1
4. Frete/outros custos na venda · comissão por vendedor → avaliar (futuro)
5. Catálogo por código de barras → Leva C
