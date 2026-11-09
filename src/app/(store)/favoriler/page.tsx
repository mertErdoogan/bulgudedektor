import { FavoritesGrid, RecentlyViewed } from "@/components/store/rails";
import { getCustomer } from "@/lib/auth";
import Link from "next/link";

export const metadata = { title: "Favorilerim", robots: { index: false, follow: true } };

export default async function FavoritesPage() {
  const c = await getCustomer();
  return (
    <div className="container-x py-6">
      <h1 className="font-display text-[28px] font-extrabold md:text-[34px]">Favorilerim</h1>
      <p className="mt-1 mb-6 text-sm text-mute">
        {c ? "Favorilerin hesabına kayıtlı; tüm cihazlarında görünür." : <>Favorilerin bu tarayıcıda saklanıyor. <Link href="/giris?next=/favoriler" className="font-bold text-link">Giriş yaparsan</Link> tüm cihazlarında görünür.</>}
      </p>
      <FavoritesGrid />
      <RecentlyViewed className="mt-12" />
    </div>
  );
}
