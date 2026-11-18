import { getT } from "@/lib/i18n/server";
import { cardReady } from "@/lib/card-ready";
import { getSettings } from "@/lib/settings";
import { CartView } from "./view";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.sepet"), robots: { index: false } };
}

export default async function CartPage() {
  const s = await getSettings();
  return <CartView inst={cardReady(s) ? s.payment.noInterestInstallments : 1} freeThreshold={s.shipping.freeThreshold} flatRate={s.shipping.flatRate} />;
}
