import "server-only";
import { abs, isPublicHost, siteUrl } from "./seo";
import { getSettings } from "./settings";

/**
 * IndexNow: Bing, Yandex, Seznam, Naver'a "bu sayfa değişti" bildirimi.
 * ChatGPT Search Bing dizinini kullandığı için yeni ürün/yazıların AI aramada hızlı görünmesini sağlar.
 * Yerel geliştirmede (localhost) çalışmaz; hata akışı kesmez.
 */
export async function pingIndexNow(paths: string[]) {
  try {
    if (!isPublicHost() || !paths.length) return;
    const key = (await getSettings()).seo.indexNowKey;
    if (!key) return;
    const host = new URL(siteUrl()).host;
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: abs("/indexnow-key.txt"), urlList: paths.map((p) => abs(p)) }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* sessizce geç */
  }
}
