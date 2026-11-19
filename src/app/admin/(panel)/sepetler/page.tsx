import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Card, EmptyState, Stat, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { imgUrl } from "@/lib/img";
import { cartStats, listCarts, type CartView } from "@/lib/live-carts";
import { getSettings } from "@/lib/settings";
import { formatTL } from "@/lib/utils";
import { sendCartReminder } from "./actions";

export const metadata = { title: "Canlı ve terk edilen sepetler" };

const TABS: [CartView, string][] = [
  ["canli", "Şu an aktif"],
  ["terk", "Terk edilen"],
  ["donusen", "Siparişe dönüşen"],
];

function ago(d: Date) {
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.round(h / 24)} gün önce`;
}

export default async function CartsPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await requireStaff("orders.view");
  const sp = await searchParams;
  const view: CartView = TABS.some(([k]) => k === sp.t) ? (sp.t as CartView) : "canli";
  const [stats, rows, s] = await Promise.all([cartStats(), listCarts(view), getSettings()]);
  const wa = (phone: string, name: string | null) =>
    `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "90")}?text=${encodeURIComponent(`Merhaba${name ? ` ${name.split(" ")[0]}` : ""}, ${s.store.name}'dan yazıyorum. Sepetinde bıraktığın ürünlerle ilgili yardımcı olabileceğim bir şey var mı?`)}`;

  return (
    <>
      <PageHeader
        title="Sepetler"
        description="Sitede şu an kimin sepetinde ne var, hangi sepetler yarıda kaldı. Ziyaretçi sepetleri yalnızca analiz çerezine izin verilmişse ya da üye girişi varsa görünür."
        actions={view === "canli" ? <LiveRefresh seconds={30} /> : null}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="cart-stats">
        <Stat label="Şu an aktif sepet" value={stats.live.n} sub={`${formatTL(stats.live.v)} sepette`} tone={stats.live.n ? "ok" : undefined} />
        <Stat label="Terk edilen (7 gün)" value={stats.abandoned.n} sub={`${formatTL(stats.abandoned.v)} kaçan tutar`} tone={stats.abandoned.n ? "warn" : undefined} />
        <Stat label="Siparişe dönüşen (7 gün)" value={stats.converted.n} sub={stats.rate !== null ? `Dönüşüm %${stats.rate}` : "Henüz veri yok"} />
        <Stat label="Hatırlatma e-postası (7 gün)" value={stats.reminders.sent} sub={`${stats.reminders.back} tanesi siparişe döndü`} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin/sepetler?t=${k}`} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === k ? "bg-deep text-white" : "bg-white hover:bg-tint"}`}>
            {l}
          </Link>
        ))}
      </div>

      <Card>
        {rows.length ? (
          <Table data-testid="cart-table">
            <thead>
              <tr>
                <Th>Kim</Th>
                <Th>Sepet</Th>
                <Th className="text-right">Tutar</Th>
                <Th>{view === "donusen" ? "Sipariş" : "Son hareket"}</Th>
                {view === "terk" ? <Th>Geri kazan</Th> : <Th>Sayfa</Th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-soft/60" data-testid="cart-row">
                  <Td className="min-w-[160px]">
                    {r.customerId ? (
                      <Link href={`/admin/musteriler/${r.customerId}`} className="font-bold text-link">{r.name || r.email}</Link>
                    ) : r.email ? (
                      <b>{r.name || r.email}</b>
                    ) : (
                      <span className="text-mute">Ziyaretçi</span>
                    )}
                    {r.email && (r.name || r.customerId) ? <span className="block text-xs text-mute">{r.email}</span> : null}
                    <span className="mt-1 flex flex-wrap gap-1">
                      {r.customerId ? <Badge tone="ok">Üye</Badge> : null}
                      {r.locale === "en" ? <Badge>EN</Badge> : null}
                    </span>
                  </Td>
                  <Td>
                    <ul className="flex flex-col gap-1.5">
                      {r.lines.map((l) => (
                        <li key={l.productId} className="flex items-center gap-2">
                          {l.product?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgUrl(l.product.image, 96)} alt="" className="h-9 w-9 rounded-md border border-line object-contain" />
                          ) : (
                            <span className="h-9 w-9 rounded-md bg-soft" />
                          )}
                          <span className="text-sm">
                            <b>{l.qty}×</b> {l.product ? <Link href={`/admin/urunler/${l.productId}`} className="hover:underline">{l.product.name}</Link> : <span className="text-mute">Silinmiş ürün</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Td>
                  <Td className="whitespace-nowrap text-right font-bold">{formatTL(r.value)}</Td>
                  <Td className="whitespace-nowrap text-sm">
                    {view === "donusen" && r.orderId ? (
                      <Link href={`/admin/siparisler/${r.orderId}`} className="font-bold text-link">Siparişe git →</Link>
                    ) : (
                      ago(r.updatedAt)
                    )}
                    <span className="block text-xs text-mute">Başlangıç: {ago(r.createdAt)}</span>
                  </Td>
                  {view === "terk" ? (
                    <Td className="min-w-[180px] text-sm">
                      <div className="flex flex-col gap-1.5">
                        {r.remindedAt ? <span className="text-xs text-mute">Hatırlatma: {ago(r.remindedAt)}</span> : null}
                        {r.email && r.consent ? (
                          <ActionForm action={sendCartReminder}>
                            <input type="hidden" name="id" value={r.id} />
                            <SubmitButton size="sm" variant="outline">E-postayla hatırlat</SubmitButton>
                          </ActionForm>
                        ) : r.email ? (
                          <span className="text-xs text-mute">E-posta izni yok</span>
                        ) : null}
                        {r.phone ? (
                          <a href={wa(r.phone, r.name)} target="_blank" rel="noreferrer" className="text-xs font-bold text-link">WhatsApp&apos;tan yaz →</a>
                        ) : null}
                        {!r.email && !r.phone ? <span className="text-xs text-mute">İletişim bilgisi yok</span> : null}
                      </div>
                    </Td>
                  ) : (
                    <Td className="max-w-[200px] truncate text-xs text-mute">{r.path ?? "—"}</Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            title={view === "canli" ? "Şu an aktif sepet yok" : view === "terk" ? "Terk edilen sepet yok" : "Henüz siparişe dönüşen sepet yok"}
            description={view === "canli" ? "Son 30 dakikada sepetine ürün ekleyen ya da sepetiyle sitede gezinen ziyaretçiler burada görünür. Sayfa 30 saniyede bir yenilenir." : view === "terk" ? "Son 1 saattir dokunulmayan ve siparişe dönmeyen sepetler (30 güne kadar)." : undefined}
          />
        )}
      </Card>
    </>
  );
}
