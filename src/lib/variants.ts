/* Çok boyutlu varyantlar: varyant adı "Renk: Siyah / Beden: 42" biçimindeyse ürün sayfasında her boyut ayrı satırda seçilir.
   Düz adlarda ("Pro-Pack", "15\" başlık") tek satır seçenek gösterilir. Her varyant ayrı ürün kaydıdır (kendi stoğu ve fiyatı). */

export type VariantRow = { id: string; slug: string; name: string; label: string | null; price: number; stock: number; allowBackorder: boolean };

export function parseVariantLabel(label: string | null): Record<string, string> | null {
  if (!label || !label.includes(":")) return null;
  const out: Record<string, string> = {};
  for (const part of label.split(" / ")) {
    const i = part.indexOf(":");
    if (i < 1) return null;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k || !v) return null;
    out[k] = v;
  }
  return out;
}

export type Axis = { name: string; options: { value: string; href: string; current: boolean; available: boolean; exact: boolean }[] };

/** Bütün varyantların adı "Boyut: değer" biçimindeyse boyut satırlarını döndürür; değilse null (tek satır gösterilir) */
export function variantAxes(rows: VariantRow[], currentId: string): Axis[] | null {
  const parsed = rows.map((r) => ({ r, a: parseVariantLabel(r.label) }));
  if (parsed.length < 2 || parsed.some((x) => !x.a)) return null;
  const names: string[] = [];
  for (const { a } of parsed) for (const k of Object.keys(a!)) if (!names.includes(k)) names.push(k);
  const cur = parsed.find((x) => x.r.id === currentId)?.a ?? parsed[0].a!;
  const inStock = (r: VariantRow) => r.stock > 0 || r.allowBackorder;
  return names.map((name) => {
    const values: string[] = [];
    for (const { a } of parsed) if (a![name] && !values.includes(a![name])) values.push(a![name]);
    return {
      name,
      options: values.map((value) => {
        // Önce diğer seçimleri koruyan tam eşleşme, yoksa bu değere sahip herhangi bir varyant
        const exact = parsed.find(({ a }) => a![name] === value && names.every((n) => n === name || a![n] === cur[n]));
        const any = exact ?? parsed.find(({ a }) => a![name] === value)!;
        return { value, href: `/urun/${any.r.slug}`, current: cur[name] === value, available: inStock(any.r), exact: !!exact };
      }),
    };
  });
}
