import { q } from "@/db/q";
import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bundleItems, bundles, orders, products } from "@/db/schema";
import { ActionButton, DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { TranslationFields } from "@/components/admin/translation-fields";
import { Badge, Button, Card, EmptyState, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getEntityTranslations } from "@/lib/i18n/content";
import { bundleSetDiscount } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTL } from "@/lib/utils";
import { deleteBundle, toggleBundle } from "./actions";
import { BundleForm } from "./form";

export const metadata = { title: "Paketler" };

function state(b: typeof bundles.$inferSelect) {
  const now = new Date();
  if (!b.isActive) return <Badge>Durduruldu</Badge>;
  if (b.startsAt && b.startsAt > now) return <Badge tone="gold">Planlandı</Badge>;
  if (b.endsAt && b.endsAt < now) return <Badge tone="danger">Süresi doldu</Badge>;
  return <Badge tone="ok">Yayında</Badge>;
}

export default async function BundlesPage({ searchParams }: { searchParams: Promise<{ id?: string; yeni?: string }> }) {
  await requireStaff("campaigns.manage");
  const sp = await searchParams;
  const [rows, prods, st, usage] = await Promise.all([
    db.query.bundles.findMany({ with: { items: { orderBy: asc(bundleItems.sortOrder), with: { product: { columns: { id: true, name: true, price: true, stock: true, status: true } } } } }, orderBy: [asc(bundles.sortOrder), desc(bundles.createdAt)] }),
    db.select({ id: products.id, name: products.name, price: products.price, stock: products.stock }).from(products).where(eq(products.status, "ACTIVE")).orderBy(asc(products.name)),
    getSettings(),
    // Paket indiriminin uygulandığı ödenmiş siparişler (paket başına adet ve ciro)
    db
      .select({ id: sql<string>`b->>'id'`, n: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${q(orders.total)}),0)::float` })
      .from(sql`${orders}, jsonb_array_elements(coalesce(${q(orders.appliedBundles)}, '[]'::jsonb)) b`)
      .where(sql`${q(orders.paymentStatus)} = 'PAID'`)
      .groupBy(sql`b->>'id'`),
  ]);
  const used = new Map(usage.map((u) => [u.id, u]));
  const edit = sp.id ? rows.find((r) => r.id === sp.id) : undefined;
  const showForm = !!edit || sp.yeni === "1";
  const trs = edit ? await getEntityTranslations("bundle", edit.id) : undefined;
  return (
    <>
      <PageHeader
        title="Paketler (kombin)"
        description="Birlikte alınınca indirimli ürün grupları: ör. dedektör + pinpointer + kulaklık. Paket, içindeki ürünlerin sayfasında görünür; indirim sepette otomatik uygulanır."
        actions={!showForm ? <Button asChild><Link href="/admin/paketler?yeni=1">+ Yeni paket</Link></Button> : null}
      />
      {showForm ? (
        <BundleForm
          bundle={edit ? { ...edit, items: edit.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) } : undefined}
          products={prods}
          translations={
            <TranslationFields
              values={trs}
              enabled={st.i18n.locales}
              fields={[
                { field: "name", label: "Paket adı" },
                { field: "description", label: "Açıklama", multiline: true },
              ]}
            />
          }
        />
      ) : rows.length ? (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Paket</Th>
                <Th>Ürünler</Th>
                <Th className="text-right">Fiyat</Th>
                <Th>Satış</Th>
                <Th>Durum</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const setPrice = b.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
                const disc = bundleSetDiscount(b, setPrice);
                const u = used.get(b.id);
                const blocked = b.items.some((i) => i.product.status !== "ACTIVE" || i.product.stock < i.quantity);
                return (
                  <tr key={b.id} className="align-top hover:bg-soft/60" data-testid="bundle-row">
                    <Td>
                      <Link href={`/admin/paketler?id=${b.id}`} className="font-bold hover:text-link">{b.name}</Link>
                      <span className="block text-xs text-mute">{b.discountType === "PERCENT" ? `%${b.discountValue} indirim` : `${formatTL(b.discountValue)} indirim`}{b.startsAt || b.endsAt ? ` · ${formatDate(b.startsAt)} – ${formatDate(b.endsAt)}` : ""}</span>
                    </Td>
                    <Td className="text-sm">
                      {b.items.map((i) => (
                        <span key={i.id} className="block">{i.quantity > 1 ? `${i.quantity}× ` : ""}{i.product.name}</span>
                      ))}
                      {blocked ? <span className="mt-1 block text-xs font-bold text-warn">Stokta olmayan ürün var: sitede gizli</span> : null}
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      <s className="block text-xs text-mute">{formatTL(setPrice)}</s>
                      <b>{formatTL(setPrice - disc)}</b>
                    </Td>
                    <Td className="text-sm">{u ? `${u.n} sipariş` : "—"}{u ? <span className="block text-xs text-mute">{formatTL(u.revenue)} ciro</span> : null}</Td>
                    <Td>{state(b)}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <ActionButton size="sm" variant="ghost" run={toggleBundle.bind(null, b.id, !b.isActive)}>{b.isActive ? "Durdur" : "Başlat"}</ActionButton>
                      <DeleteButton run={deleteBundle.bind(null, b.id)} confirmText={`${b.name} silinsin mi?`} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      ) : (
        <EmptyState title="Henüz paket yok" description="Sık birlikte alınan ürünleri indirimli paket yap: sepet tutarı artar, müşteri ayrı ayrı aramaz." action={<Button asChild><Link href="/admin/paketler?yeni=1">+ İlk paketi oluştur</Link></Button>} />
      )}
    </>
  );
}
