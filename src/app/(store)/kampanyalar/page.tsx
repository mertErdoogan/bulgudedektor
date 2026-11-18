import { getLocale, getT } from "@/lib/i18n/server";
import { localize } from "@/lib/i18n/content";
import { cardCtx } from "@/lib/card-ctx";
import { pageMeta } from "@/lib/seo";
import { liveCampaigns, productsFor } from "@/lib/store";
import { ProductCard } from "@/components/store/product-card";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTL } from "@/lib/utils";

export const generateMetadata = async () => {
  const t = await getT();
  return pageMeta({ title: t("deals.metaTitle"), description: t("deals.metaDesc"), path: "/kampanyalar" });
};

export default async function CampaignsPage() {
  const [cs0, deals, s, loc, t] = await Promise.all([liveCampaigns(), productsFor("deals", 12), getSettings(), getLocale(), getT()]);
  const cs = await localize(cs0, "campaign", loc);
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl font-extrabold">{t("nav.campaigns")}</h1>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {cs.map((c) => (
          <div key={c.id} className="rounded-2xl border-[1.5px] border-brand bg-tint p-5">
            <b className="text-lg">{c.name}</b>
            <p className="mt-1 text-sm">{c.description ?? (c.type === "PERCENT" ? t("deals.pct", { n: c.value }) : c.type === "FIXED" ? t("deals.fixed", { tutar: formatTL(c.value) }) : t("deals.freeShip"))}</p>
            {c.code ? <p className="mt-3 inline-block rounded-lg border-2 border-dashed border-brand bg-white px-3 py-1.5 font-mono font-extrabold select-all">{c.code}</p> : <p className="mt-3 text-sm font-bold text-link">{t("deals.auto")}</p>}
            <p className="mt-2 text-xs text-mute">{c.minSubtotal ? `${t("deals.min", { tutar: formatTL(c.minSubtotal) })} · ` : ""}{c.endsAt ? t("deals.ends", { tarih: formatDate(c.endsAt, false, loc) }) : t("deals.noEnd")}</p>
          </div>
        ))}
        {!cs.length ? <p className="text-mute">{t("deals.none")}</p> : null}
      </div>
      {deals.length ? (
        <>
          <h2 className="font-display mt-10 mb-4 text-2xl font-extrabold">{t("deals.products")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{deals.map((p) => <ProductCard key={p.id} p={p} ctx={cardCtx(s, loc)} />)}</div>
        </>
      ) : null}
    </div>
  );
}
