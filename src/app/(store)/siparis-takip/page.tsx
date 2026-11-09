import { redirect } from "next/navigation";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { orderKey } from "@/lib/store";
import { normalizePhone } from "@/lib/utils";

export const metadata = { title: "Sipariş takibi" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ no?: string; iletisim?: string }> }) {
  const sp = await searchParams;
  let error = "";
  if (sp.no && sp.iletisim) {
    const num = Number(sp.no.replace(/\D/g, ""));
    const c = sp.iletisim.trim().toLowerCase();
    const o = num ? await db.query.orders.findFirst({ where: and(eq(orders.number, num), or(eq(orders.email, c), eq(orders.phone, normalizePhone(c)))) }) : null;
    if (o) redirect(`/siparis/${o.id}?k=${orderKey(o.id)}`);
    error = "Bu bilgilerle sipariş bulunamadı. Numarayı ve e-posta/telefonu kontrol et.";
  }
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="font-display text-2xl font-extrabold">Sipariş takibi</h1>
      <p className="mt-1 text-sm text-mute">Üye olmadan verdiğin siparişi buradan takip edebilirsin.</p>
      <form className="mt-5 flex flex-col gap-3">
        <input name="no" defaultValue={sp.no} placeholder="Sipariş no (BD-000123)" required className="h-12 rounded-lg border border-[#cfd6cc] px-4" />
        <input name="iletisim" defaultValue={sp.iletisim} placeholder="Sipariş e-postası veya telefonu" required className="h-12 rounded-lg border border-[#cfd6cc] px-4" />
        {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
        <button className="h-12 rounded-lg bg-brand font-extrabold text-white">Siparişimi göster</button>
      </form>
    </div>
  );
}
