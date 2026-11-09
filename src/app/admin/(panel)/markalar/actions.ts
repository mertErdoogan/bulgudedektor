"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { brands, categories, products } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { recordSlugChange } from "@/lib/redirects";
import { pingIndexNow } from "@/lib/indexnow";
import { slugify, str, strOrNull, toNum } from "@/lib/utils";

export async function saveBrand(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("catalog.manage");
    const id = strOrNull(fd.get("id"));
    const name = str(fd.get("name"));
    if (name.length < 2) return fail("Marka adı en az 2 karakter olmalı.");
    const slug = slugify(str(fd.get("slug")) || name);
    const dupe = await db.query.brands.findFirst({ where: id ? and(eq(brands.slug, slug), ne(brands.id, id)) : eq(brands.slug, slug) });
    if (dupe) return fail("Bu URL başka bir markada kullanılıyor.");
    const values = { name, slug, logoUrl: strOrNull(fd.get("logoUrl")), description: strOrNull(fd.get("description")), isActive: fd.get("isActive") === "on", sortOrder: toNum(fd.get("sortOrder"), 0) };
    if (id) {
      const prev = await db.query.brands.findFirst({ where: eq(brands.id, id), columns: { slug: true } });
      await db.update(brands).set(values).where(eq(brands.id, id));
      await recordSlugChange("/marka", prev?.slug, slug);
    } else await db.insert(brands).values(values);
    await audit(staff.id, id ? "update" : "create", "brand", id, `Marka ${name} kaydedildi`);
    revalidatePath("/", "layout");
    return ok("Marka kaydedildi.", { redirect: "/admin/markalar" });
  });
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("catalog.manage");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.brandId, id));
    if (n) return fail(`Bu markada ${n} ürün var. Önce ürünleri başka markaya taşıyın veya markayı pasifleştirin.`);
    await db.delete(brands).where(eq(brands.id, id));
    await audit(staff.id, "delete", "brand", id, "Marka silindi");
    revalidatePath("/", "layout");
    return ok("Marka silindi.", { redirect: "/admin/markalar" });
  });
}

export async function saveCategory(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("catalog.manage");
    const id = strOrNull(fd.get("id"));
    const name = str(fd.get("name"));
    if (name.length < 2) return fail("Kategori adı en az 2 karakter olmalı.");
    const slug = slugify(str(fd.get("slug")) || name);
    const dupe = await db.query.categories.findFirst({ where: id ? and(eq(categories.slug, slug), ne(categories.id, id)) : eq(categories.slug, slug) });
    if (dupe) return fail("Bu URL başka bir kategoride kullanılıyor.");
    const parentId = strOrNull(fd.get("parentId"));
    if (id && parentId === id) return fail("Kategori kendi alt kategorisi olamaz.");
    const values = {
      name,
      slug,
      parentId,
      shortText: strOrNull(fd.get("shortText")),
      description: strOrNull(fd.get("description")),
      imageUrl: strOrNull(fd.get("imageUrl")),
      isActive: fd.get("isActive") === "on",
      showInMenu: fd.get("showInMenu") === "on",
      sortOrder: toNum(fd.get("sortOrder"), 0),
      seoTitle: strOrNull(fd.get("seoTitle")),
      seoDescription: strOrNull(fd.get("seoDescription")),
      seoContent: strOrNull(fd.get("seoContent")),
    };
    if (id) {
      const prev = await db.query.categories.findFirst({ where: eq(categories.id, id), columns: { slug: true } });
      await db.update(categories).set(values).where(eq(categories.id, id));
      await recordSlugChange("/kategori", prev?.slug, slug);
    } else await db.insert(categories).values(values);
    await pingIndexNow([`/kategori/${slug}`]);
    await audit(staff.id, id ? "update" : "create", "category", id, `Kategori ${name} kaydedildi`);
    revalidatePath("/", "layout");
    return ok("Kategori kaydedildi.", { redirect: "/admin/kategoriler" });
  });
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("catalog.manage");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.categoryId, id));
    if (n) return fail(`Bu kategoride ${n} ürün var. Önce ürünleri taşıyın veya kategoriyi pasifleştirin.`);
    await db.update(categories).set({ parentId: null }).where(eq(categories.parentId, id));
    await db.delete(categories).where(eq(categories.id, id));
    await audit(staff.id, "delete", "category", id, "Kategori silindi");
    revalidatePath("/", "layout");
    return ok("Kategori silindi.", { redirect: "/admin/kategoriler" });
  });
}
