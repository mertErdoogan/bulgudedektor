"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArticleSkeleton, CartSkeleton, ListingSkeleton, ProductSkeleton } from "./skeletons";

type Kind = "product" | "listing" | "cart" | "article";
const kindFor = (path: string): Kind | null =>
  /^\/urun\//.test(path) ? "product" : /^\/(kategori|marka)\/|^\/(ara|urunler|kampanyalar)$/.test(path) ? "listing" : path === "/sepet" ? "cart" : /^\/blog\/.+/.test(path) ? "article" : null;

/**
 * Site içi tıklamada hedef sayfanın iskeletini hemen gösterir; yeni sayfa gelince kaldırır.
 * Next'in loading.tsx'i yerine tarayıcıda yapılır: loading.tsx sayfayı akışla gönderdiği için eski
 * adreslerden kalıcı yönlendirme (308) ve 404 durum kodları bozuluyordu. Doğrudan açılan sayfalar etkilenmez.
 * Çok hızlı geçişte yanıp sönmesin diye 120 ms sonra belirir (.skel-page).
 */
function Overlay() {
  const path = usePathname();
  const search = useSearchParams();
  const [kind, setKind] = useState<Kind | null>(null);
  const [top, setTop] = useState(0);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (t.current) clearTimeout(t.current);
    setKind(null);
  };
  useEffect(clear, [path, search]);
  useEffect(() => {
    const on = (e: Event) => {
      const k = kindFor((e as CustomEvent<string>).detail ?? "");
      if (!k) return;
      const main = document.querySelector("main");
      setTop(Math.max(0, main?.getBoundingClientRect().top ?? 0));
      setKind(k);
      // Geçiş hiç tamamlanmazsa (iptal, hata) iskelet takılı kalmasın
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => setKind(null), 12000);
    };
    const back = () => clear();
    window.addEventListener("arena-nav-to", on);
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("arena-nav-to", on);
      window.removeEventListener("popstate", back);
      if (t.current) clearTimeout(t.current);
    };
  }, []);

  if (!kind) return null;
  return (
    <div className="skel-page fixed inset-x-0 bottom-0 z-20 overflow-hidden bg-white" style={{ top }} data-testid="route-skeleton">
      {kind === "product" ? <ProductSkeleton /> : kind === "cart" ? <CartSkeleton /> : kind === "article" ? <ArticleSkeleton /> : <ListingSkeleton />}
    </div>
  );
}

export function RouteSkeleton() {
  return (
    <Suspense fallback={null}>
      <Overlay />
    </Suspense>
  );
}
