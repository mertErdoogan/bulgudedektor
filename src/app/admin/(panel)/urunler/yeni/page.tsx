import { asc } from "drizzle-orm";
import { db } from "@/db";
import { categoryOptions } from "@/lib/category-options";
import { brands } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ProductForm } from "../product-form";
import { aiConfig } from "@/lib/ai";

export const metadata = { title: "Yeni ürün" };

export default async function NewProduct() {
  const staff = await requireStaff("products.edit");
  const [b, c] = await Promise.all([db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.sortOrder)), categoryOptions()]);
  return (
    <>
      <PageHeader title="Yeni ürün" description="Zorunlu alanlar: ad, SKU, fiyat. Yayına almak için en az bir görsel gerekir." />
      <ProductForm brands={b} categories={c} showCost={can(staff.permissions, "products.cost")} canDelete={false} ai={{ ready: (await aiConfig()).ready, canConfigure: can(staff.permissions, "settings.manage") }} />
    </>
  );
}
