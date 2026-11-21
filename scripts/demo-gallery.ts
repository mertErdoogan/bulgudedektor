/* Demo ürün görselleri: üreticilerin resmi ürün fotoğraflarından (beyaz zemin, üzerinde yazı/filigran yok, 1200×1200)
   ve kendi saha fotoğraflarından hazırlandı. Gerçek mağazada bayi/distribütör görsel kitiyle değiştirilmelidir.
   Tekrar çalıştırmak güvenli: yalnızca görselleri hâlâ /demo/ altında olan (panelden değiştirilmemiş) ürünlere dokunur. */
import { sql } from "drizzle-orm";
import { db } from "../src/db";

export const DEMO_IMAGES: Record<string, string[]> = {
  "equinox-900": ["/demo/p/equinox-900-1.jpg", "/demo/p/equinox-900-2.jpg", "/demo/p/equinox-900-3.jpg", "/demo/p/equinox-900-4.jpg", "/demo/p/equinox-900-5.jpg", "/demo/p/equinox-900-6.jpg"],
  "eqx-11-baslik": ["/demo/p/eqx-11-baslik-1.jpg"],
  "go-find-66": ["/demo/p/go-find-66-1.jpg", "/demo/p/go-find-66-2.jpg", "/demo/p/go-find-66-3.jpg", "/demo/p/go-find-66-4.jpg"],
  "gold-monster-2000": ["/demo/p/gold-monster-2000-1.jpg", "/demo/p/gold-monster-2000-2.jpg", "/demo/p/gold-monster-2000-3.jpg", "/demo/p/gold-monster-2000-4.jpg"],
  "gpx-6000": ["/demo/p/gpx-6000-1.jpg", "/demo/p/gpx-6000-2.jpg", "/demo/p/gpx-6000-3.jpg", "/demo/p/gpx-6000-4.jpg", "/demo/p/gpx-6000-5.jpg"],
  "gpz-8000": ["/demo/p/gpz-8000-1.jpg", "/demo/p/gpz-8000-2.jpg", "/demo/p/gpz-8000-3.jpg", "/demo/p/gpz-8000-4.jpg"],
  "manticore": ["/demo/p/manticore-1.jpg", "/demo/p/manticore-2.jpg", "/demo/p/manticore-3.jpg", "/demo/p/manticore-4.jpg", "/demo/p/manticore-5.jpg", "/demo/p/manticore-6.jpg"],
  "vanquish-560-pro-pack": ["/demo/p/vanquish-560-pro-pack-1.jpg", "/demo/p/vanquish-560-pro-pack-2.jpg", "/demo/p/vanquish-560-pro-pack-3.jpg", "/demo/p/vanquish-560-pro-pack-4.jpg"],
  "x-terra-pro": ["/demo/p/x-terra-pro-1.jpg", "/demo/p/x-terra-pro-2.jpg", "/demo/p/x-terra-pro-3.jpg", "/demo/p/x-terra-pro-4.jpg", "/demo/p/x-terra-pro-5.jpg"],
  "ace-250": ["/demo/p/ace-250-1.jpg", "/demo/p/ace-250-2.jpg"],
  "apex-raider-paket": ["/demo/p/apex-raider-paket-1.jpg", "/demo/p/apex-raider-paket-2.jpg", "/demo/p/apex-raider-paket-3.jpg", "/demo/p/apex-raider-paket-4.jpg"],
  "pro-pointer-at": ["/demo/p/pro-pointer-at-1.jpg", "/demo/p/pro-pointer-at-2.jpg", "/demo/p/pro-pointer-at-3.jpg", "/demo/p/pro-pointer-at-4.jpg"],
  "vortex-vx9": ["/demo/p/vortex-vx9-1.jpg"],
  "deephunter-pro-3d": ["/demo/p/deephunter-pro-3d-1.jpg", "/demo/p/deephunter-pro-3d-2.jpg", "/demo/p/deephunter-pro-3d-3.jpg", "/demo/p/deephunter-pro-3d-4.jpg", "/demo/p/deephunter-pro-3d-5.jpg"],
  "double-score-2": ["/demo/p/double-score-2-1.jpg", "/demo/p/double-score-2-2.jpg", "/demo/p/double-score-2-3.jpg", "/demo/p/double-score-2-4.jpg", "/demo/p/double-score-2-5.jpg"],
  "findx-pro": ["/demo/p/findx-pro-1.jpg", "/demo/p/findx-pro-2.jpg", "/demo/p/findx-pro-3.jpg", "/demo/p/findx-pro-4.jpg", "/demo/p/findx-pro-5.jpg"],
  "deus-ii-22-cm-ws6-kulaklik": ["/demo/p/deus-ii-22-cm-ws6-kulaklik-1.jpg", "/demo/p/deus-ii-22-cm-ws6-kulaklik-2.jpg", "/demo/p/deus-ii-22-cm-ws6-kulaklik-3.jpg", "/demo/p/deus-ii-22-cm-ws6-kulaklik-4.jpg", "/demo/p/deus-ii-22-cm-ws6-kulaklik-5.jpg", "/demo/p/deus-ii-22-cm-ws6-kulaklik-6.jpg"],
};

/** Ürünün demo galerisini yerleştirir; panelden kendi görselini yüklemiş ürünlere dokunmaz */
export async function ensureDemoGallery() {
  for (const [slug, urls] of Object.entries(DEMO_IMAGES)) {
    const rows = (await db.execute(sql`
      select p.id, p.name, coalesce(array_agg(pi.url order by pi.sort_order) filter (where pi.url is not null), '{}') as urls
      from products p left join product_images pi on pi.product_id = p.id
      where p.slug = ${slug} group by p.id`)) as unknown as { id: string; name: string; urls: string[] }[];
    const p = rows[0];
    if (!p) continue;
    const cur = p.urls ?? [];
    if (cur.some((u) => !u.startsWith("/demo/"))) continue; // panelden yüklenmiş görsel var
    if (cur.length === urls.length && cur.every((u, i) => u === urls[i])) continue;
    await db.execute(sql`delete from product_images where product_id = ${p.id}`);
    for (const [i, url] of urls.entries()) {
      await db.execute(sql`insert into product_images (id, product_id, url, alt, sort_order) values (gen_random_uuid()::text, ${p.id}, ${url}, ${i ? `${p.name} (${i + 1})` : p.name}, ${i})`);
    }
  }
}

/** Deneme kiralaması kaldırıldı: var olan (ön izleme) veritabanında fiyatları ve eski SSS cevabını temizler. */
export async function removeTrialRental() {
  await db.execute(sql`update products set trial_rental_price = null where trial_rental_price is not null`);
  await db.execute(sql`update faqs set question = 'Hangi cihazın bana uygun olduğunu nasıl anlarım?',
    answer = '6 soruluk sihirbazı çözebilir veya WhatsApp''tan uzmanımıza yazabilirsin; arama alanına, hedefine ve bütçene göre en uygun modelleri nedenleriyle önerir.'
    where question = 'Satın almadan önce cihazı deneyebilir miyim?'`);
}
