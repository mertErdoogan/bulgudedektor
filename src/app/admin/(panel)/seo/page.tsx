import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { db } from "@/db";
import { categories, faqs, posts, products, reviews } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { Card, CardHeader, Stat } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { isPublicHost, real, sameAs, siteUrl } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "SEO sağlık kontrolü" };
type Check = { ok: boolean | "warn"; label: string; help: string; href?: string };

export default async function SeoHealth() {
  await requireStaff("cms.manage");
  const s = await getSettings();
  const [prods, cats, ps, faqN, glossN, revN] = await Promise.all([
    db.query.products.findMany({ where: eq(products.status, "ACTIVE"), columns: { id: true, name: true, shortDescription: true, seoDescription: true, barcode: true, specs: true, idealFor: true }, with: { images: { columns: { id: true } } } }),
    db.select().from(categories).where(eq(categories.isActive, true)),
    db.select({ id: posts.id, title: posts.title, status: posts.status, answer: posts.answer, coverImage: posts.coverImage }).from(posts),
    db.select({ n: sql<number>`count(*)::int` }).from(faqs).where(eq(faqs.kind, "FAQ")),
    db.select({ n: sql<number>`count(*)::int` }).from(faqs).where(eq(faqs.kind, "GLOSSARY")),
    db.select({ n: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.isApproved, true)),
  ]);
  const st = s.store;
  const social = sameAs(s).length;
  const published = ps.filter((p) => p.status === "PUBLISHED");
  const wc = (t: string | null) => (t ?? "").split(/\s+/).filter(Boolean).length;

  const site: Check[] = [
    { ok: isPublicHost(), label: "Canlı alan adı (APP_URL)", help: `Şu an: ${siteUrl()}. Canonical, sitemap ve şema linkleri bu adresi kullanır.` },
    { ok: !!s.seo.googleVerification, label: "Google Search Console doğrulaması", help: "Search Console'a siteyi ekle, HTML etiketini Ayarlar › SEO'ya yapıştır, sitemap.xml'i gönder.", href: "/admin/ayarlar?t=seo" },
    { ok: !!s.seo.bingVerification, label: "Bing Webmaster doğrulaması", help: "ChatGPT Search ve Copilot Bing dizinini kullanır. Bing'e eklemek AI görünürlüğü için kritik.", href: "/admin/ayarlar?t=seo" },
    { ok: !!s.seo.indexNowKey, label: "IndexNow anahtarı", help: "Yeni ürün ve yazılar Bing/Yandex'e anında bildirilir.", href: "/admin/ayarlar?t=seo" },
    { ok: wc(s.seo.aboutForAi) >= 30 ? true : "warn", label: "AI için mağaza tanımı", help: "2–4 cümle, somut: hangi markalar, hangi hizmetler, nerede.", href: "/admin/ayarlar?t=seo" },
    { ok: !!st.googleBusinessUrl, label: "Google İşletme Profili", help: "Haritalarda çıkmak ve 'yakınımdaki dedektör mağazası' aramaları için. Adres ve telefon sitedekiyle birebir aynı olmalı.", href: "/admin/ayarlar?t=magaza" },
    { ok: !!st.googleReviewUrl, label: "Google yorum linki", help: "Teslim edilen siparişlerden sonra müşteriye otomatik yorum daveti gider.", href: "/admin/ayarlar?t=magaza" },
    { ok: social >= 3 ? true : social ? "warn" : false, label: `Sosyal profiller (${social})`, help: "Instagram, YouTube, TikTok… En az 3 aktif profil, marka varlığını AI motorlarına doğrular.", href: "/admin/ayarlar?t=magaza" },
    { ok: !!(real(st.address) && st.phone), label: "Adres ve telefon (NAP)", help: "Yerel işletme şeması ve güven için gerekli.", href: "/admin/ayarlar?t=magaza" },
    { ok: !!(st.latitude && st.longitude), label: "Harita koordinatları", help: "Store şemasında konum; yerel aramalar için.", href: "/admin/ayarlar?t=magaza" },
    { ok: !!(real(st.etbis) && real(st.legalName)), label: "ETBİS ve şirket unvanı", help: "Güven sinyali ve yasal zorunluluk.", href: "/admin/ayarlar?t=magaza" },
  ];
  const content: Check[] = [
    { ok: published.length >= 10 ? true : published.length >= 3 ? "warn" : false, label: `Yayında rehber: ${published.length}`, help: "Hedef: ilk 3 ayda 20+ rehber, haftada 1–2 yeni yazı.", href: "/admin/blog" },
    { ok: faqN[0].n >= 15 ? true : faqN[0].n ? "warn" : false, label: `SSS: ${faqN[0].n}`, help: "Müşterilerin WhatsApp'ta sorduğu her soruyu buraya ekle.", href: "/admin/sss" },
    { ok: glossN[0].n >= 15 ? true : glossN[0].n ? "warn" : false, label: `Sözlük terimi: ${glossN[0].n}`, help: "'Ayrım nedir?', 'Toprak dengeleme nedir?' gibi tanım aramalarını yakalar.", href: "/admin/sss?t=sozluk" },
    { ok: revN[0].n >= 20 ? true : revN[0].n ? "warn" : false, label: `Onaylı ürün yorumu: ${revN[0].n}`, help: "Yıldızlar Google sonuçlarında görünür. Teslimattan sonra yorum daveti e-postası otomatik gider.", href: "/admin/yorumlar" },
  ];

  const prodIssues = prods
    .map((p) => ({
      p,
      issues: [
        !p.shortDescription ? "kısa açıklama yok" : null,
        p.seoDescription && (p.seoDescription.length < 110 || p.seoDescription.length > 165) ? `meta açıklama ${p.seoDescription.length} karakter` : null,
        p.images.length < 3 ? `${p.images.length} görsel (3+ önerilir)` : null,
        p.specs.length < 5 ? "teknik özellik az" : null,
        !p.idealFor.length ? "'kimler için' boş" : null,
        !p.barcode ? "barkod/GTIN yok (Google Alışveriş)" : null,
      ].filter(Boolean) as string[],
    }))
    .filter((x) => x.issues.length);
  const catIssues = cats.map((c) => ({ c, issues: [!c.description ? "açıklama yok" : null, !c.seoContent ? "rehber metni yok" : wc(c.seoContent) < 250 ? "rehber metni kısa" : null, !c.seoDescription ? "meta açıklama yok" : null].filter(Boolean) as string[] })).filter((x) => x.issues.length);
  const postIssues = ps.map((p) => ({ p, issues: [!p.answer ? "kısa cevap yok" : wc(p.answer) < 35 || wc(p.answer) > 70 ? `kısa cevap ${wc(p.answer)} kelime` : null, !p.coverImage ? "kapak görseli yok" : null].filter(Boolean) as string[] })).filter((x) => x.issues.length);

  const all = [...site, ...content];
  const score = Math.round((all.reduce((a, c) => a + (c.ok === true ? 1 : c.ok === "warn" ? 0.5 : 0), 0) / all.length) * 100);
  const Icon = ({ ok }: { ok: Check["ok"] }) => (ok === true ? <CheckCircle2 size={18} className="shrink-0 text-ok" /> : ok === "warn" ? <CircleAlert size={18} className="shrink-0 text-warn" /> : <XCircle size={18} className="shrink-0 text-danger" />);
  const List = ({ items }: { items: Check[] }) => (
    <ul className="divide-y divide-line">
      {items.map((c) => (
        <li key={c.label} className="flex items-start gap-3 px-5 py-3 text-sm">
          <Icon ok={c.ok} />
          <span className="flex-1"><b>{c.label}</b><span className="block text-mute">{c.help}</span></span>
          {c.href && c.ok !== true ? <Link href={c.href} className="shrink-0 font-bold text-link">Düzelt →</Link> : null}
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <PageHeader title="SEO ve AI görünürlük sağlığı" description="Google, Google AI Overviews, ChatGPT Search, Perplexity ve Claude'da görünmek için eksikler." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Genel skor" value={`${score}/100`} sub={score >= 80 ? "İyi" : score >= 50 ? "Geliştirilmeli" : "Eksikler var"} tone={score >= 80 ? "ok" : score >= 50 ? "warn" : "danger"} />
        <Stat label="Eksikli ürün" value={prodIssues.length} sub={`${prods.length} aktif ürün`} tone={prodIssues.length ? "warn" : "ok"} />
        <Stat label="Eksikli kategori" value={catIssues.length} sub={`${cats.length} aktif kategori`} tone={catIssues.length ? "warn" : "ok"} />
        <Stat label="Eksikli yazı" value={postIssues.length} sub={`${ps.length} yazı`} tone={postIssues.length ? "warn" : "ok"} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader title="Site ve dijital ayak izi" /><List items={site} /></Card>
        <div className="flex flex-col gap-5">
          <Card><CardHeader title="İçerik ve sosyal kanıt" /><List items={content} /></Card>
          <Card>
            <CardHeader title="Otomatik çalışanlar" />
            <ul className="grid gap-1 px-5 pb-5 text-sm">
              {["Product, Offer, AggregateRating, Review şemaları (ürün)", "Organization + WebSite (arama kutusu) + Store (yerel)", "BreadcrumbList, ItemList (kategori/marka)", "FAQPage, BlogPosting, DefinedTermSet", "Canonical, Open Graph, Twitter kartları", "robots.txt — GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended izinli", "llms.txt / llms-full.txt, sitemap (görselli), RSS, Merchant feed", "Adres değişince otomatik 301 yönlendirme"].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" />{t}</li>
              ))}
            </ul>
          </Card>
        </div>
        {prodIssues.length ? (
          <Card className="xl:col-span-2">
            <CardHeader title="Ürünler" description="Eksik bilgi, hem Google zengin sonuçlarını hem AI cevaplarında seçilmeyi düşürür." />
            <ul className="divide-y divide-line">{prodIssues.slice(0, 50).map(({ p, issues }) => <li key={p.id} className="flex flex-wrap items-center gap-2 px-5 py-2.5 text-sm"><Link href={`/admin/urunler/${p.id}`} className="font-bold hover:text-link">{p.name}</Link><span className="text-mute">— {issues.join(" · ")}</span></li>)}</ul>
          </Card>
        ) : null}
        {catIssues.length ? (
          <Card>
            <CardHeader title="Kategoriler" />
            <ul className="divide-y divide-line">{catIssues.map(({ c, issues }) => <li key={c.id} className="px-5 py-2.5 text-sm"><Link href={`/admin/kategoriler?id=${c.id}`} className="font-bold hover:text-link">{c.name}</Link> <span className="text-mute">— {issues.join(" · ")}</span></li>)}</ul>
          </Card>
        ) : null}
        {postIssues.length ? (
          <Card>
            <CardHeader title="Yazılar" />
            <ul className="divide-y divide-line">{postIssues.map(({ p, issues }) => <li key={p.id} className="px-5 py-2.5 text-sm"><Link href={`/admin/blog/${p.id}`} className="font-bold hover:text-link">{p.title}</Link> <span className="text-mute">— {issues.join(" · ")}</span></li>)}</ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
