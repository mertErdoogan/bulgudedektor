import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

/** Seçim kutuları için kategori listesi: ağaç sırasıyla, alt kategoriler "Ana › Alt" biçiminde (aynı adlı alt kategoriler karışmasın). */
export async function categoryOptions(): Promise<{ id: string; name: string }[]> {
  const rows = await db.select({ id: categories.id, name: categories.name, parentId: categories.parentId }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  const byParent = new Map<string | null, typeof rows>();
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    const k = r.parentId && ids.has(r.parentId) ? r.parentId : null;
    byParent.set(k, [...(byParent.get(k) ?? []), r]);
  }
  const out: { id: string; name: string }[] = [];
  const seen = new Set<string>();
  const walk = (parent: string | null, prefix: string) => {
    for (const r of byParent.get(parent) ?? []) {
      if (seen.has(r.id)) continue; // döngüye karşı koruma
      seen.add(r.id);
      const label = prefix ? `${prefix} › ${r.name}` : r.name;
      out.push({ id: r.id, name: label });
      walk(r.id, label);
    }
  };
  walk(null, "");
  return out;
}
