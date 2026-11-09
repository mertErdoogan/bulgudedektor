import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productImages, products } from "@/db/schema";
import { abs, siteUrl } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/** Google Merchant Center / Google Alışveriş ücretsiz listeleme ürün feed'i (RSS 2.0, g: namespace). */
export const dynamic = "force-dynamic";
const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const [s, rows] = await Promise.all([
    getSettings(),
    db.query.products.findMany({ where: eq(products.status, "ACTIVE"), with: { brand: true, category: true, images: { orderBy: asc(productImages.sortOrder) } } }),
  ]);
  const ship = s.shipping.flatRate;
  const items = rows
    .filter((p) => p.images.length)
    .map((p) => {
      const title = p.brand && !p.name.startsWith(p.brand.name) ? `${p.brand.name} ${p.name}` : p.name;
      const sale = p.compareAtPrice && p.compareAtPrice > p.price;
      const avail = p.stock > 0 ? "in_stock" : p.allowBackorder ? "backorder" : "out_of_stock";
      const freeShip = ship === 0 || (s.shipping.freeThreshold > 0 && p.price >= s.shipping.freeThreshold);
      return [
        "<item>",
        `<g:id>${x(p.sku)}</g:id>`,
        `<g:title>${x(title.slice(0, 150))}</g:title>`,
        `<g:description>${x((p.shortDescription || p.seoDescription || title).slice(0, 4900))}</g:description>`,
        `<g:link>${abs(`/urun/${p.slug}`)}</g:link>`,
        `<g:image_link>${x(abs(p.images[0].url)!)}</g:image_link>`,
        ...p.images.slice(1, 10).map((i) => `<g:additional_image_link>${x(abs(i.url)!)}</g:additional_image_link>`),
        `<g:availability>${avail}</g:availability>`,
        `<g:price>${(sale ? p.compareAtPrice! : p.price).toFixed(2)} TRY</g:price>`,
        sale ? `<g:sale_price>${p.price.toFixed(2)} TRY</g:sale_price>` : "",
        `<g:condition>new</g:condition>`,
        p.brand ? `<g:brand>${x(p.brand.name)}</g:brand>` : "",
        p.barcode && /^\d{8,14}$/.test(p.barcode) ? `<g:gtin>${p.barcode}</g:gtin>` : `<g:mpn>${x(p.sku)}</g:mpn>`,
        !p.barcode && !p.brand ? "<g:identifier_exists>no</g:identifier_exists>" : "",
        `<g:google_product_category>Sporting Goods &gt; Outdoor Recreation &gt; Metal Detectors</g:google_product_category>`,
        p.category ? `<g:product_type>Metal dedektörü &gt; ${x(p.category.name)}</g:product_type>` : "",
        p.weightKg ? `<g:shipping_weight>${p.weightKg} kg</g:shipping_weight>` : "",
        `<g:shipping><g:country>TR</g:country><g:service>Standart</g:service><g:price>${freeShip ? "0.00" : ship.toFixed(2)} TRY</g:price></g:shipping>`,
        "</item>",
      ].filter(Boolean).join("");
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${x(s.store.name)}</title><link>${siteUrl()}</link><description>${x(s.seo.description)}</description>\n${items}\n</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" } });
}
