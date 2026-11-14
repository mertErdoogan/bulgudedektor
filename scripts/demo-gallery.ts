/* Test amaçlı çoklu ürün görselleri: bazı demo ürünlere 3 ek görsel (stüdyo zemini, detay, ikinci açı) ekler.
   Gerçek ürün fotoğrafları yüklenince bu görseller panelden silinebilir. Tekrar çalıştırmak güvenli:
   yalnızca hâlâ tek görseli olan ürünlere ekler. */
import { sql } from "drizzle-orm";
import { db } from "../src/db";

export const DEMO_GALLERY = ["manticore", "vanquish-560-pro", "equinox-900", "x-terra-pro"];

export async function ensureDemoGallery() {
  for (const base of DEMO_GALLERY) {
    await db.execute(sql`
      insert into product_images (id, product_id, url, alt, sort_order)
      select gen_random_uuid()::text, pi.product_id, '/demo/' || ${base} || '-' || k || '.jpg', p.name || ' (test görseli ' || k || ')', k - 1
      from product_images pi
      join products p on p.id = pi.product_id
      cross join generate_series(2, 4) k
      where pi.url = ${`/demo/${base}.jpg`}
        and (select count(*) from product_images x where x.product_id = pi.product_id) = 1`);
  }
}

/** Deneme kiralaması kaldırıldı: var olan (ön izleme) veritabanında fiyatları ve eski SSS cevabını temizler. */
export async function removeTrialRental() {
  await db.execute(sql`update products set trial_rental_price = null where trial_rental_price is not null`);
  await db.execute(sql`update faqs set question = 'Hangi cihazın bana uygun olduğunu nasıl anlarım?',
    answer = '6 soruluk sihirbazı çözebilir veya WhatsApp''tan uzmanımıza yazabilirsin; arama alanına, hedefine ve bütçene göre en uygun modelleri nedenleriyle önerir.'
    where question = 'Satın almadan önce cihazı deneyebilir miyim?'`);
}
