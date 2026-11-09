import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, productImages, products } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { ProductStatusBadge } from "@/components/admin/status";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ProductForm } from "../product-form";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("products.view");
  const { id } = await params;
  const p = await db.query.products.findFirst({ where: eq(products.id, id), with: { images: { orderBy: asc(productImages.sortOrder) } } });
  if (!p) notFound();
  const [b, c] = await Promise.all([db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.sortOrder)), db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder))]);
  const showCost = can(staff.permissions, "products.cost");
  const canEdit = can(staff.permissions, "products.edit");
  return (
    <>
      <PageHeader
        title={p.name}
        description={
          <span className="flex items-center gap-2">
            <ProductStatusBadge status={p.status} /> SKU {p.sku}
            {!canEdit ? <span className="text-warn">· Sadece görüntüleme yetkin var</span> : null}
          </span>
        }
        actions={<Link href="/admin/urunler" className="text-sm font-bold text-link">← Tüm ürünler</Link>}
      />
      <fieldset disabled={!canEdit}>
        <ProductForm
          product={{ ...p, costPrice: showCost ? p.costPrice : null, images: p.images.map((i) => ({ url: i.url, alt: i.alt })) }}
          brands={b}
          categories={c}
          showCost={showCost}
          canDelete={can(staff.permissions, "products.delete")}
        />
      </fieldset>
    </>
  );
}
