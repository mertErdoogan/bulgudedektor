import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getCustomer } from "@/lib/auth";
import { getSettings, publicSettings } from "@/lib/settings";
import { cardReady } from "@/lib/card-ready";
import { CheckoutForm } from "./form";
import { CheckoutGate } from "./gate";

export const metadata = { title: "Ödeme", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ misafir?: string }> }) {
  const [s, me, sp] = await Promise.all([getSettings(), getCustomer(), searchParams]);
  // Giriş yapmamış müşteri önce seçim ekranını görür: giriş yap ya da üye olmadan devam et
  if (!me && sp.misafir !== "1") return <CheckoutGate />;
  const addr = me ? await db.select().from(addresses).where(eq(addresses.customerId, me.id)).orderBy(desc(addresses.isDefault)).limit(1) : [];
  const pub = publicSettings(s);
  // Kart açık ama sağlayıcı anahtarı yoksa seçenek hiç gösterilmez (sipariş açılıp iptale düşmesin)
  const settings = { ...pub, payment: { ...pub.payment, cardEnabled: cardReady(s) } };
  return (
    <CheckoutForm
      settings={settings}
      bankAccounts={s.payment.bankAccounts}
      me={me ? { name: me.name, email: me.email ?? "", phone: me.phone ?? "" } : null}
      address={addr[0] ? { city: addr[0].city, district: addr[0].district, line: addr[0].line, zip: addr[0].zip ?? "" } : null}
    />
  );
}
