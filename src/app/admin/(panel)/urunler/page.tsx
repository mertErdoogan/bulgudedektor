import Link from "next/link";
import { and, asc, desc, eq, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { Download, Plus } from "lucide-react";
import { db } from "@/db";
import { brands, categories, productImages, products } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { Pagination } from "@/components/admin/pagination";
import { Button, Card, Input, Select } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { ProductTable } from "./product-table";
import { ImportCsv } from "./import-csv";

export const metadata = { title: "Ürünler" };
const PER = 25;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("products.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.s) || 1);
  const conds: SQL[] = [];
  if (sp.q) conds.push(or(ilike(products.name, `%${sp.q}%`), ilike(products.sku, `%${sp.q}%`), ilike(products.barcode, `%${sp.q}%`))!);
  if (sp.marka) conds.push(eq(products.brandId, sp.marka));
  if (sp.kategori) conds.push(eq(products.categoryId, sp.kategori));
  if (sp.durum) conds.push(eq(products.status, sp.durum as "ACTIVE"));
  if (sp.stok === "az") conds.push(lte(products.stock, products.lowStockThreshold));
  if (sp.stok === "yok") conds.push(lte(products.stock, 0));
  const where = conds.length ? and(...conds) : undefined;
  const sort = sp.sirala ?? "yeni";
  const orderBy =
    sort === "ad" ? asc(products.name) : sort === "fiyat" ? desc(products.price) : sort === "stok" ? asc(products.stock) : sort === "sira" ? asc(products.sortOrder) : desc(products.createdAt);

  const [rows, [{ total }], brandRows, catRows] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        price: products.price,
        costPrice: products.costPrice,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
        status: products.status,
        isFeatured: products.isFeatured,
        brand: brands.name,
        category: categories.name,
        image: sql<string | null>`(select ${productImages.url} from ${productImages} where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder} limit 1)`,
      })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brandId))
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(where)
      .orderBy(orderBy)
      .limit(PER)
      .offset((page - 1) * PER),
    db.select({ total: sql<number>`count(*)::int` }).from(products).where(where),
    db.select().from(brands).orderBy(asc(brands.sortOrder)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
  ]);

  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "s") as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Ürünler"
        description={`${total} ürün`}
        actions={
          <>
            <Button variant="outline" asChild>
              <a href={`/api/admin/export/products?${qs}`}>
                <Download size={16} /> CSV indir
              </a>
            </Button>
            {can(staff.permissions, "products.edit") ? <ImportCsv /> : null}
            {can(staff.permissions, "products.edit") ? (
              <Button asChild>
                <Link href="/admin/urunler/yeni">
                  <Plus size={16} /> Ürün ekle
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      <Card className="mb-4 p-3">
        <form className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_repeat(5,minmax(0,150px))_auto]">
          <Input name="q" defaultValue={sp.q} placeholder="Ad, SKU veya barkod ara" />
          <Select name="marka" defaultValue={sp.marka ?? ""}>
            <option value="">Tüm markalar</option>
            {brandRows.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select name="kategori" defaultValue={sp.kategori ?? ""}>
            <option value="">Tüm kategoriler</option>
            {catRows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select name="durum" defaultValue={sp.durum ?? ""}>
            <option value="">Tüm durumlar</option>
            <option value="ACTIVE">Yayında</option>
            <option value="DRAFT">Taslak</option>
            <option value="ARCHIVED">Arşiv</option>
          </Select>
          <Select name="stok" defaultValue={sp.stok ?? ""}>
            <option value="">Tüm stok</option>
            <option value="az">Az kalan</option>
            <option value="yok">Tükenen</option>
          </Select>
          <Select name="sirala" defaultValue={sort}>
            <option value="yeni">En yeni</option>
            <option value="ad">Ada göre</option>
            <option value="fiyat">Fiyat (yüksek)</option>
            <option value="stok">Stok (az)</option>
            <option value="sira">Vitrin sırası</option>
          </Select>
          <Button type="submit" variant="dark">
            Filtrele
          </Button>
        </form>
      </Card>
      <ProductTable rows={rows} showCost={can(staff.permissions, "products.cost")} canEdit={can(staff.permissions, "products.edit")} canDelete={can(staff.permissions, "products.delete")} />
      <Pagination page={page} per={PER} total={total} />
    </>
  );
}
