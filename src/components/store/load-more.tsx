import Link from "@/components/locale-link";
import { ChevronDown } from "lucide-react";
import { T } from "@/components/i18n";

/**
 * "Daha fazla göster": listenin altında ilerleme çubuğu + gerçek bağlantı (?sayfa=N).
 * Sayfa sunucuda birikimli üretilir (sayfa 2 = ilk 48 öğe), böylece:
 * - butona basınca yeni öğeler eklenir, kaydırma yeri korunur;
 * - ürüne girip geri dönünce aynı yerden devam edilir (adres ?sayfa=N);
 * - arama motorları bağlantıyı izleyip tüm öğelere ulaşır (sonsuz kaydırmanın aksine).
 */
export function LoadMore({ shown, total, href, unit = "product" }: { shown: number; total: number; href: string; unit?: "product" | "post" }) {
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round((shown / total) * 100));
  return (
    <div className="mt-8 flex flex-col items-center gap-3" data-testid="load-more">
      <p className="text-[13px] font-semibold text-mute">
        <T k={unit === "post" ? "list.shownPosts" : "list.shown"} v={{ a: shown, b: total }} />
      </p>
      <span aria-hidden className="h-1 w-48 overflow-hidden rounded-full bg-line">
        <span className="block h-full rounded-full bg-deep transition-all" style={{ width: `${pct}%` }} />
      </span>
      {shown < total ? (
        <Link href={href} scroll={false} rel="next" className="mt-1 inline-flex h-12 items-center gap-2 rounded-full border border-deep bg-white px-6 text-[14.5px] font-extrabold text-deep transition hover:bg-deep hover:text-white" data-testid="load-more-btn">
          <T k="list.more" /> <ChevronDown size={17} />
        </Link>
      ) : null}
    </div>
  );
}
