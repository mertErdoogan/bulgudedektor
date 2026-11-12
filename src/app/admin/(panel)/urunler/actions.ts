"use server";

import { q } from "@/db/q";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { orderItems, productImages, products, serialNumbers, stockMovements, type Spec } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { recordSlugChange } from "@/lib/redirects";
import { pingIndexNow } from "@/lib/indexnow";
import { lines, parseAmount, slugify, str, strOrNull, toNum, toNumOrNull } from "@/lib/utils";

const ProductSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalı."),
  sku: z.string().min(1, "Stok kodu (SKU) zorunlu."),
  price: z.number().positive("Satış fiyatı 0'dan büyük olmalı."),
});

type ImageInput = { url: string; alt?: string };

function parseJSON<T>(v: FormDataEntryValue | null, fallback: T): T {
  try {
    return v ? (JSON.parse(String(v)) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "urun";
  let slug = root;
  for (let i = 2; i < 200; i++) {
    const hit = await db.query.products.findFirst({ where: excludeId ? and(eq(products.slug, slug), ne(products.id, excludeId)) : eq(products.slug, slug), columns: { id: true } });
    if (!hit) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export async function saveProduct(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("products.edit");
    const id = strOrNull(fd.get("id"));
    const name = str(fd.get("name"));
    const sku = str(fd.get("sku")).toUpperCase();
    const price = toNum(fd.get("price"), 0);
    const parsed = ProductSchema.safeParse({ name, sku, price });
    if (!parsed.success) return fail(parsed.error.issues[0].message);

    const compareAt = toNumOrNull(fd.get("compareAtPrice"));
    if (compareAt !== null && compareAt <= price) return fail("Liste (üstü çizili) fiyat, satış fiyatından büyük olmalı veya boş bırakılmalı.");

    const skuHit = await db.query.products.findFirst({ where: id ? and(eq(products.sku, sku), ne(products.id, id)) : eq(products.sku, sku), columns: { id: true } });
    if (skuHit) return fail(`"${sku}" stok kodu başka bir üründe kullanılıyor.`);

    const slugInput = str(fd.get("slug"));
    const slug = await uniqueSlug(slugInput || name, id ?? undefined);
    const specs = parseJSON<Spec[]>(fd.get("specs"), []).filter((s) => s.key?.trim() && s.value?.trim());
    const images = parseJSON<ImageInput[]>(fd.get("images"), []).filter((i) => i.url);
    const status = (str(fd.get("status")) || "DRAFT") as "DRAFT" | "ACTIVE" | "ARCHIVED";
    if (status === "ACTIVE" && images.length === 0) return fail("Yayına almak için en az bir görsel ekleyin (ya da taslak olarak kaydedin).");

    const values = {
      name,
      sku,
      slug,
      barcode: strOrNull(fd.get("barcode")),
      brandId: strOrNull(fd.get("brandId")),
      categoryId: strOrNull(fd.get("categoryId")),
      status,
      shortDescription: strOrNull(fd.get("shortDescription")),
      description: strOrNull(fd.get("description")),
      price,
      compareAtPrice: compareAt,
      ...(can(staff.permissions, "products.cost") ? { costPrice: toNumOrNull(fd.get("costPrice")) } : {}),
      taxRate: toNum(fd.get("taxRate"), 20),
      lowStockThreshold: toNum(fd.get("lowStockThreshold"), 2),
      trackSerial: fd.get("trackSerial") === "on",
      allowBackorder: fd.get("allowBackorder") === "on",
      sameDayShipping: fd.get("sameDayShipping") === "on",
      weightKg: toNumOrNull(fd.get("weightKg")),
      warrantyMonths: toNum(fd.get("warrantyMonths"), 24),
      variantGroup: strOrNull(fd.get("variantGroup"))?.toLowerCase().replace(/[^a-z0-9-]+/g, "-") ?? null,
      variantLabel: strOrNull(fd.get("variantLabel")),
      technology: (strOrNull(fd.get("technology")) as typeof products.$inferInsert.technology) ?? null,
      waterproof: (strOrNull(fd.get("waterproof")) as typeof products.$inferInsert.waterproof) ?? null,
      experience: (strOrNull(fd.get("experience")) as typeof products.$inferInsert.experience) ?? null,
      useCases: fd.getAll("useCases").map(String),
      badges: str(fd.get("badges"))
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean),
      specs,
      boxContents: lines(fd.get("boxContents")),
      idealFor: lines(fd.get("idealFor")),
      notFor: lines(fd.get("notFor")),
      videoUrl: strOrNull(fd.get("videoUrl")),
      isFeatured: fd.get("isFeatured") === "on",
      isPro: fd.get("isPro") === "on",
      trialRentalPrice: toNumOrNull(fd.get("trialRentalPrice")),
      seoTitle: strOrNull(fd.get("seoTitle")),
      seoDescription: strOrNull(fd.get("seoDescription")),
    };

    const prevSlug = id ? (await db.query.products.findFirst({ where: eq(products.id, id), columns: { slug: true } }))?.slug : null;
    const productId = await db.transaction(async (tx) => {
      let pid = id;
      if (pid) {
        await tx.update(products).set(values).where(eq(products.id, pid));
      } else {
        const initialStock = Math.max(0, toNum(fd.get("stock"), 0));
        const [row] = await tx
          .insert(products)
          .values({ ...values, stock: values.trackSerial ? 0 : initialStock })
          .returning({ id: products.id });
        pid = row.id;
        if (!values.trackSerial && initialStock > 0) await tx.insert(stockMovements).values({ productId: pid, delta: initialStock, reason: "INITIAL", userId: staff.id, note: "Ürün oluşturuldu" });
      }
      await tx.delete(productImages).where(eq(productImages.productId, pid!));
      if (images.length) await tx.insert(productImages).values(images.map((im, i) => ({ productId: pid!, url: im.url, alt: im.alt || name, sortOrder: i })));
      return pid!;
    });

    await recordSlugChange("/urun", prevSlug, slug);
    if (status === "ACTIVE") await pingIndexNow([`/urun/${slug}`]);
    await audit(staff.id, id ? "update" : "create", "product", productId, `${name} ${id ? "güncellendi" : "eklendi"}`);
    revalidatePath("/", "layout");
    return ok(id ? "Ürün kaydedildi." : "Ürün eklendi.", id ? {} : { redirect: `/admin/urunler/${productId}` });
  });
}

export async function duplicateProduct(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("products.edit");
    const p = await db.query.products.findFirst({ where: eq(products.id, id), with: { images: true } });
    if (!p) return fail("Ürün bulunamadı.");
    const { id: _omit, createdAt: _c, updatedAt: _u, ...rest } = p;
    void _omit;
    void _c;
    void _u;
    const slug = await uniqueSlug(`${p.slug}-kopya`);
    const [row] = await db
      .insert(products)
      .values({ ...rest, name: `${p.name} (kopya)`, sku: `${p.sku}-K${Date.now().toString().slice(-4)}`, slug, status: "DRAFT", stock: 0 })
      .returning();
    if (p.images.length) await db.insert(productImages).values(p.images.map((im) => ({ productId: row.id, url: im.url, alt: im.alt, sortOrder: im.sortOrder })));
    await audit(staff.id, "create", "product", row.id, `${p.name} kopyalandı`);
    return ok("Kopya taslak olarak oluşturuldu.", { redirect: `/admin/urunler/${row.id}` });
  });
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("products.delete");
    const p = await db.query.products.findFirst({ where: eq(products.id, id) });
    if (!p) return fail("Ürün bulunamadı.");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(orderItems).where(eq(orderItems.productId, id));
    if (n > 0) {
      await db.update(products).set({ status: "ARCHIVED" }).where(eq(products.id, id));
      await audit(staff.id, "update", "product", id, `${p.name} arşivlendi (siparişi olduğu için silinmedi)`);
      revalidatePath("/", "layout");
      return ok("Bu ürünün geçmiş siparişleri var; silmek yerine arşivlendi ve mağazadan kaldırıldı.", { redirect: "/admin/urunler" });
    }
    await db.delete(products).where(eq(products.id, id));
    await audit(staff.id, "delete", "product", id, `${p.name} silindi`);
    revalidatePath("/", "layout");
    return ok("Ürün silindi.", { redirect: "/admin/urunler" });
  });
}

export async function bulkProducts(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ids = fd.getAll("ids").map(String);
    const op = str(fd.get("op"));
    if (!ids.length) return fail("Önce ürün seçin.");
    if (op === "delete") {
      await assertStaff("products.delete");
      let archived = 0;
      for (const id of ids) {
        const r = await deleteProduct(id);
        if (r.message?.includes("arşivlendi")) archived++;
      }
      return ok(archived ? `${ids.length - archived} ürün silindi, ${archived} ürün siparişi olduğu için arşivlendi.` : `${ids.length} ürün silindi.`);
    }
    const staff = await assertStaff("products.edit");
    if (op === "ACTIVE") {
      const noImage = await db
        .select({ id: products.id })
        .from(products)
        .where(and(inArray(products.id, ids), sql`not exists (select 1 from product_images pi where pi.product_id = ${q(products.id)})`));
      if (noImage.length) return fail(`${noImage.length} ürünün görseli yok; görsel eklemeden yayına alınamaz.`);
    }
    if (op === "ACTIVE" || op === "DRAFT" || op === "ARCHIVED") {
      await db.update(products).set({ status: op }).where(inArray(products.id, ids));
    } else if (op === "featured-on" || op === "featured-off") {
      await db.update(products).set({ isFeatured: op === "featured-on" }).where(inArray(products.id, ids));
    } else if (op === "price") {
      const pct = toNum(fd.get("pct"), 0);
      if (!pct || pct < -90 || pct > 300) return fail("Geçerli bir yüzde girin (ör. 5 veya -10).");
      await db
        .update(products)
        .set({ price: sql`round(${products.price} * ${1 + pct / 100}, 0)` })
        .where(inArray(products.id, ids));
    } else return fail("Bilinmeyen işlem.");
    await audit(staff.id, "update", "product", null, `Toplu işlem: ${op} (${ids.length} ürün)`, { ids, op });
    revalidatePath("/", "layout");
    return ok(`${ids.length} ürün güncellendi.`);
  });
}

/** CSV içe aktarma: sku zorunlu; name, price, compare_at_price, cost_price, stock, status alanları güncellenir. Olmayan SKU yeni taslak ürün olarak açılır. */
export async function importProductsCsv(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("products.edit");
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) return fail("CSV dosyası seçin.");
    const text = (await file.text()).replace(/^﻿/, "");
    const rows = text.split(/\r?\n/).filter((l) => l.trim());
    if (rows.length < 2) return fail("Dosyada veri satırı yok.");
    const sep = rows[0].includes(";") ? ";" : ",";
    const parseLine = (l: string) => {
      const out: string[] = [];
      let cur = "";
      let q = false;
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (c === '"') {
          if (q && l[i + 1] === '"') {
            cur += '"';
            i++;
          } else q = !q;
        } else if (c === sep && !q) {
          out.push(cur);
          cur = "";
        } else cur += c;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };
    const head = parseLine(rows[0]).map((h) => h.toLowerCase());
    const idx = (k: string) => head.indexOf(k);
    if (idx("sku") < 0) return fail('İlk satırda "sku" sütunu olmalı.');
    let updated = 0;
    let created = 0;
    const errors: string[] = [];
    for (const [n, line] of rows.slice(1).entries()) {
      const c = parseLine(line);
      const get = (k: string) => (idx(k) >= 0 ? c[idx(k)] : undefined);
      const sku = (get("sku") ?? "").toUpperCase();
      if (!sku) continue;
      const num = (k: string) => {
        const v = get(k);
        if (v === undefined || v === "") return undefined;
        const x = parseAmount(v);
        if (!Number.isFinite(x)) errors.push(`Satır ${n + 2}: ${k} sayı değil`);
        return Number.isFinite(x) ? x : undefined;
      };
      const patch: Partial<typeof products.$inferInsert> = {};
      if (get("name")) patch.name = get("name")!;
      const price = num("price");
      if (price !== undefined) patch.price = price;
      const cap = num("compare_at_price");
      if (cap !== undefined) patch.compareAtPrice = cap || null;
      const cost = num("cost_price");
      if (cost !== undefined && can(staff.permissions, "products.cost")) patch.costPrice = cost;
      const status = get("status")?.toUpperCase();
      if (status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) patch.status = status as "DRAFT";
      const stock = num("stock");
      const existing = await db.query.products.findFirst({ where: eq(products.sku, sku) });
      if (existing) {
        if (Object.keys(patch).length) await db.update(products).set(patch).where(eq(products.id, existing.id));
        if (stock !== undefined && !existing.trackSerial && stock !== existing.stock) {
          await db.update(products).set({ stock }).where(eq(products.id, existing.id));
          await db.insert(stockMovements).values({ productId: existing.id, delta: stock - existing.stock, reason: "IMPORT", userId: staff.id, note: "CSV içe aktarma" });
        }
        updated++;
      } else {
        if (!patch.name || patch.price === undefined) {
          errors.push(`Satır ${n + 2}: yeni ürün için name ve price gerekli`);
          continue;
        }
        await db.insert(products).values({ ...patch, name: patch.name, price: patch.price, sku, slug: await uniqueSlug(patch.name), status: "DRAFT", stock: stock ?? 0 });
        created++;
      }
    }
    await audit(staff.id, "update", "product", null, `CSV içe aktarma: ${updated} güncellendi, ${created} eklendi`);
    revalidatePath("/", "layout");
    return ok(`${updated} ürün güncellendi, ${created} yeni taslak ürün eklendi.${errors.length ? ` ${errors.length} uyarı: ${errors.slice(0, 3).join("; ")}` : ""}`);
  });
}

export async function quickUpdate(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("products.edit");
    const id = str(fd.get("id"));
    const price = toNumOrNull(fd.get("price"));
    if (price !== null) {
      if (price <= 0) return fail("Fiyat 0'dan büyük olmalı.");
      await db.update(products).set({ price }).where(eq(products.id, id));
      await audit(staff.id, "update", "product", id, `Fiyat ${price} TL yapıldı`);
    }
    revalidatePath("/", "layout");
    return ok("Fiyat güncellendi.");
  });
}

export async function hasSerials(productId: string) {
  await assertStaff("products.view");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(serialNumbers).where(eq(serialNumbers.productId, productId));
  return n;
}
