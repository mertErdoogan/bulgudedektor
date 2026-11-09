import { getSettings } from "@/lib/settings";
import { CartView } from "./view";

export const metadata = { title: "Sepet", robots: { index: false } };

export default async function CartPage() {
  const s = await getSettings();
  return <CartView inst={s.payment.noInterestInstallments} freeThreshold={s.shipping.freeThreshold} flatRate={s.shipping.flatRate} />;
}
