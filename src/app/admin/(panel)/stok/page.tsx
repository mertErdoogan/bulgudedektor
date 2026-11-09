import Link from "next/link";
import { and, asc, desc, eq, ilike, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, serialNumbers, stockAlerts, stockMovements, users } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Card, CardHeader, Field, Input, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { addSerials, adjustStockAction, deleteSerial, setSerialStatus } from "./actions";

export const metadata = { title: "Stok ve seri no" };

const REASON: Record<string, string> = {
  INITIAL: "Açılış",
  PURCHASE: "Mal girişi",
  SALE: "Satış",
  RETURN: "İade",
  ADJUST: "Sayım düzeltme",
  DAMAGE: "Hasar / fire",
  IMPORT: "CSV",
  CANCEL: "İptal",
  PAYMENT_FAILED: "Ödeme başarısız",
  SERIAL_STATUS: "Seri no durumu",
  SERIAL_DELETE: "Seri no silindi",
};
const SERIAL_LABEL: Record<string, string> = { IN_STOCK: "Stokta", RESERVED: "Ayrıldı", SOLD: "Satıldı", RETURNED: "İade", IN_SERVICE: "Serviste", DEFECTIVE: "Arızalı" };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ urun?: string; q?: string; az?: string }> }) {
  await requireStaff("inventory.manage");
  const sp = await searchParams;
  const list = await db
    .select({ id: products.id, name: products.name, sku: products.sku, stock: products.stock, low: products.lowStockThreshold, trackSerial: products.trackSerial, status: products.status })
    .from(products)
    .where(and(sp.q ? ilike(products.name, `%${sp.q}%`) : undefined, sp.az ? lte(products.stock, products.lowStockThreshold) : undefined))
    .orderBy(asc(products.stock), asc(products.name));
  const selId = sp.urun ?? list[0]?.id;
  const sel = selId ? await db.query.products.findFirst({ where: eq(products.id, selId) }) : null;
  const alerts = sel ? await db.select().from(stockAlerts).where(eq(stockAlerts.productId, sel.id)).orderBy(desc(stockAlerts.createdAt)) : [];
  const [moves, serials] = sel
    ? await Promise.all([
        db.select({ m: stockMovements, user: users.name }).from(stockMovements).leftJoin(users, eq(users.id, stockMovements.userId)).where(eq(stockMovements.productId, sel.id)).orderBy(desc(stockMovements.createdAt)).limit(30),
        db.select().from(serialNumbers).where(eq(serialNumbers.productId, sel.id)).orderBy(sql`case ${serialNumbers.status} when 'IN_STOCK' then 0 else 1 end`, asc(serialNumbers.serial)),
      ])
    : [[], []];

  return (
    <>
      <PageHeader title="Stok ve seri no" description="Mal girişi, sayım düzeltmesi ve seri numarası takibi. Her değişiklik hareket kaydına yazılır." />
      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="self-start">
          <form className="flex gap-2 border-b border-line p-3">
            <Input name="q" defaultValue={sp.q} placeholder="Ürün ara" />
            <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
              <input type="checkbox" name="az" defaultChecked={!!sp.az} className="accent-brand" /> Az kalan
            </label>
          </form>
          <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
            {list.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/stok?urun=${p.id}${sp.q ? `&q=${sp.q}` : ""}`} className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-soft ${p.id === selId ? "bg-tint" : ""}`}>
                  <span>
                    <span className="block font-semibold">{p.name}</span>
                    <span className="text-xs text-mute">
                      {p.sku} {p.trackSerial ? "· seri takipli" : ""}
                    </span>
                  </span>
                  <Badge tone={p.stock <= 0 ? "danger" : p.stock <= p.low ? "warn" : "neutral"}>{p.stock}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {sel ? (
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader
                title={sel.name}
                description={`Mevcut stok: ${sel.stock} · uyarı eşiği ${sel.lowStockThreshold}`}
                action={<Link href={`/admin/urunler/${sel.id}`} className="text-sm font-bold text-link">Ürünü düzenle →</Link>}
              />
              {sel.trackSerial ? (
                <ActionForm action={addSerials} resetOnSuccess className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-end">
                  <input type="hidden" name="productId" value={sel.id} />
                  <Field label="Mal girişi: seri numaraları" hint="Her satıra bir seri no (veya virgülle ayırın). Barkod okuyucu ile art arda okutabilirsiniz.">
                    <Textarea name="serials" placeholder={"3820-0009-2001\n3820-0009-2002"} className="font-mono" />
                  </Field>
                  <SubmitButton>Seri no ekle</SubmitButton>
                </ActionForm>
              ) : (
                <ActionForm action={adjustStockAction} resetOnSuccess className="grid gap-3 p-5 md:grid-cols-4 md:items-end">
                  <input type="hidden" name="productId" value={sel.id} />
                  <Field label="İşlem">
                    <Select name="mode" defaultValue="in">
                      <option value="in">Stok girişi (+)</option>
                      <option value="out">Stok çıkışı (−)</option>
                      <option value="set">Sayım: stoğu şu değere ayarla</option>
                    </Select>
                  </Field>
                  <Field label="Adet">
                    <Input name="qty" type="number" min={0} required />
                  </Field>
                  <Field label="Sebep">
                    <Select name="reason" defaultValue="PURCHASE">
                      <option value="PURCHASE">Mal girişi</option>
                      <option value="ADJUST">Sayım düzeltme</option>
                      <option value="DAMAGE">Hasar / fire</option>
                      <option value="RETURN">İade</option>
                    </Select>
                  </Field>
                  <SubmitButton>Uygula</SubmitButton>
                  <Field label="Not (isteğe bağlı)" className="md:col-span-4">
                    <Input name="note" placeholder="Fatura no, tedarikçi vb." />
                  </Field>
                </ActionForm>
              )}
            </Card>

            {sel.trackSerial ? (
              <Card>
                <CardHeader title="Seri numaraları" description={`${serials.filter((s) => s.status === "IN_STOCK").length} stokta · ${serials.filter((s) => s.status === "SOLD").length} satıldı`} />
                <Table>
                  <thead>
                    <tr>
                      <Th>Seri no</Th>
                      <Th>Durum</Th>
                      <Th>Satış / garanti</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {serials.map((s) => (
                      <tr key={s.id}>
                        <Td className="font-mono font-semibold">{s.serial}</Td>
                        <Td>
                          <Badge tone={s.status === "IN_STOCK" ? "ok" : s.status === "SOLD" ? "brand" : "warn"}>{SERIAL_LABEL[s.status]}</Badge>
                        </Td>
                        <Td className="text-mute">{s.soldAt ? `${formatDate(s.soldAt)} · garanti ${formatDate(s.warrantyUntil)}` : "—"}</Td>
                        <Td className="text-right whitespace-nowrap">
                          {s.status === "IN_STOCK" ? (
                            <ActionButton size="sm" variant="ghost" run={setSerialStatus.bind(null, s.id, "DEFECTIVE")} confirmText="Arızalı olarak işaretlensin mi? Stoktan düşer.">
                              Arızalı
                            </ActionButton>
                          ) : s.status !== "SOLD" ? (
                            <ActionButton size="sm" variant="ghost" run={setSerialStatus.bind(null, s.id, "IN_STOCK")}>
                              Stoğa al
                            </ActionButton>
                          ) : null}
                          {s.status !== "SOLD" ? (
                            <ActionButton size="sm" variant="danger-ghost" run={deleteSerial.bind(null, s.id)} confirmText={`${s.serial} silinsin mi?`}>
                              Sil
                            </ActionButton>
                          ) : null}
                        </Td>
                      </tr>
                    ))}
                    {!serials.length ? (
                      <tr>
                        <Td colSpan={4} className="py-8 text-center text-mute">Henüz seri numarası yok.</Td>
                      </tr>
                    ) : null}
                  </tbody>
                </Table>
              </Card>
            ) : null}

            {alerts.length ? (
              <Card>
                <CardHeader title="Gelince haber ver listesi" description="E-posta bırakanlara stok girişinde otomatik e-posta gider (SMTP ayarlıysa). Telefon bırakanları ara veya WhatsApp'tan yaz." />
                <ul className="divide-y divide-line">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex justify-between px-5 py-2.5 text-sm"><span>{a.contact}</span><span className="text-mute">{a.notified ? "Bildirildi" : "Bekliyor"} · {formatDate(a.createdAt)}</span></li>
                  ))}
                </ul>
              </Card>
            ) : null}
            <Card>
              <CardHeader title="Stok hareketleri" description="Son 30 hareket" />
              <Table>
                <thead>
                  <tr>
                    <Th>Tarih</Th>
                    <Th>Hareket</Th>
                    <Th>Sebep</Th>
                    <Th>Not</Th>
                    <Th>Kişi</Th>
                  </tr>
                </thead>
                <tbody>
                  {moves.map(({ m, user }) => (
                    <tr key={m.id}>
                      <Td className="text-mute">{formatDate(m.createdAt, true)}</Td>
                      <Td className={`font-bold ${m.delta > 0 ? "text-ok" : "text-danger"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</Td>
                      <Td>{REASON[m.reason] ?? m.reason}</Td>
                      <Td className="text-mute">{m.note ?? "—"}</Td>
                      <Td className="text-mute">{user ?? "Sistem"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
