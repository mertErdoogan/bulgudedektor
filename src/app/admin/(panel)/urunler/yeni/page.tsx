import { asc } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ProductForm } from "../product-form";

export const metadata = { title: "Yeni ürün" };

export default async function NewProduct() {
  const staff = await requireStaff("products.edit");
  const [b, c] = await Promise.all([db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.sortOrder)), db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder))]);
  return (
    <>
      <PageHeader title="Yeni ürün" description="Zorunlu alanlar: ad, SKU, fiyat. Yayına almak için en az bir görsel gerekir." />
      <ProductForm brands={b} categories={c} showCost={can(staff.permissions, "products.cost")} canDelete={false} />
    </>
  );
}
