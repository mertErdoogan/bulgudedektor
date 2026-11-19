"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Sayfayı belirli aralıkla tazeler (yalnızca sekme görünürken). Canlı sepetler gibi izleme ekranları için. */
export function LiveRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [at, setAt] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setAt(new Date());
    }, seconds * 1000);
    return () => clearInterval(iv);
  }, [router, seconds]);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-mute" data-testid="live-refresh">
      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-ok" /></span>
      Canlı · {at.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}
