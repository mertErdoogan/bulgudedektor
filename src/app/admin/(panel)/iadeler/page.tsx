import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { returnRequests } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { PageHeader } from "@/components/admin/shell";
import { ReturnStatusBadge } from "@/components/admin/status";
import { Card, CardHeader, EmptyState, Field, Input, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { describeReturn, paidShare } from "@/lib/returns";
import { formatDate, formatTL, orderNo, PAYMENT_METHOD_LABEL } from "@/lib/utils";
import { updateReturn } from "./actions";

export const metadata = { title: "İadeler" };

export default async function ReturnsPage({ searchParams }: { searchParams: Promise<{ id?: string; durum?: string }> }) {
  const staff = await requireStaff("orders.view");
  const sp = await searchParams;
  const rows = await db.query.returnRequests.findMany({
    where: sp.durum ? eq(returnRequests.status, sp.durum as "REQUESTED") : undefined,
    orderBy: desc(returnRequests.createdAt),
    with: { order: { with: { items: true } } },
    limit: 200,
  });
  const sel = rows.find((r) => r.id === sp.id) ?? rows.find((r) => r.status === "REQUESTED");
  // Önerilen iade: müşterinin bu ürünler için gerçekten ödediği tutar (kampanya + havale indirimi düşülmüş)
  const suggested = sel ? (sel.items.length ? Math.min(await paidShare(sel.orderId, sel.items), sel.order.total) : sel.order.total) : 0;
  const days = (d: Date | null) => (d ? Math.floor((Date.now() - d.getTime()) / 86400000) : null);
  return (
    <>
      <PageHeader title="İadeler" description="Müşteri hesabından veya panelden açılan iade talepleri. 14 günlük cayma hakkı teslim tarihinden itibaren sayılır." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          {rows.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Talep</Th>
                  <Th>Sipariş</Th>
                  <Th>Sebep</Th>
                  <Th>Durum</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.id === sel?.id ? "bg-tint" : "hover:bg-soft/60"}>
                    <Td>
                      <Link href={`/admin/iadeler?id=${r.id}`} className="font-bold text-link">{formatDate(r.createdAt)}</Link>
                      <span className="block text-xs text-mute">{r.order.shippingAddress.fullName}</span>
                    </Td>
                    <Td>{orderNo(r.order.number)}</Td>
                    <Td className="max-w-[260px]">
                      <span className="block truncate">{r.reason}</span>
                      <span className="block truncate text-xs text-mute">{describeReturn(r.items)}</span>
                    </Td>
                    <Td><ReturnStatusBadge status={r.status} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="İade talebi yok" />
          )}
        </Card>
        {sel ? (
          <Card className="self-start">
            <CardHeader title="İade detayı" action={<Link href={`/admin/siparisler/${sel.orderId}`} className="text-sm font-bold text-link">Sipariş →</Link>} />
            <div className="flex flex-col gap-3 p-5 text-sm">
              <p><b>Sebep:</b> {sel.reason}</p>
              {sel.details ? <p className="rounded-lg bg-soft p-3">{sel.details}</p> : null}
              <div className="rounded-lg border border-line p-3" data-testid="return-items">
                <b className="text-xs uppercase tracking-wide text-mute">İade edilen</b>
                {sel.items.length ? (
                  <ul className="mt-1 flex flex-col gap-1">
                    {sel.items.map((x) => (
                      <li key={x.orderItemId} className="flex justify-between gap-2">
                        <span>
                          <b>{x.quantity}×</b> {x.name}
                          {x.serials.length ? <span className="block font-mono text-xs text-mute">seri {x.serials.join(", ")}</span> : null}
                        </span>
                        <span>{formatTL(x.unitPrice * x.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">Siparişin tamamı ({sel.order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")})</p>
                )}
                {sel.items.length && sel.items.reduce((n, x) => n + x.quantity, 0) < sel.order.items.reduce((n, i) => n + i.quantity, 0) ? (
                  <p className="mt-2 text-xs font-bold text-warn">Kısmi iade: siparişteki diğer ürünler müşteride kalıyor. Yalnızca bu adetler stoğa döner.</p>
                ) : null}
              </div>
              <p>
                <b>Sipariş tutarı:</b> {formatTL(sel.order.total)} · {PAYMENT_METHOD_LABEL[sel.order.paymentMethod]}
              </p>
              <p>
                <b>Teslimden bu yana:</b>{" "}
                {sel.order.deliveredAt ? (
                  <span className={(days(sel.order.deliveredAt) ?? 0) > 14 ? "font-bold text-danger" : ""}>{days(sel.order.deliveredAt)} gün</span>
                ) : (
                  "Teslim bilgisi yok"
                )}
              </p>
              {sel.returnCode ? <p><b>İade kargo kodu:</b> <span className="font-mono">{sel.returnCode}</span></p> : null}
              {sel.refundAmount ? <p><b>İade edilen:</b> {formatTL(sel.refundAmount)}</p> : null}
              {can(staff.permissions, "orders.manage") && !["REFUNDED", "REJECTED"].includes(sel.status) ? (
                <ActionForm action={updateReturn} key={sel.id} className="mt-2 flex flex-col gap-3 border-t border-line pt-4 [&:has(option[value=REFUNDED]:checked)_.refund-amt]:block">
                  <input type="hidden" name="id" value={sel.id} />
                  <Field label="İşlem">
                    <Select name="to" defaultValue={sel.status === "REQUESTED" ? "APPROVED" : sel.status === "APPROVED" ? "RECEIVED" : "REFUNDED"}>
                      {sel.status === "REQUESTED" ? <option value="APPROVED">Onayla, kargo kodu ver</option> : null}
                      {["REQUESTED", "APPROVED"].includes(sel.status) ? <option value="RECEIVED">Ürün bize ulaştı</option> : null}
                      {can(staff.permissions, "orders.refund") ? <option value="REFUNDED">Para iadesini yap</option> : null}
                      <option value="REJECTED">Reddet</option>
                    </Select>
                  </Field>
                  {can(staff.permissions, "orders.refund") ? (
                    // Yalnızca "Para iadesini yap" seçiliyken görünür; onaylarken "para mı iade ediyorum?" karışıklığı olmasın
                    <div className="refund-amt hidden">
                      <Field label="İade tutarı (TL)" hint={sel.items.length ? "Müşterinin bu ürünler için ödediği tutar yazıldı (kampanya ve havale indirimi düşülmüş, kargo hariç). Kartla ödendiyse otomatik iade gider." : "Kısmi iade için düşür. Kartla ödendiyse otomatik iade gider."}>
                        <Input name="refundAmount" defaultValue={suggested} inputMode="decimal" data-testid="refund-amount" />
                      </Field>
                      {sel.order.paymentMethod !== "CARD" ? (
                        <p className="mt-2 rounded-lg bg-warn-bg p-2.5 text-xs font-bold text-warn" data-testid="manual-refund-note">
                          Bu sipariş {sel.order.paymentMethod === "TRANSFER" ? "havale/EFT" : sel.order.paymentMethod === "CASH" ? "nakit" : "POS cihazından kart"} ile ödendi: para otomatik geri gitmez.
                          {sel.order.paymentMethod === "TRANSFER" ? " Tutarı müşterinin IBAN'ına bankadan sen gönder" : sel.order.paymentMethod === "CASH" ? " Tutarı kasadan müşteriye ver" : " İadeyi POS cihazından yap"}; buradaki kayıt yalnızca işlemi deftere işler.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <Field label="Açıklama" hint="Reddederken zorunlu; müşteriye gösterilir.">
                    <Textarea name="resolution" defaultValue={sel.resolution ?? ""} className="min-h-[60px]" />
                  </Field>
                  <SubmitButton>Uygula</SubmitButton>
                </ActionForm>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
