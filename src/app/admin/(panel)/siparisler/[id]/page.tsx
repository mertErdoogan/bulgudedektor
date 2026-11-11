import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Printer } from "lucide-react";
import { db } from "@/db";
import { orderEvents, orders, replyTemplates, serialNumbers, users } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { OrderStatusBadge, PaymentStatusBadge, ReturnStatusBadge } from "@/components/admin/status";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { ORDER_FLOW } from "@/lib/orders";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { AssignSelect } from "@/components/admin/worklist";
import { TemplateComposer } from "@/components/admin/template-composer";
import { orderVars } from "@/lib/templates";
import { sendOrderMessage } from "../../sablonlar/actions";
import { orderKey } from "@/lib/store";
import { ORDER_STATUS_LABEL, formatDate, formatTL, orderNo } from "@/lib/utils";
import { assignSerials, changeStatus, saveInternalNote, saveInvoice, unassignSerial, updateShippingAddress } from "../actions";

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
  const tn = o.paymentMeta?.transferNotice;
  const [settings, team, templates] = await Promise.all([
    getSettings(),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true)),
    db.select({ id: replyTemplates.id, title: replyTemplates.title, category: replyTemplates.category, subject: replyTemplates.subject, body: replyTemplates.body }).from(replyTemplates).orderBy(asc(replyTemplates.sortOrder), asc(replyTemplates.title)),
  ]);
  const tplVars = orderVars(o, {
    store: settings.store,
    banks: settings.payment.bankAccounts,
    trackingTemplates: settings.shipping.trackingUrlTemplate,
    orderLink: `${process.env.APP_URL || ""}/siparis/${o.id}?k=${orderKey(o.id)}`,
    staffName: staff.name,
    formatTL,
    orderNo,
  });
  const waNo = o.phone.replace(/\D/g, "").replace(/^0/, "90").replace(/^5/, "905");
  const trackLink = o.carrier && o.trackingNumber ? settings.shipping.trackingUrlTemplate[o.carrier]?.replace("{code}", o.trackingNumber) : null;
  const waText = [
    `Merhaba ${(o.shippingAddress?.fullName ?? "").split(" ")[0]},`,
    `${settings.store.name} ${orderNo(o.number)} numaralı siparişinizin durumu: ${ORDER_STATUS_LABEL[o.status]}.`,
    trackLink ? `Kargo takip (${o.carrier}): ${trackLink}` : "",
    `Sipariş detayı: ${process.env.APP_URL || ""}/siparis/${o.id}?k=${orderKey(o.id)}`,
  ]
    .filter(Boolean)
    .join("\n");
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
            {manage ? <AssignSelect type="order" id={o.id} current={o.assigneeId} me={staff.id} staff={team} /> : null}
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
                    <div className="flex-1 text-sm">
                      <p>{o.paymentMethod === "TRANSFER" ? "Havale hesaba geçtiyse ödemeyi onayla." : "Ödeme bekleniyor."}</p>
                      {tn ? (
                        <p className="mt-2 rounded-lg bg-ok-bg p-2.5 text-ok">
                          <b>Müşteri ödeme bildirimi gönderdi</b> · {formatDate(new Date(tn.at), true)}
                          <br />
                          Gönderen: <b>{tn.sender}</b>
                          {tn.note ? <> · Not: {tn.note}</> : null}
                          {tn.receiptUrl ? (
                            <>
                              {" · "}
                              <a href={tn.receiptUrl} target="_blank" className="font-bold underline">
                                Dekontu aç
                              </a>
                            </>
                          ) : null}
                        </p>
                      ) : o.paymentMethod === "TRANSFER" ? (
                        <p className="mt-1 text-xs text-mute">Müşteri henüz ödeme bildirimi göndermedi. Açıklamada sipariş no: {orderNo(o.number)}</p>
                      ) : null}
                    </div>
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

          <Card id="seri" className="scroll-mt-20">
            <CardHeader title="Ürünler" description="Seri takipli cihazlar için seri numarasını buradan atayın." />
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
                  <span className={`absolute top-1 -left-[7px] h-3 w-3 rounded-full ${e.isPublic ? "bg-brand" : "bg-[#cfcfd4]"}`} />
                  <p className="text-sm font-semibold">{e.message}</p>
                  <p className="text-xs text-mute">
                    {formatDate(e.createdAt, true)} · {e.user?.name ?? "Sistem / müşteri"}
                  </p>
                </li>
              ))}
            </ol>
            {manage ? (
              <div className="border-t border-line p-4" id="mesaj">
                <p className="mb-2 text-sm font-bold">Müşteriye mesaj</p>
                <TemplateComposer
                  templates={templates}
                  vars={tplVars}
                  phone={o.phone}
                  action={sendOrderMessage}
                  hidden={{ orderId: o.id }}
                  canEmail={!o.email.endsWith(".local")}
                  suggest={o.status === "PENDING_PAYMENT" && o.paymentMethod === "TRANSFER" ? "havale" : o.status === "SHIPPED" ? "kargo" : o.status === "DELIVERED" ? "satis" : "siparis"}
                />
              </div>
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
              <a href={`https://wa.me/${waNo}?text=${encodeURIComponent(waText)}`} target="_blank" className="mt-1 font-bold text-[#128c4a]">WhatsApp&apos;tan durum bildir →</a>
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
              {o.invoiceUrl ? (
                <p className="mt-2 rounded-lg bg-ok-bg p-2 text-ok">
                  Fatura{o.invoiceNo ? ` ${o.invoiceNo}` : ""} · {o.invoicedAt ? formatDate(o.invoicedAt) : ""} ·{" "}
                  <a href={o.invoiceUrl} target="_blank" className="font-bold underline">
                    Aç
                  </a>
                </p>
              ) : null}
              {manage && !["CANCELLED", "PENDING"].includes(o.status) ? (
                <details className="mt-2" open={!o.invoiceUrl && o.paymentStatus === "PAID"}>
                  <summary className="cursor-pointer font-bold text-link">{o.invoiceUrl ? "Faturayı değiştir" : "Fatura ekle"}</summary>
                  <ActionForm action={saveInvoice} className="mt-3 flex flex-col gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <Input name="invoiceNo" defaultValue={o.invoiceNo ?? ""} placeholder="Fatura no (örn. ARN2026000001234)" />
                    <input type="file" name="file" accept="application/pdf" className="text-xs" />
                    <Input name="invoiceLink" placeholder="veya e-fatura portalı bağlantısı (https://…)" />
                    {o.invoiceUrl ? (
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" name="notify" /> Müşteriye tekrar e-posta gönder
                      </label>
                    ) : (
                      <p className="text-xs text-mute">Kaydedince müşteriye &quot;Faturan hazır&quot; e-postası gider.</p>
                    )}
                    <SubmitButton size="sm">Kaydet</SubmitButton>
                  </ActionForm>
                </details>
              ) : null}
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
