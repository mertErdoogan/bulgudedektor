"use client";

import { useState } from "react";
import { MapPin, MousePointerClick } from "lucide-react";

/**
 * Showroom haritası — tıklayınca yüklenir.
 * Google Haritalar gömülü olarak açıldığında Google çerezleri yazar; KVKK çerez onayı akışımızla çelişmemek
 * ve sayfayı ağırlaştırmamak için önce kendi çizdiğimiz "radar" görünümünü gösteriyoruz.
 * Ziyaretçi "Haritayı göster"e basınca gerçek harita (iframe) yüklenir.
 */
export function MapEmbed({ query, label, cta, note }: { query: string; label: string; cta: string; note: string }) {
  const [on, setOn] = useState(false);
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&hl=tr&output=embed`;
  return (
    <div className="relative h-full min-h-[320px] overflow-hidden rounded-[22px] border border-line bg-[#0f1a17]" data-testid="about-map">
      {on ? (
        <iframe src={src} title={label} className="absolute inset-0 h-full w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen data-testid="about-map-frame" />
      ) : (
        <button type="button" onClick={() => setOn(true)} className="group absolute inset-0 grid place-items-center text-white" aria-label={cta} data-testid="about-map-load">
          {/* stilize harita: ızgara + yollar + radar halkaları */}
          <svg aria-hidden className="absolute inset-0 h-full w-full opacity-60" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 300">
            <defs>
              <pattern id="mgrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M24 0H0V24" fill="none" stroke="#2c4a42" strokeWidth=".6" />
              </pattern>
            </defs>
            <rect width="400" height="300" fill="url(#mgrid)" />
            <path d="M-10 210 C 90 180, 150 230, 230 170 S 360 120, 420 140" fill="none" stroke="#3f6b5f" strokeWidth="10" strokeLinecap="round" />
            <path d="M120 -10 C 140 80, 180 120, 200 150 S 240 260, 250 320" fill="none" stroke="#365c52" strokeWidth="6" strokeLinecap="round" />
            <path d="M-10 60 L 420 110" stroke="#2f5249" strokeWidth="4" />
            <path d="M300 -10 L 330 320" stroke="#2f5249" strokeWidth="3" />
          </svg>
          <span aria-hidden className="radar-sweep absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <span aria-hidden className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5ee0b0]/30" />
          <span aria-hidden className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5ee0b0]/20" />
          <span aria-hidden className="radar-ping absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/40" />
          <span className="relative flex flex-col items-center gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand shadow-[0_10px_30px_-6px_rgba(212,46,30,.7)] transition group-hover:-translate-y-1">
              <MapPin className="h-7 w-7" />
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-deep shadow-lg transition group-hover:bg-soft">
              <MousePointerClick className="h-4 w-4" /> {cta}
            </span>
            <span className="max-w-[260px] text-center text-[11px] text-white/60">{note}</span>
          </span>
        </button>
      )}
    </div>
  );
}
