import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, splitLocale } from "@/lib/i18n/config";

/**
 * 1) Ön izleme ortamı (PREPROD=1): tüm site şifreli (HTTP Basic Auth: PREVIEW_USER / PREVIEW_PASSWORD) ve
 *    arama motorlarına kapalı (X-Robots-Tag). /api altı açık kalır: ödeme dönüşleri, cron ve sağlık kontrolü
 *    tarayıcı olmadan çağrılır; bu uçlar kendi anahtar/imza kontrolünü yapar.
 *    Görsel dosyaları (/demo, /media, /brand) da açıktır; aşağıdaki nota bakın.
 * 2) Hafif admin kontrolü: admin çerezi yoksa girişe yönlendir. Asıl doğrulama sunucuda (layout/action) yapılır.
 * 3) Hareketsizlikte çıkış: panelde ADMIN_IDLE_MINUTES (varsayılan 60) dakika işlem yapılmazsa oturum kapanır.
 *    Showroom'daki ortak bilgisayarda açık kalan yönetici oturumunu başkası kullanamasın diye.
 */
const IDLE_COOKIE = "bulgu_seen";
const idleSeconds = () => Math.max(5, Number(process.env.ADMIN_IDLE_MINUTES) || 60) * 60;
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const preprod = process.env.PREPROD === "1";

  // Görseller şifresiz: Next görsel optimizasyonu (/_next/image) kaynağı sunucunun kendisinden şifre başlığı olmadan
  // çeker; şifre istenirse 401 alır ve tüm ürün/kategori görselleri kırık görünür. Görseller zaten gizli bilgi değil.
  const publicAsset = /^\/(demo|media|brand)\//.test(pathname) || /\.(jpe?g|png|webp|avif|gif|svg|ico|pdf)$/i.test(pathname);
  if (preprod && process.env.PREVIEW_PASSWORD && !pathname.startsWith("/api/") && !publicAsset) {
    const user = process.env.PREVIEW_USER || "onizleme";
    const [scheme, enc] = (req.headers.get("authorization") ?? "").split(" ");
    let ok = false;
    if (scheme === "Basic" && enc) {
      try {
        const [u, ...rest] = atob(enc).split(":");
        ok = u === user && rest.join(":") === process.env.PREVIEW_PASSWORD;
      } catch {}
    }
    if (!ok)
      return new NextResponse("Ön izleme ortamı: giriş gerekli.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Derinova Dedektor on izleme", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
      });
  }

  // Dil: /en/... adresleri ön eki atılarak aynı sayfaya yönlenir; sayfa dili x-locale başlığından okur.
  // Türkçe (varsayılan) ön eksizdir; /tr/... gelirse ön eksiz adrese kalıcı yönlendirilir.
  const { locale, path } = splitLocale(pathname);
  if (pathname === "/tr" || pathname.startsWith("/tr/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-locale", locale);
  reqHeaders.set("x-pathname", path);

  let res: NextResponse;
  const adminArea = path.startsWith("/admin") && !path.startsWith("/admin/giris");
  const hasAdmin = !!req.cookies.get("bulgu_admin");
  const idleExpired = adminArea && hasAdmin && !req.cookies.get(IDLE_COOKIE);
  if (adminArea && (!hasAdmin || idleExpired)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/giris";
    url.search = "";
    url.searchParams.set("next", path);
    if (idleExpired) url.searchParams.set("sure", "1");
    res = NextResponse.redirect(url);
    if (idleExpired) res.cookies.delete("bulgu_admin");
  } else if (locale !== DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = path;
    res = NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  } else res = NextResponse.next({ request: { headers: reqHeaders } });
  // Panelde her istek hareketsizlik sayacını yeniler
  if (adminArea && hasAdmin && !idleExpired)
    res.cookies.set(IDLE_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: idleSeconds() });
  if (preprod) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

// Statik dosyalar hariç her istek (ön izleme şifresi tüm sayfalara uygulanabilsin)
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/).*)"] };
