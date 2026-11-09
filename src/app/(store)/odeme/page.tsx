import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getCustomer } from "@/lib/auth";
import { getSettings, publicSettings } from "@/lib/settings";
import { CheckoutForm } from "./form";

export const metadata = { title: "Ödeme", robots: { index: false } };

export default async function CheckoutPage() {
  const [s, me] = await Promise.all([getSettings(), getCustomer()]);
  const addr = me ? await db.select().from(addresses).where(eq(addresses.customerId, me.id)).orderBy(desc(addresses.isDefault)).limit(1) : [];
  return (
    <CheckoutForm
      settings={publicSettings(s)}
      bankAccounts={s.payment.bankAccounts}
      me={me ? { name: me.name, email: me.email ?? "", phone: me.phone ?? "" } : null}
      address={addr[0] ? { city: addr[0].city, district: addr[0].district, line: addr[0].line, zip: addr[0].zip ?? "" } : null}
    />
  );
}
