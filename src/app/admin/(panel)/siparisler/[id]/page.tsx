import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Printer } from "lucide-react";
import { db } from "@/db";
import { orderEvents, orders, serialNumbers } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { OrderStatusBadge, PaymentStatusBadge, ReturnStatusBadge } from "@/components/admin/status";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { ORDER_FLOW } from "@/lib/orders";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { ORDER_STATUS_LABEL, formatDate, formatTL, orderNo } from "@/lib/utils";
import { addCustomerMessage, assignSerials, changeStatus, saveInternalNote, unassignSerial, updateShippingAddress } from "../actions";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("orders.view");
  const { id } = await params;
  const o = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      items: { with: { serials: true, product: { columns: { trackSerial: true, slug: true } } } },
      events: { orderBy: desc(orderEvents.createdAt), with: { user: { columns: { name: true } } } },
      customer: true,
      returns: true,
      campaign: true,
    },
  });
  if (!o) notFound();
  const settings = await getSettings();
  const manage = can(staff.permissions, "orders.manage");
  const refund = can(staff.permissions, "orders.refund");
  const next = ORDER_FLOW[o.status] ?? [];
  const available = await Promise.all(
    o.items
      .filter((i) => i.product?.trackSerial && i.productId && i.serials.length < i.quantity)
      .map(async (i) => ({ itemId: i.id, serials: await db.select().from(serialNumbers).where(and(eq(serialNumbers.productId, i.productId!), eq(serialNumbers.status, "IN_STOCK"))).orderBy(asc(serialNumbers.serial)) })),
  );
  const a = o.shippingAddress;
  const trackUrl = o.carrier && o.trackingNumber ? settings.shipping.trackingUrlTemplate[o.carrier]?.replace("{code}", o.trackingNumber) : null;
  const profit = o.items.reduce((s, i) => s + (i.unitCost ? (i.unitPrice - i.unitCost) * i.quantity : 0), 0);

  return (
    <>
      <PageHeader
        title={`Sipariş ${orderNo(o.number)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={o.status} /> <PaymentStatusBadge status={o.paymentStatus} /> {formatDate(o.createdAt, true)}
          </span>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/admin/yazdir?ids=${o.id}`} target="_blank">
                <Printer size={16} /> Paket fişi / proforma
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/admin/siparisler">← Siparişler</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          {manage && next.length ? (
            <Card className="border-brand">
              <CardHeader title="Sıradaki adım" description="Durumu değiştirdiğinde müşterinin sipariş takip sayfası güncellenir." />
              <div className="flex flex-col gap-4 p-5">
                {next.includes("PAID") ? (
                  <ActionForm action={changeStatus} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="to" value="PAID" />
                    <p className="flex-1 text-sm">{o.paymentMethod === "TRANSFER" ? "Havale hesaba geçtiyse ödemeyi onayla." : "Ödeme bekleniyor."}</p>
                    <SubmitButton>Ödeme alındı</SubmitButton>
                  </ActionForm>
                ) : null}
                {next.includes("PREPARING") ? (
                  <ActionForm action={changeStatus} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="to" value="PREPARING" />
                    <p className="flex-1 text-sm">Paketlemeye başla (müşteriye &quot;Hazırlanıyor&quot; görünür).</p>
                    <SubmitButton variant="outline">Hazırlanıyor</SubmitButton>
                  </ActionForm>
                ) : null}
                {next.includes("SHIPPED") ? (
                  <ActionForm action={changeStatus} className="grid gap-3 rounded-xl bg-soft p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="to" value="SHIPPED" />
                    {o.deliveryMethod === "CARGO" ? (
                      <>
                        <Field label="Kargo firması">
                          <Select name="carrier" defaultValue={settings.shipping.defaultCarrier}>
                            {settings.shipping.carriers.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Takip numarası">
                          <Input name="tracking" required />
                        </Field>
                        <SubmitButton>Kargoya verildi</SubmitButton>
                      </>
                    ) : (
                      <>
                        <p className="text-sm md:col-span-2">Showroom teslimi: ürün hazır olduğunda müşteriye bildir.</p>
                        <SubmitButton>Teslime hazır</SubmitButton>
                      </>
                    )}
                  </ActionForm>
                ) : null}
                {next.includes("DELIVERED") ? (
                  <ActionForm action={changeStatus} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="to" value="DELIVERED" />
                    <p className="flex-1 text-sm">Teslim edildiyse işaretle; garanti ve 14 günlük iade süresi takibi başlar.</p>
                    <SubmitButton variant="outline">Teslim edildi</SubmitButton>
                  </ActionForm>
                ) : null}
                {(next.includes("CANCELLED") || next.includes("REFUNDED")) && (o.paymentStatus !== "PAID" || refund) ? (
                  <details className="rounded-xl border border-danger/20 p-4">
                    <summary className="cursor-pointer text-sm font-bold text-danger">İptal / iade et</summary>
                    <ActionForm
                      action={changeStatus}
                      confirm="Bu işlem stoğu geri ekler ve ödeme alındıysa iade başlatır. Emin misin?"
                      className="mt-3 grid gap-3 md:grid-cols-3 md:items-end"
                    >
                      <input type="hidden" name="orderId" value={o.id} />
                      <Field label="İşlem">
                        <Select name="to" defaultValue={next.includes("CANCELLED") ? "CANCELLED" : "REFUNDED"}>
                          {next.includes("CANCELLED") ? <option value="CANCELLED">İptal et</option> : null}
                          {next.includes("REFUNDED") ? <option value="REFUNDED">İade et (ürün geri geldi)</option> : null}
                        </Select>
                      </Field>
                      {o.paymentStatus === "PAID" ? (
                        <Field label="İade tutarı (TL)" hint="Kısmi iade için düşür">
                          <Input name="refundAmount" defaultValue={o.total} inputMode="decimal" />
                        </Field>
                      ) : null}
                      <Field label="Not">
                        <Input name="note" placeholder="Sebep" />
                      </Field>
                      <SubmitButton variant="danger" className="md:col-span-3 md:justify-self-start">
                        Onayla
                      </SubmitButton>
                    </ActionForm>
                  </details>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Ürünler" />
            <Table>
              <thead>
                <tr>
                  <Th>Ürün</Th>
                  <Th className="text-right">Adet</Th>
                  <Th className="text-right">Birim</Th>
                  <Th className="text-right">Tutar</Th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i) => {
                  const av = available.find((x) => x.itemId === i.id);
                  return (
                    <tr key={i.id}>
                      <Td>
                        {i.productId ? (
                          <Link href={`/admin/urunler/${i.productId}`} className="font-bold hover:text-link">
                            {i.name}
                          </Link>
                        ) : (
                          <b>{i.name}</b>
                        )}
                        <span className="block text-xs text-mute">SKU {i.sku}</span>
                        {i.serials.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {i.serials.map((s) => (
                              <span key={s.id} className="inline-flex items-center gap-1 rounded bg-pop px-2 py-0.5 font-mono text-xs">
                                {s.serial}
                                {manage && !["SHIPPED", "DELIVERED"].includes(o.status) ? (
                                  <ActionButton variant="link" size="sm" className="text-danger" run={unassignSerial.bind(null, s.id)}>
                                    ×
                                  </ActionButton>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {manage && av ? (
                          <ActionForm action={assignSerials} className="mt-2 flex flex-wrap items-center gap-2">
                            <input type="hidden" name="itemId" value={i.id} />
                            <Select name="serialIds" className="h-8 w-56 text-xs" required defaultValue="">
                              <option value="" disabled>
                                Seri no seç ({i.quantity - i.serials.length} gerekli)
                              </option>
                              {av.serials.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.serial}
                                </option>
                              ))}
                            </Select>
                            <SubmitButton size="sm" variant="outline">
                              Ata
                            </SubmitButton>
                            {!av.serials.length ? <Badge tone="danger">Stokta seri no yok</Badge> : null}
                          </ActionForm>
                        ) : null}
                      </Td>
                      <Td className="text-right">{i.quantity}</Td>
                      <Td className="text-right">{formatTL(i.unitPrice)}</Td>
                      <Td className="text-right font-bold">{formatTL(i.total)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <div className="ml-auto flex max-w-sm flex-col gap-1.5 p-5 text-sm">
              <div className="flex justify-between">
                <span className="text-mute">Ara toplam</span>
                <span>{formatTL(o.subtotal)}</span>
              </div>
              {o.discountTotal ? (
                <div className="flex justify-between text-ok">
                  <span>İndirim {o.couponCode ? `(${o.couponCode})` : o.campaign ? `(${o.campaign.name})` : ""}</span>
                  <span>−{formatTL(o.discountTotal)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-mute">Kargo</span>
                <span>{o.shippingTotal ? formatTL(o.shippingTotal) : "Ücretsiz"}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
                <span>Toplam</span>
                <span>{formatTL(o.total)}</span>
              </div>
              {can(staff.permissions, "products.cost") && profit ? <div className="flex justify-between text-xs text-mute"><span>Brüt kâr (KDV dahil, indirim öncesi)</span><span>{formatTL(profit)}</span></div> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Sipariş geçmişi" description="Yeşil olanlar müşterinin takip sayfasında görünür." />
            <ol className="flex flex-col gap-0 p-5">
              {o.events.map((e) => (
                <li key={e.id} className="relative border-l-2 border-line pb-4 pl-5 last:pb-0">
                  <span className={`absolute top-1 -left-[7px] h-3 w-3 rounded-full ${e.isPublic ? "bg-brand" : "bg-[#c9cfc6]"}`} />
                  <p className="text-sm font-semibold">{e.message}</p>
                  <p className="text-xs text-mute">
                    {formatDate(e.createdAt, true)} · {e.user?.name ?? "Sistem / müşteri"}
                  </p>
                </li>
              ))}
            </ol>
            {manage ? (
              <ActionForm action={addCustomerMessage} resetOnSuccess className="flex gap-2 border-t border-line p-4">
                <input type="hidden" name="orderId" value={o.id} />
                <Input name="message" placeholder="Müşterinin takip sayfasına not ekle (ör. 'Faturanız e-postanıza gönderildi')" />
                <SubmitButton variant="outline">Ekle</SubmitButton>
              </ActionForm>
            ) : null}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Müşteri" action={o.customer ? <Link href={`/admin/musteriler/${o.customer.id}`} className="text-sm font-bold text-link">Profil →</Link> : null} />
            <div className="flex flex-col gap-1 p-5 text-sm">
              <b>{a.fullName}</b>
              <a href={`tel:${o.phone}`} className="text-link">{o.phone}</a>
              <a href={`mailto:${o.email}`} className="text-link">{o.email}</a>
              <a href={`https://wa.me/${o.phone.replace(/\D/g, "")}`} target="_blank" className="mt-1 font-bold text-[#128c4a]">WhatsApp&apos;tan yaz →</a>
              {o.customerNote ? <p className="mt-2 rounded-lg bg-warn-bg p-2 text-warn">Müşteri notu: {o.customerNote}</p> : null}
            </div>
          </Card>
          <Card>
            <CardHeader title={o.deliveryMethod === "PICKUP" ? "Showroom'dan teslim" : "Teslimat adresi"} />
            <div className="p-5 text-sm">
              <p>
                {a.fullName} · {a.phone}
                <br />
                {a.line}
                <br />
                {a.district} / {a.city} {a.zip}
              </p>
              {o.carrier ? (
                <p className="mt-3">
                  <b>{o.carrier}</b> · {o.trackingNumber}{" "}
                  {trackUrl ? (
                    <a href={trackUrl} target="_blank" className="font-bold text-link">
                      Takip →
                    </a>
                  ) : null}
                </p>
              ) : null}
              {manage && !["SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status) ? (
                <details className="mt-3">
                  <summary className="cursor-pointer font-bold text-link">Adresi düzenle</summary>
                  <ActionForm action={updateShippingAddress} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <Input name="fullName" defaultValue={a.fullName} placeholder="Ad soyad" />
                    <Input name="phone" defaultValue={a.phone} placeholder="Telefon" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input name="city" defaultValue={a.city} placeholder="İl" />
                      <Input name="district" defaultValue={a.district} placeholder="İlçe" />
                    </div>
                    <Textarea name="line" defaultValue={a.line} className="min-h-[60px]" />
                    <Input name="zip" defaultValue={a.zip ?? ""} placeholder="Posta kodu" />
                    <SubmitButton size="sm">Kaydet</SubmitButton>
                  </ActionForm>
                </details>
              ) : null}
            </div>
          </Card>
          <Card>
            <CardHeader title="Ödeme ve fatura" />
            <div className="flex flex-col gap-1.5 p-5 text-sm">
              <p>
                {o.paymentMethod === "CARD" ? "Kredi / banka kartı" : "Havale / EFT"} · {o.installments > 1 ? `${o.installments} taksit` : "Tek çekim"}
              </p>
              {o.paymentRef ? <p className="text-xs text-mute">iyzico ödeme no: {o.paymentRef}</p> : null}
              <p className="mt-2">
                {o.invoiceType === "CORPORATE" ? (
                  <>
                    <b>Kurumsal fatura</b>
                    <br />
                    {o.companyName}
                    <br />
                    {o.taxOffice} · VKN {o.taxNumber}
                  </>
                ) : (
                  "Bireysel fatura"
                )}
              </p>
            </div>
          </Card>
          {o.returns.length ? (
            <Card>
              <CardHeader title="İade talepleri" />
              <ul className="divide-y divide-line">
                {o.returns.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <Link href={`/admin/iadeler?id=${r.id}`} className="font-semibold text-link">{r.reason}</Link>
                    <ReturnStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card>
            <CardHeader title="İç not" description="Sadece ekip görür." />
            <ActionForm action={saveInternalNote} className="flex flex-col gap-2 p-5">
              <input type="hidden" name="orderId" value={o.id} />
              <Textarea name="internalNote" defaultValue={o.internalNote ?? ""} disabled={!manage} />
              {manage ? <SubmitButton size="sm" variant="outline">Notu kaydet</SubmitButton> : null}
            </ActionForm>
          </Card>
          <p className="text-xs text-mute">Durum akışı: {Object.keys(ORDER_FLOW).map((k) => ORDER_STATUS_LABEL[k]).join(" → ")}</p>
        </div>
      </div>
    </>
  );
}
