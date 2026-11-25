/**
 * Tarayıcının bildirdiği tür (file.type) güvenilmez: dosyanın ilk baytları da aynı türü söylemeli.
 * SVG yalnızca betik/olay/dış bağlantı içermiyorsa kabul edilir (depolama ayrı alan adında sunulsa bile XSS olmasın).
 */
export function sniffOk(buf: Buffer, mime: string): boolean {
  const hex = buf.subarray(0, 12).toString("hex");
  const ascii = buf.subarray(0, 12).toString("latin1");
  switch (mime) {
    case "image/jpeg": return hex.startsWith("ffd8ff");
    case "image/png": return hex.startsWith("89504e470d0a1a0a");
    case "image/gif": return ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a");
    case "image/webp": return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
    case "image/avif": return ascii.slice(4, 8) === "ftyp";
    case "application/pdf": return ascii.startsWith("%PDF-");
    case "image/svg+xml": return svgSafe(buf.toString("utf8"));
    default: return false;
  }
}

export function svgSafe(text: string): boolean {
  const t = text.replace(/^\uFEFF/, "").trimStart();
  if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(t)) return false;
  const bad = [
    /<script/i, /<foreignObject/i, /<iframe/i, /<embed/i, /<object/i, /<!ENTITY/i,
    /\son[a-z]+\s*=/i, // onload=, onclick= ...
    /javascript:/i, /data:text\/html/i,
    /(?:xlink:)?href\s*=\s*["']?\s*(?!#)[a-z]+:/i, // dış kaynak (http:, data: ...); yalnızca #iç bağlantı serbest
  ];
  return !bad.some((r) => r.test(t));
}
