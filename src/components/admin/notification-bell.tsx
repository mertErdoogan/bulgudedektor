"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";

type N = { id: string; kind: string; title: string; body: string | null; href: string | null; at: string; unread: boolean };
type Summary = { count: number; latest: { id: string; title: string; body: string | null; href: string | null; at: string } | null; items: N[] };

const POLL_MS = 30_000;

function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "şimdi";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} sa önce` : `${Math.round(h / 24)} gün önce`;
}

/**
 * Panel bildirim zili: 30 saniyede bir yeni bildirim var mı bakar; sekme arka plandayken ve izin verildiyse
 * tarayıcı bildirimi gösterir. Açılınca hepsi okundu sayılır.
 */
export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[] | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const lastId = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/bildirimler", { cache: "no-store" });
      if (!r.ok) return;
      const s = (await r.json()) as Summary;
      setCount(s.count);
      // İlk yüklemede geçmiş bildirimleri tarayıcı bildirimi olarak göstermeyiz
      if (s.latest && lastId.current && s.latest.id !== lastId.current && s.count > 0 && document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted") {
        const n = new Notification(s.latest.title, { body: s.latest.body ?? undefined, tag: s.latest.id, icon: "/icon.svg" });
        n.onclick = () => {
          window.focus();
          if (s.latest?.href) window.location.href = s.latest.href;
        };
      }
      if (s.latest) lastId.current = s.latest.id;
      else lastId.current = lastId.current ?? "";
    } catch {}
  }, []);

  useEffect(() => {
    setPerm("Notification" in window ? Notification.permission : "unsupported");
    void poll();
    const t = setInterval(poll, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [poll]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      const r = await fetch("/api/admin/bildirimler?liste=1", { cache: "no-store" });
      if (r.ok) setItems(((await r.json()) as Summary).items);
      if (count) {
        await fetch("/api/admin/bildirimler", { method: "POST" });
        setCount(0);
      }
    }
  };

  const enable = async () => {
    if (!("Notification" in window)) return;
    setPerm(await Notification.requestPermission());
  };

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} className="relative rounded-lg p-2 text-mute hover:bg-soft hover:text-deep" aria-label={count ? `${count} yeni bildirim` : "Bildirimler"} data-testid="bell">
        {count ? <BellRing size={19} className="text-deep" /> : <Bell size={19} />}
        {count ? (
          <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white" data-testid="bell-count">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <b className="text-sm">Bildirimler</b>
            <Link href="/admin/isler" onClick={() => setOpen(false)} className="text-xs font-bold text-link">
              İş listesi →
            </Link>
          </div>
          {perm === "default" ? (
            <button type="button" onClick={enable} className="block w-full bg-tint px-4 py-2 text-left text-xs font-semibold text-brand">
              Panel kapalıyken de haber al: tarayıcı bildirimlerini aç
            </button>
          ) : perm === "denied" ? (
            <p className="bg-soft px-4 py-2 text-xs text-mute">Tarayıcı bildirimleri engellenmiş; adres çubuğundaki kilit simgesinden izin verebilirsin.</p>
          ) : null}
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {items === null ? <li className="px-4 py-6 text-center text-sm text-mute">Yükleniyor…</li> : null}
            {items?.length === 0 ? <li className="px-4 py-6 text-center text-sm text-mute">Son 30 günde bildirim yok.</li> : null}
            {items?.map((n) => (
              <li key={n.id}>
                <Link href={n.href ?? "/admin"} onClick={() => setOpen(false)} className={`block px-4 py-2.5 hover:bg-soft ${n.unread ? "bg-tint/50" : ""}`}>
                  <span className="flex items-start gap-2">
                    {n.unread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" /> : null}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{n.title}</span>
                      {n.body ? <span className="line-clamp-2 block text-xs text-mute">{n.body}</span> : null}
                      <span className="text-[11px] text-mute">{ago(n.at)}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
