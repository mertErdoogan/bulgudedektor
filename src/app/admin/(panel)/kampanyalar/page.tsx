import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, campaigns, categories, orders, products } from "@/db/schema";
import { ActionButton, DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatTL } from "@/lib/utils";
import { deleteCampaign, toggleCampaign } from "./actions";
import { CampaignForm } from "./form";

export const metadata = { title: "Kampanyalar" };

function state(c: typeof campaigns.$inferSelect) {
  const now = new Date();
  if (!c.isActive) return <Badge>Durduruldu</Badge>;
  if (c.startsAt && c.startsAt > now) return <Badge tone="gold">Planlandı</Badge>;
  if (c.endsAt && c.endsAt < now) return <Badge tone="danger">Süresi doldu</Badge>;
  if (c.usageLimit !== null && c.usageCount >= c.usageLimit) return <Badge tone="danger">Limit doldu</Badge>;
  return <Badge tone="ok">Yayında</Badge>;
}

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ id?: string; yeni?: string }> }) {
  await requireStaff("campaigns.manage");
  const sp = await searchParams;
  const [rows, b, c, p] = await Promise.all([
    db
      .select({ c: campaigns, revenue: sql<number>`(select coalesce(sum(${orders.total}),0)::float from ${orders} where ${orders.campaignId} = ${campaigns.id} and ${orders.paymentStatus} = 'PAID')` })
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt)),
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.status, "ACTIVE")).orderBy(asc(products.name)),
  ]);
  const edit = sp.id ? rows.find((r) => r.c.id === sp.id)?.c : undefined;
  const showForm = !!edit || sp.yeni === "1";
  const desc_ = (x: typeof campaigns.$inferSelect) =>
    x.type === "PERCENT" ? `%${x.value} indirim` : x.type === "FIXED" ? `${formatTL(x.value)} indirim` : "Kargo bedava";
  return (
    <>
      <PageHeader
        title="Kampanyalar ve kuponlar"
        description="Kupon kodlu kampanyalar sepette kodla, kodsuz olanlar otomatik uygulanır (en avantajlısı)."
        actions={!showForm ? <Button asChild><Link href="/admin/kampanyalar?yeni=1">+ Yeni kampanya</Link></Button> : null}
      />
      {showForm ? (
        <CampaignForm campaign={edit} brands={b} categories={c} products={p} />
      ) : (
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Kampanya</Th>
                <Th>Kural</Th>
                <Th>Tarih</Th>
                <Th>Kullanım</Th>
                <Th>Durum</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c: x, revenue }) => (
                <tr key={x.id} className="hover:bg-soft/60">
                  <Td>
                    <Link href={`/admin/kampanyalar?id=${x.id}`} className="font-bold hover:text-link">{x.name}</Link>
                    <span className="block text-xs text-mute">{x.code ? <span className="font-mono font-bold text-deep">{x.code}</span> : "Otomatik"}{x.showOnSite ? " · sitede gösteriliyor" : ""}</span>
                  </Td>
                  <Td>
                    {desc_(x)}
                    <span className="block text-xs text-mute">
                      {x.scope === "ALL" ? "Tüm ürünler" : x.scope === "BRAND" ? "Seçili markalar" : x.scope === "CATEGORY" ? "Seçili kategoriler" : "Seçili ürünler"}
                      {x.minSubtotal ? ` · min ${formatTL(x.minSubtotal)}` : ""}
                    </span>
                  </Td>
                  <Td className="text-mute">{x.startsAt || x.endsAt ? `${formatDate(x.startsAt)} – ${formatDate(x.endsAt)}` : "Süresiz"}</Td>
                  <Td>
                    {x.usageCount}
                    {x.usageLimit ? ` / ${x.usageLimit}` : ""} sipariş
                    <span className="block text-xs text-mute">{formatTL(revenue)} ciro</span>
                  </Td>
                  <Td>{state(x)}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <ActionButton size="sm" variant="ghost" run={toggleCampaign.bind(null, x.id, !x.isActive)}>
                      {x.isActive ? "Durdur" : "Başlat"}
                    </ActionButton>
                    <DeleteButton run={deleteCampaign.bind(null, x.id)} confirmText={`${x.name} silinsin mi?`} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
