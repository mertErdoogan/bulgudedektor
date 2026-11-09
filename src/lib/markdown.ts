// Küçük, güvenli Markdown dönüştürücü (başlık, kalın, italik, link, liste, paragraf).
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g, '<a href="$2">$1</a>');
}

const TR: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
export function headingId(text: string) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (c) => TR[c] ?? c)
    .replace(/\*\*|\*|\[|\]\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** İçindekiler tablosu için ## ve ### başlıkları */
export function extractHeadings(src: string | null | undefined) {
  if (!src) return [] as { id: string; text: string; level: number }[];
  return src
    .split("\n")
    .map((l) => l.match(/^(#{2,3})\s+(.*)$/))
    .filter(Boolean)
    .map((m) => ({ id: headingId(m![2]), text: m![2].replace(/\*\*/g, ""), level: m![1].length }));
}

const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function markdownToHtml(src: string | null | undefined) {
  if (!src) return "";
  const out: string[] = [];
  let table: string[][] | null = null;
  const flushTable = () => {
    if (!table) return;
    const [head, ...rows] = table;
    out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    table = null;
  };
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join("<br/>")}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of src.replace(/\r/g, "").split("\n")) {
    const line = raw.trimEnd();
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flushPara();
      closeList();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue; // ayraç satırı
      (table ??= []).push(cells(line));
      continue;
    }
    flushTable();
    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara();
      closeList();
      const lvl = Math.min(3, m[1].length);
      const tag = m[1].length === 1 ? 2 : lvl;
      out.push(`<h${tag} id="${headingId(m[2])}">${inline(m[2])}</h${tag}>`);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara();
      closeList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      flushPara();
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara();
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      closeList();
      para.push(line);
    }
  }
  flushTable();
  flushPara();
  closeList();
  return out.join("\n");
}

/** Sayfa içeriği HTML ile başlıyorsa olduğu gibi (yalnızca yönetici yazabilir), değilse Markdown olarak işlenir. */
export function renderContent(src: string | null | undefined) {
  if (!src) return "";
  const t = src.trim();
  if (t.startsWith("<")) return t.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "");
  return markdownToHtml(t);
}
