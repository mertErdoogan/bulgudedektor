import { getT } from "@/lib/i18n/server";
import { FavoritesGrid, RecentlyViewed } from "@/components/store/rails";
import { getCustomer } from "@/lib/auth";
import Link from "@/components/locale-link";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("meta.favoriler"), robots: { index: false, follow: true } };
}

export default async function FavoritesPage() {
  const c = await getCustomer();
  const t = await getT();
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-[28px] font-extrabold md:text-[34px]">{t("meta.favoriler")}</h1>
      <p className="mt-1 mb-6 text-sm text-mute">
        {c ? t("fav.acc") : <>{t("fav.local")} <Link href="/giris?next=/favoriler" className="font-bold text-link">{t("fav.login")}</Link> {t("fav.local2")}</>}
      </p>
      <FavoritesGrid />
      <RecentlyViewed className="mt-12" />
    </div>
  );
}
