export function toCsv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Türkçe Excel ; ayırıcı ve BOM ile doğru açar
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

export function csvResponse(name: string, rows: (string | number | null | undefined)[][]) {
  return new Response(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}

/** ; veya , ayırıcılı CSV'yi (Excel/Efortek dışa aktarımı) satırlara böler; tırnaklı alanları ve satır içi ; işaretini destekler. */
export function parseCsv(text: string): { head: string[]; rows: string[][] } {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : firstLine.includes("\t") && !firstLine.includes(",") ? "\t" : ",";
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (q) {
      if (c === '"' && clean[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      row.push(cur.trim());
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cur.trim());
      if (row.some((x) => x)) out.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  row.push(cur.trim());
  if (row.some((x) => x)) out.push(row);
  const [head = [], ...rows] = out;
  return { head: head.map((h) => h.toLocaleLowerCase("tr").trim()), rows };
}

/** Başlıklardan ilk eşleşen sütunun değerini döndürür (Türkçe/İngilizce farklı adlandırmalar için). */
export function pickCol(head: string[], row: string[], ...names: string[]) {
  for (const n of names) {
    const i = head.indexOf(n);
    if (i >= 0 && row[i]) return row[i];
  }
  return "";
}
