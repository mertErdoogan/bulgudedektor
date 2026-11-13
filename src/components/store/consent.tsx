"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { pageView } from "@/lib/track";

/**
 * KVKK çerez onayı. Analitik (GA4) ve pazarlama (Meta Pixel) çerezleri yalnızca açık onaydan sonra yüklenir.
 * Tercih 180 gün `arena_consent` çerezinde saklanır; footer'daki "Çerez tercihleri" ile değiştirilebilir.
 */
type Choice = { analytics: boolean; marketing: boolean };
const NAME = "arena_consent";

function readChoice(): Choice | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${NAME}=([^;]*)`));
  if (!m) return null;
  const v = decodeURIComponent(m[1]);
  return { analytics: v.includes("a"), marketing: v.includes("m") };
}
function saveChoice(c: Choice) {
  const v = `n${c.analytics ? "a" : ""}${c.marketing ? "m" : ""}`;
  document.cookie = `${NAME}=${v}; Max-Age=${180 * 86400}; Path=/; SameSite=Lax`;
  window.dispatchEvent(new Event("arena-consent"));
}
export function openConsent() {
  window.dispatchEvent(new Event("arena-consent-open"));
}

type Tags = { ga?: string; ads?: string[]; labels?: string[]; gtm?: string; px?: string };

export function ConsentAndAnalytics({ ga, ads = [], labels = [], gtm, px }: Tags) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(false);
  const [draft, setDraft] = useState<Choice>({ analytics: true, marketing: false });
  const path = usePathname();

  useEffect(() => {
    const c = readChoice();
    setChoice(c);
    setOpen(!c);
    const reopen = () => {
      setDraft(readChoice() ?? { analytics: true, marketing: false });
      setDetail(true);
      setOpen(true);
    };
    window.addEventListener("arena-consent-open", reopen);
    return () => window.removeEventListener("arena-consent-open", reopen);
  }, []);

  // Sayfa değişiminde sayfa görüntüleme (SPA geçişleri). Betik henüz yüklenmediyse olay kuyruğa girer.
  useEffect(() => {
    if (!choice) return;
    pageView(path, { ga: !!(choice.analytics && ga), px: !!(choice.marketing && px) });
  }, [path, choice, ga, px]);

  const decide = (c: Choice) => {
    saveChoice(c);
    setChoice(c);
    setOpen(false);
    if (!c.analytics || !c.marketing) {
      // Önceden yüklenmiş betikleri kaldırmanın güvenli yolu sayfayı yenilemek
      const had = choice && ((choice.analytics && !c.analytics) || (choice.marketing && !c.marketing));
      if (had) window.location.reload();
    }
  };

  const clean = (v: string) => v.replace(/[^A-Za-z0-9_/-]/g, "");
  const gaId = ga ? clean(ga) : "";
  const adIds = ads.map(clean).filter((x) => /^AW-\d+$/.test(x));
  const adLabels = labels.map(clean).filter((x) => /^AW-\d+\/[\w-]+$/.test(x));
  const gtmId = gtm ? clean(gtm) : "";
  const pxId = px?.replace(/\D/g, "");
  const a = !!choice?.analytics;
  const m = !!choice?.marketing;
  // Google etiketi: analitik onayıyla GA4, pazarlama onayıyla Google Ads. Consent Mode v2 sinyalleri her zaman ilk komut.
  const gIds = [...(a && gaId ? [gaId] : []), ...(m ? adIds : [])];
  const gBoot =
    "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;" +
    `gtag('consent','default',{analytics_storage:'${a ? "granted" : "denied"}',ad_storage:'${m ? "granted" : "denied"}',ad_user_data:'${m ? "granted" : "denied"}',ad_personalization:'${m ? "granted" : "denied"}'});` +
    "gtag('js',new Date());" +
    gIds.map((id) => `gtag('config','${id}',{send_page_view:false});`).join("") +
    `window.__arenaAds=${JSON.stringify(m ? adLabels : [])};window.dispatchEvent(new Event('arena-tags'));`;
  return (
    <>
      {choice && (gIds.length || gtmId) ? (
        <>
          <Script id="gtag-boot" strategy="afterInteractive">{gBoot}</Script>
          {gIds.length ? <Script src={`https://www.googletagmanager.com/gtag/js?id=${gIds[0]}`} strategy="afterInteractive" /> : null}
          {gtmId ? (
            <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>
          ) : null}
        </>
      ) : null}
      {m && pxId ? (
        <Script id="px" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pxId}');window.dispatchEvent(new Event('arena-tags'));`}</Script>
      ) : null}
      {open ? (
        <div role="dialog" aria-label="Çerez tercihleri" className="fixed inset-x-3 bottom-[76px] z-[60] rounded-2xl border border-line bg-white/95 p-4 text-deep shadow-[0_20px_50px_-20px_rgba(20,20,22,.45)] backdrop-blur md:inset-x-auto md:bottom-5 md:left-5 md:w-[400px]">
          <div className="flex items-center gap-2">
            <Cookie size={17} className="text-mute" />
            <b className="text-[14.5px]">Çerez tercihlerin</b>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-mute">
            Gerekli çerezler her zaman açık. İzin verirsen ziyaret istatistiği (Google Analytics) ve reklam ölçümü (Meta) için de kullanırız.{" "}
            <Link href="/sayfa/cerez-politikasi" className="font-semibold text-deep underline underline-offset-2">Politika</Link>
          </p>
          {detail ? (
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-soft p-3 text-[13px]">
              <label className="flex items-center gap-2"><input type="checkbox" checked disabled className="h-4 w-4" /> <b>Zorunlu</b> <span className="text-mute">— sepet, oturum, güvenlik</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={draft.analytics} onChange={(e) => setDraft({ ...draft, analytics: e.target.checked })} className="h-4 w-4 accent-[#1d1d1f]" /> <b>Analitik</b> <span className="text-mute">— ziyaret istatistikleri</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={draft.marketing} onChange={(e) => setDraft({ ...draft, marketing: e.target.checked })} className="h-4 w-4 accent-[#1d1d1f]" /> <b>Pazarlama</b> <span className="text-mute">— reklam ölçümü</span></label>
            </div>
          ) : null}
          {/* Kabul ve ret aynı görünürlükte (KVKK/ GDPR: reddetmek kabul etmek kadar kolay olmalı) */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => decide({ analytics: true, marketing: true })} className="h-10 rounded-full bg-deep text-[13px] font-bold text-white hover:bg-black">Tümünü kabul et</button>
            <button type="button" onClick={() => decide({ analytics: false, marketing: false })} className="h-10 rounded-full border border-[#d6d6db] text-[13px] font-bold hover:border-deep">Sadece zorunlu</button>
          </div>
          {detail ? (
            <button type="button" onClick={() => decide(draft)} className="mt-2 h-9 w-full rounded-full bg-soft text-[13px] font-bold">Seçimimi kaydet</button>
          ) : (
            <button type="button" onClick={() => setDetail(true)} className="mt-2 text-[12.5px] font-semibold text-mute underline underline-offset-2 hover:text-deep">Ayarla</button>
          )}
        </div>
      ) : null}
    </>
  );
}

export function ConsentLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsent} className={className}>
      Çerez tercihleri
    </button>
  );
}
