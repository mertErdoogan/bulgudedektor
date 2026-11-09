"use client";

import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

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

export function ConsentAndAnalytics({ ga, px }: { ga?: string; px?: string }) {
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

  // Sayfa değişiminde GA'ya sayfa görüntüleme bildir (SPA geçişleri)
  useEffect(() => {
    const w = window as Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };
    if (choice?.analytics && ga) w.gtag?.("event", "page_view", { page_path: path });
    if (choice?.marketing && px) w.fbq?.("track", "PageView");
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

  const gaId = ga?.replace(/[^A-Z0-9-]/gi, "");
  const pxId = px?.replace(/\D/g, "");
  return (
    <>
      {choice?.analytics && gaId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{send_page_view:false});`}</Script>
        </>
      ) : null}
      {choice?.marketing && pxId ? (
        <Script id="px" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pxId}');`}</Script>
      ) : null}
      {open ? (
        <div role="dialog" aria-label="Çerez tercihleri" className="fixed inset-x-3 bottom-[76px] z-[60] mx-auto max-w-3xl rounded-2xl border border-line bg-white p-4 text-deep shadow-2xl md:bottom-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint text-brand sm:grid"><Cookie size={20} /></span>
            <div className="min-w-0 flex-1 text-sm">
              <b className="text-[15px]">Çerez tercihlerin</b>
              <p className="mt-1 text-mute">
                Sitenin çalışması için gerekli çerezleri kullanıyoruz. Onay verirsen ziyaretleri ölçmek (Google Analytics) ve sana uygun reklam göstermek (Meta) için ek çerezler de kullanırız.{" "}
                <Link href="/sayfa/cerez-politikasi" className="font-bold text-link">Çerez politikası</Link>
              </p>
              {detail ? (
                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-soft p-3">
                  <label className="flex items-center gap-2"><input type="checkbox" checked disabled className="h-4 w-4" /> <b>Zorunlu</b> <span className="text-mute">— sepet, oturum, güvenlik</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={draft.analytics} onChange={(e) => setDraft({ ...draft, analytics: e.target.checked })} className="h-4 w-4 accent-[#d42e1e]" /> <b>Analitik</b> <span className="text-mute">— ziyaret istatistikleri</span></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={draft.marketing} onChange={(e) => setDraft({ ...draft, marketing: e.target.checked })} className="h-4 w-4 accent-[#d42e1e]" /> <b>Pazarlama</b> <span className="text-mute">— reklam ölçümü</span></label>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => decide({ analytics: true, marketing: true })} className="h-10 rounded-lg bg-brand px-4 text-sm font-extrabold text-white">Tümünü kabul et</button>
                <button type="button" onClick={() => decide({ analytics: false, marketing: false })} className="h-10 rounded-lg border border-deep px-4 text-sm font-extrabold">Sadece zorunlu</button>
                {detail ? (
                  <button type="button" onClick={() => decide(draft)} className="h-10 rounded-lg bg-soft px-4 text-sm font-extrabold">Seçimimi kaydet</button>
                ) : (
                  <button type="button" onClick={() => setDetail(true)} className="h-10 px-2 text-sm font-bold text-mute underline">Ayarla</button>
                )}
              </div>
            </div>
          </div>
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
