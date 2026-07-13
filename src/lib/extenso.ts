/**
 * Valor em reais por extenso (pt-BR). Ex.: 1523.45 →
 * "mil, quinhentos e vinte e três reais e quarenta e cinco centavos".
 * Cobre 0 até 999.999.999,99 — mais que suficiente para recibos.
 */
const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_10 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** Escreve um número de 0..999 por extenso. */
function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CEM[c]);
  if (resto > 0) {
    if (resto < 10) partes.push(UNI[resto]);
    else if (resto < 20) partes.push(DEZ_10[resto - 10]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZ[d]} e ${UNI[u]}` : DEZ[d]);
    }
  }
  return partes.join(" e ");
}

/** Escreve um inteiro 0..999.999.999 por extenso. */
function inteiroExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const centenas = n % 1000;
  const blocos: string[] = [];
  if (milhoes > 0) blocos.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares > 0) blocos.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (centenas > 0) blocos.push(ate999(centenas));
  return blocos.join(", ");
}

export function valorPorExtenso(valor: number): string {
  const v = Math.round((Number(valor) || 0) * 100);
  const reais = Math.floor(v / 100);
  const centavos = v % 100;
  const partes: string[] = [];
  if (reais > 0) partes.push(`${inteiroExtenso(reais)} ${reais === 1 ? "real" : "reais"}`);
  if (centavos > 0) partes.push(`${inteiroExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  if (partes.length === 0) return "zero real";
  return partes.join(" e ");
}
