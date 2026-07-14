/**
 * Traduz os erros do banco (RPCs/triggers do caixa) para o português do balcão.
 * Compartilhado entre as actions do balcão e da gestão — antes vivia só no
 * balcão e a gestão não tinha caixa nenhum.
 */
export function traduzErroCaixa(error: { message?: string } | null): string {
  const msg = error?.message ?? "";
  if (/ja existe um caixa|já existe um caixa|caixa aberto/i.test(msg))
    return "Já tem um caixa aberto. Feche o atual primeiro.";
  if (/abra o caixa/i.test(msg)) return "Abra o caixa antes de fazer isso.";
  if (/nao ha caixa|não há caixa/i.test(msg)) return "Não há caixa aberto.";
  if (/abertura nao bate|abertura não bate/i.test(msg))
    return "O que você contou não bate com o que sobrou no último fechamento. Escreva o que aconteceu para poder abrir.";
  if (/precisa de justificativa/i.test(msg))
    return "O valor contado não bateu com o esperado. Escreva o que houve no campo de observação para poder fechar.";
  if (/permiss/i.test(msg)) return "Você não tem permissão para isso.";
  if (/maior que zero|diferente de zero/i.test(msg))
    return "Informe um valor válido.";
  return "Não deu para concluir. Tente de novo.";
}
