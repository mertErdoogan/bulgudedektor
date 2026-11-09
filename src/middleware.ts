import { NextResponse, type NextRequest } from "next/server";

// Hafif kontrol: admin çerezi yoksa girişe yönlendir. Asıl doğrulama sunucuda (layout/action) yapılır.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/giris")) {
    if (!req.cookies.get("bulgu_admin")) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/giris";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
