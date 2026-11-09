import { cardCtx } from "@/lib/card-ctx";
import { pageMeta } from "@/lib/seo";
import { liveCampaigns, productsFor } from "@/lib/store";
import { ProductCard } from "@/components/store/product-card";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTL } from "@/lib/utils";

export const metadata = pageMeta({ title: "Dedektör Kampanyaları ve İndirimler", description: "Güncel metal dedektörü kampanyaları, indirimli modeller ve vade farksız taksit fırsatları.", path: "/kampanyalar" });

export default async function CampaignsPage() {
  const [cs, deals, s] = await Promise.all([liveCampaigns(), productsFor("deals", 12), getSettings()]);
  return (
    <div className="container-x py-8">
      <h1 className="font-display text-3xl font-extrabold">Kampanyalar</h1>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {cs.map((c) => (
          <div key={c.id} className="rounded-2xl border-[1.5px] border-brand bg-tint p-5">
            <b className="text-lg">{c.name}</b>
            <p className="mt-1 text-sm">{c.description ?? (c.type === "PERCENT" ? `%${c.value} indirim` : c.type === "FIXED" ? `${formatTL(c.value)} indirim` : "Kargo bedava")}</p>
            {c.code ? <p className="mt-3 inline-block rounded-lg border-2 border-dashed border-brand bg-white px-3 py-1.5 font-mono font-extrabold select-all">{c.code}</p> : <p className="mt-3 text-sm font-bold text-link">Sepette otomatik uygulanır</p>}
            <p className="mt-2 text-xs text-mute">{c.minSubtotal ? `${formatTL(c.minSubtotal)} ve üzeri · ` : ""}{c.endsAt ? `Son gün ${formatDate(c.endsAt)}` : "Süresiz"}</p>
          </div>
        ))}
        {!cs.length ? <p className="text-mute">Şu an aktif kampanya yok.</p> : null}
      </div>
      {deals.length ? (
        <>
          <h2 className="font-display mt-10 mb-4 text-2xl font-extrabold">İndirimli ürünler</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{deals.map((p) => <ProductCard key={p.id} p={p} ctx={cardCtx(s)} />)}</div>
        </>
      ) : null}
    </div>
  );
}
