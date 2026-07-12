# Mapa de rotas — JS Importados
> Arquitetura de navegação de TODO o projeto: o que já existe (✔) e o que cada
> Leva/Onda vai criar (⏳ com a etiqueta da leva). Atualizar este arquivo sempre
> que criar/renomear rota. (12/07/2026)

## Públicas
| Rota | Função | Status |
|---|---|---|
| /login | entrar · criar conta · esqueci a senha | ✔ |
| /auth/confirmar | troca do código de recuperação (PKCE) | ✔ |
| /redefinir | nova senha | ✔ |
| /loja | vitrine pública (menu = categoria/sub) | ⏳ FUTURO Loja Virtual |
| /loja/produto/[id] · /loja/categoria/[id] | páginas do catálogo | ⏳ FUTURO |

## Balcão (Modo Operação — leigo, mobile-first; NÃO mexer no jeitão)
| Rota | Função | Status |
|---|---|---|
| /balcao | 4 botões gigantes | ✔ |
| /balcao/vender · /balcao/vender/[id] | PDV + recibo | ✔ (recibo ganha impressão na Leva F) |
| /balcao/entrada | chegada de mercadoria | ✔ |
| /balcao/estoque · /balcao/estoque/novo | vitrine + cadastro rápido | ✔ |
| /balcao/caixa | abrir/movimentar/fechar (contagem às cegas) | ✔ |
| /balcao/devolver | devolução simples (venda do dia, da própria operadora) | ⏳ ONDA 1 |

## Gestão — Painel e Cadastros
| Rota | Função | Status |
|---|---|---|
| /gestao | painel → vira DASHBOARD (KPIs hoje/mês, meta de vendas, top 5, atalhos, últimas vendas) | ✔ → ⏳ LEVA E |
| /gestao/cadastros | hub de cadastros | ✔ |
| /gestao/produtos (+novo, [id]) | grade FPQ ✔ · ficha completa ✔ · +cód. barras/sequencial, estoque mínimo, margem % → preço | ✔ + ⏳ LEVA C |
| /gestao/categorias (+novo, [id]) | com subcategorias | ✔ |
| /gestao/fornecedores (+novo, [id]) | Fornecedor 2.0 completo | ✔ (grade Leva A) |
| /gestao/clientes (+novo, [id]) | +endereço, email, bloquear, LIMITE DE CRÉDITO, grade FPQ | ✔ + ⏳ LEVA D |
| /gestao/clientes/aniversariantes · /carteira | CRM | ✔ |
| /gestao/listas-preco (+novo, [id]) | listas por tipo de cliente | ✔ |
| /gestao/taxas-cartao | MDR por parcela | ✔ |
| /gestao/crm | hub CRM + lembretes | ✔ |
| /gestao/usuarios | convites, papéis, cadastro aberto | ✔ |

## Gestão — Operações
| Rota | Função | Status |
|---|---|---|
| /gestao/vendas (+[id]) | grade FPQ + nº amigável + filtro por status + cancelar/devolver | ⏳ LEVA A/B + ONDA 1 |
| /gestao/orcamentos (+novo, [id]) | orçamento → vira venda | ⏳ LEVA B |
| /gestao/compras (+nova, [id]) | grade + nº amigável + cancelar | ⏳ LEVA A/B + ONDA 1 |
| /gestao/estoque | grade com cores + mínimo | ✔ + ⏳ LEVA A/C |
| /gestao/estoque/ajuste | ajuste manual c/ motivo (perda, quebra, inventário) | ⏳ ONDA 1 |
| /gestao/estoque/reposicao | itens abaixo do mínimo (planejar viagem) | ⏳ LEVA C |
| /gestao/caixa (+[id]) | histórico/detalhe das sessões | ✔ (grade Leva A) |

## Gestão — Financeiro
| Rota | Função | Status |
|---|---|---|
| /gestao/financeiro | hub | ✔ |
| /gestao/contas-receber (+[id]) | grade FPQ + filtros + receber na linha | ✔ (Leva A parte 1) |
| /gestao/contas-pagar (+nova, [id]) | grade FPQ + pagar na linha | ⏳ LEVA A |
| /gestao/recibos (+novo, [id]) | recibo numerado, valor por extenso, imprimir | ⏳ LEVA F |
| /gestao/extrato (+config) | movimento c/ saldo corrente + rodapé de totais | ✔ + ⏳ LEVA A |
| /gestao/dre | DRE mensal | ✔ |
| /gestao/contas-bancarias (+nova, [id]) | contas (dinheiro/banco/maquininha) c/ saldo | ⏳ ONDA 2 |
| /gestao/transferencias | transferência entre contas | ⏳ ONDA 2 |
| /gestao/conciliacao | conciliação bancária (OFX/CSV) | ⏳ ONDA 2 |
| /gestao/fluxo-caixa | fluxo por período e conta (modelo MarketUp) | ⏳ ONDA 2 |

## Gestão — Relatórios
| Rota | Função | Status |
|---|---|---|
| /gestao/relatorios | hub c/ KPIs | ✔ |
| /vendas · /lucratividade · /estoque · /clientes · /em-aberto | período + ABC | ✔ (+filtros FPQ, contadores, imprimir, CSV na LEVA F) |
| /gestao/relatorios/patrimonio | custo×venda=margem do estoque + total | ⏳ LEVA C |
| /gestao/relatorios/kardex | extrato por produto | ⏳ ONDA 1/F |
| /gestao/relatorios/perdas | perdas e avarias (ajustes c/ motivo) | ⏳ ONDA 1/F |

## Gestão — Configurações
| Rota | Função | Status |
|---|---|---|
| /gestao/configuracoes | empresa: logo, endereço, mensagens de rodapé, numeração, vias | ⏳ LEVA E |
| /gestao/exportar | backup: exportar CSV (produtos, clientes, vendas, financeiro) | ⏳ LEVA E |

## Regras transversais
- **Autorização**: /gestao/* = gestão (layout exige); /balcao/* = qualquer perfil ativo; custo/margem NUNCA trafega ao balcão.
- **Grades**: desktop denso (TabelaDados) + mobile cards. Cores: verde/âmbar/vermelho + legenda.
- **Números amigáveis** (Leva B): vendas V-000123 · compras C-000045 · orçamentos O-000012 · recibos R-000007.
- **Impressão** (Leva F): rotas [id]/imprimir renderizam versão A4/cupom limpa (window.print).
- **Menu lateral**: seguir esta ordem de seções; novos módulos entram no grupo certo (não criar item solto).
