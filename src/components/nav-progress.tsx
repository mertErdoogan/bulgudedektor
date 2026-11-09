"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * Sayfa geçişlerinde üstte ince ilerleme çubuğu.
 * Bir iç bağlantıya tıklanınca başlar, yeni sayfa geldiğinde tamamlanır; böylece
 * "tıkladım ama bir şey olmadı" hissi oluşmaz. Geçiş 120 ms'den kısaysa hiç görünmez.
 */
function Bar() {
  const path = usePathname();
  const search = useSearchParams();
  const [w, setW] = useState(0); // 0 = gizli
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = useRef(false);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const start = () => {
    if (active.current) return;
    active.current = true;
    clear();
    timers.current.push(
      setTimeout(() => setW(18), 120),
      setTimeout(() => setW(45), 400),
      setTimeout(() => setW(68), 1200),
      setTimeout(() => setW(82), 3000),
      setTimeout(() => setW(90), 7000),
      // Geçiş hiç tamamlanmazsa (indirme, iptal) takılı kalmasın
      setTimeout(() => done(), 15000),
    );
  };
  const done = () => {
    if (!active.current) return;
    active.current = false;
    clear();
    setW((cur) => (cur ? 100 : 0));
    timers.current.push(setTimeout(() => setW(0), 280));
  };

  // Yeni sayfa geldi
  useEffect(() => {
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // aynı sayfa / yalnızca #
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      // GET formları (arama, filtre, sorgu) da sayfa geçişidir
      const f = e.target as HTMLFormElement | null;
      if (f && (f.method || "get").toLowerCase() === "get" && !e.defaultPrevented) start();
    };
    const onStart = () => start();
    // Yakalama aşamasında dinle: next/link tıklamayı preventDefault ettiği için kabarcık aşamasında göremeyiz.
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("popstate", onStart);
    window.addEventListener("arena-nav-start", onStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("popstate", onStart);
      window.removeEventListener("arena-nav-start", onStart);
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" style={{ opacity: w ? 1 : 0, transition: "opacity .25s" }}>
      <div
        className="h-full bg-brand shadow-[0_0_10px_var(--color-brand)]"
        style={{ width: `${w}%`, transition: w === 0 ? "none" : w === 100 ? "width .2s ease-out" : "width .8s cubic-bezier(.2,.7,.2,1)" }}
      />
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
