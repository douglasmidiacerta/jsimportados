/**
 * Parser de extrato bancário (OFX ou CSV) → linhas normalizadas.
 * Cada linha: { data: "YYYY-MM-DD", valor: number (assinado), descricao, fitid }.
 * fitid é o id único do banco (OFX) ou um id composto estável (CSV) p/ dedupe.
 * Roda no servidor (Server Action).
 */
export type LinhaExtrato = {
  data: string;
  valor: number;
  descricao: string | null;
  fitid: string;
};

/** "20260713"/"20260713120000[-3]" → "2026-07-13". Aceita também dd/mm/aaaa. */
function normalizarDataOFX(bruto: string): string | null {
  const s = bruto.trim();
  const m8 = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m8) return `${m8[1]}-${m8[2]}-${m8[3]}`;
  return normalizarDataBR(s);
}

function normalizarDataBR(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/); // dd/mm/aaaa
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = t.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/); // aaaa-mm-dd
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

/** Valor BR/US assinado: "-1.234,56" | "-1234.56" | "1.234,56" → number. */
function parseValor(bruto: string): number {
  let s = bruto.replace(/[^\d.,-]/g, "").trim();
  if (!s) return NaN;
  const temVirg = s.includes(",");
  const temPonto = s.includes(".");
  if (temVirg && temPonto) {
    // o último separador é o decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (temVirg) {
    s = s.replace(",", ".");
  }
  return Number(s);
}

function tag(bloco: string, nome: string): string | null {
  // OFX SGML: <NAME>valor  (sem fechamento) ou <NAME>valor</NAME>
  const re = new RegExp(`<${nome}>([^<\\r\\n]*)`, "i");
  const m = bloco.match(re);
  return m ? m[1].trim() : null;
}

function parseOFX(texto: string): LinhaExtrato[] {
  const linhas: LinhaExtrato[] = [];
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  for (let i = 0; i < blocos.length; i++) {
    const b = blocos[i];
    const dataRaw = tag(b, "DTPOSTED");
    const valorRaw = tag(b, "TRNAMT");
    const fitid = tag(b, "FITID");
    const memo = tag(b, "MEMO") ?? tag(b, "NAME");
    if (!dataRaw || !valorRaw) continue;
    const data = normalizarDataOFX(dataRaw);
    const valor = parseValor(valorRaw);
    if (!data || !Number.isFinite(valor) || valor === 0) continue;
    linhas.push({
      data,
      valor: Math.round(valor * 100) / 100,
      descricao: memo,
      fitid: fitid && fitid.length > 0 ? fitid : `${data}|${valor}|${i}`,
    });
  }
  return linhas;
}

function parseCSV(texto: string): LinhaExtrato[] {
  const linhasTxt = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (linhasTxt.length === 0) return [];
  const delim = (linhasTxt[0].match(/;/g)?.length ?? 0) >= (linhasTxt[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows = linhasTxt.map((l) => l.split(delim).map((c) => c.replace(/^"|"$/g, "").trim()));
  // detecta se a 1ª linha é cabeçalho (sem data válida na 1ª célula)
  const primeiraData = rows[0].map(normalizarDataBR).some(Boolean);
  const corpo = primeiraData ? rows : rows.slice(1);

  const linhas: LinhaExtrato[] = [];
  for (let i = 0; i < corpo.length; i++) {
    const cols = corpo[i];
    // acha a 1ª coluna que é data e a 1ª que é número não-zero
    let data: string | null = null;
    for (const c of cols) {
      const d = normalizarDataBR(c);
      if (d) { data = d; break; }
    }
    let valor = NaN;
    let descricao: string | null = null;
    for (const c of cols) {
      if (normalizarDataBR(c)) continue; // pula a data
      const v = parseValor(c);
      if (Number.isFinite(v) && v !== 0 && !Number.isNaN(v) && /\d/.test(c)) {
        valor = v; // último número não-zero vira o valor
      } else if (c && !/^[\d.,\s-]+$/.test(c)) {
        descricao = descricao ? `${descricao} ${c}` : c;
      }
    }
    if (!data || !Number.isFinite(valor) || valor === 0) continue;
    linhas.push({
      data,
      valor: Math.round(valor * 100) / 100,
      descricao,
      fitid: `${data}|${valor}|${(descricao ?? "").slice(0, 24)}|${i}`,
    });
  }
  return linhas;
}

/** Detecta o formato pelo conteúdo e devolve as linhas. */
export function parseExtrato(texto: string): LinhaExtrato[] {
  if (/<OFX>|<STMTTRN>|OFXHEADER/i.test(texto)) return parseOFX(texto);
  return parseCSV(texto);
}
