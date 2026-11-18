import { localRedirect, getL } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/seo";
import { allowIp } from "@/lib/guard";

import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { orderKey } from "@/lib/store";
import { normalizePhone } from "@/lib/utils";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({ title: L("Sipariş Takibi — Kargom Nerede?", "Order Tracking — Where Is My Parcel?"), description: L("Sipariş numaranız ve e-posta ya da telefonunuzla siparişinizin ve kargonuzun durumunu anında sorgulayın.", "Check the status of your order and shipment instantly with your order number and email or phone."), path: "/siparis-takip" });
}

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ no?: string; iletisim?: string }> }) {
  const sp = await searchParams;
  const L = await getL();
  let error = "";
  if (sp.no && sp.iletisim && !(await allowIp("track", 15, 15 * 60 * 1000))) error = L("Çok fazla sorgu yapıldı. 15 dakika sonra tekrar dene.", "Too many checks. Please try again in 15 minutes.");
  else if (sp.no && sp.iletisim) {
    const num = Number(sp.no.replace(/\D/g, ""));
    const c = sp.iletisim.trim().toLowerCase();
    const o = num ? await db.query.orders.findFirst({ where: and(eq(orders.number, num), or(eq(orders.email, c), eq(orders.phone, normalizePhone(c)))) }) : null;
    if (o) await localRedirect(`/siparis/${o.id}?k=${orderKey(o.id)}`);
    error = L("Bu bilgilerle sipariş bulunamadı. Numarayı ve e-posta/telefonu kontrol et.", "No order found with these details. Check the number and email/phone.");
  }
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">{L("Sipariş takibi", "Order tracking")}</h1>
      <p className="mt-1 text-sm text-mute">{L("Üye olmadan verdiğin siparişi buradan takip edebilirsin.", "Track an order you placed as a guest.")}</p>
      <form className="mt-5 flex flex-col gap-3">
        <input name="no" defaultValue={sp.no} placeholder={L("Sipariş no (BD-000123)", "Order no. (BD-000123)")} required className="h-12 rounded-lg border border-[#d6d6d9] px-4" />
        <input name="iletisim" defaultValue={sp.iletisim} placeholder={L("Sipariş e-postası veya telefonu", "Email or phone used for the order")} required className="h-12 rounded-lg border border-[#d6d6d9] px-4" />
        {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
        <button className="h-12 rounded-lg bg-brand font-extrabold text-white">{L("Siparişimi göster", "Show my order")}</button>
      </form>
    </div>
  );
}
