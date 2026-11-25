import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { CheckCircle2, Circle } from "lucide-react";
import { db } from "@/db";
import { categories, pages, products, users } from "@/db/schema";
import { ActionButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Card } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { completeSetup } from "./actions";

export const metadata = { title: "Kurulum" };

export default async function SetupPage() {
  await requireStaff("settings.manage");
  const s = await getSettings();
  const n = sql<number>`count(*)::int`;
  const [[p], [c], [u], legal] = await Promise.all([
    db.select({ n }).from(products).where(eq(products.status, "ACTIVE")),
    db.select({ n }).from(categories),
    db.select({ n }).from(users),
    db.select().from(pages),
  ]);
  const legalOk = legal.length >= 3 && legal.filter((x) => ["mesafeli-satis-sozlesmesi", "on-bilgilendirme-formu", "kvkk-aydinlatma-metni"].includes(x.slug)).every((x) => !x.content.includes("Bu metin örnektir")) && !!(s.store.taxNumber && s.store.mersis);
  // Her adım için "neden tamamlanmadı": eksik alanların adı (yeni çalışan neyi doldurması gerektiğini görsün)
  const miss = (pairs: [unknown, string][]) => pairs.filter(([v]) => !v).map(([, n]) => n);
  const pickup = s.shipping.pickupAddress || s.store.address; // panel boşsa mağaza adresi kullanılır
  const keysOk = s.payment.provider === "paytr" ? !!(s.payment.paytrMerchantId && s.payment.paytrMerchantKey && s.payment.paytrMerchantSalt) : !!(s.payment.iyzicoApiKey && s.payment.iyzicoSecretKey);
  const transferOk = s.payment.transferEnabled && s.payment.bankAccounts.some((b) => b.iban);
  // Kart açıksa anahtarlar şart; kart kapalıysa en az havale (IBAN'lı) açık olmalı
  const payOk = s.payment.cardEnabled ? keysOk : transferOk;
  const mailOk = !!(s.integrations.smtpHost && s.integrations.smtpUser && s.integrations.smtpPass);
  const missing: Record<string, string[]> = {
    store: miss([[s.store.legalName && !s.store.legalName.startsWith("["), "ticari unvan"], [s.store.phone, "telefon"], [s.store.address, "adres"], [s.store.etbis, "ETBİS no"]]),
    pay: s.payment.cardEnabled
      ? [...(s.payment.provider === "paytr" ? miss([[s.payment.paytrMerchantId, "PayTR mağaza no"], [s.payment.paytrMerchantKey, "PayTR key"], [s.payment.paytrMerchantSalt, "PayTR salt"]]) : miss([[s.payment.iyzicoApiKey, "iyzico API key"], [s.payment.iyzicoSecretKey, "iyzico secret"]])), ...(keysOk ? [] : ["(ya da kartı kapatıp yalnız havale ile başla)"])]
      : miss([[s.payment.transferEnabled, "havale/EFT açık değil"], [transferOk || !s.payment.transferEnabled, "IBAN"]]),
    ship: miss([[s.shipping.carriers.length, "kargo firması"], [!s.shipping.pickupEnabled || pickup, "showroom teslim adresi"]]),
    mail: miss([[s.integrations.smtpHost, "SMTP sunucu"], [s.integrations.smtpUser, "SMTP kullanıcı"], [s.integrations.smtpPass, "SMTP şifre"]]),
    legal: miss([[s.store.taxNumber, "vergi no"], [s.store.mersis, "MERSİS no"], [legal.filter((x) => ["mesafeli-satis-sozlesmesi", "on-bilgilendirme-formu", "kvkk-aydinlatma-metni"].includes(x.slug)).every((x) => !x.content.includes("Bu metin örnektir")), "sözleşmelerdeki 'örnek metin' notu"]]),
  };
  const steps = [
    { required: true, done: !!(s.store.legalName && !s.store.legalName.startsWith("[") && s.store.phone && s.store.address && s.store.etbis), title: "Mağaza bilgileri", miss: missing.store, desc: "Unvan, adres, telefon, WhatsApp, vergi no, MERSİS ve ETBİS. Footer ve sözleşmelerde kullanılır.", href: "/admin/ayarlar?t=magaza", time: "3 dk" },
    { required: false, done: (s.setup.completedSteps ?? []).includes("catalog") || s.catalog.nounOne !== "ürün", title: "Sektör ve ürün türü", desc: "Ne sattığını seç (ör. dedektör, elektronik, giyim): metinler buna göre yazılır, sektörüne uymayan modüller kapanır.", href: "/admin/ayarlar?t=katalog", time: "1 dk" },
    { required: false, done: !!(s.brand.logoUrl || s.brand.iconUrl), title: "Logo, ikon ve renk", desc: "Logonu ve site ikonunu yükle, ana rengini seç. Yüklemezsen mağaza adın yazı olarak, baş harfin ikon olarak görünür.", href: "/admin/ayarlar?t=marka", time: "3 dk" },
    { required: true, done: payOk, title: s.payment.cardEnabled ? `Ödeme altyapısı (${s.payment.provider === "paytr" ? "PayTR" : "iyzico"})` : "Ödeme (havale/EFT)", miss: missing.pay, desc: "Kartla ödemeyi alacak kuruluşu (iyzico veya PayTR) seç, anahtarları yapıştır, 'Bağlantıyı test et' de. Anahtar yokken kart seçeneği müşteriye gösterilmez; yalnız havaleyle de başlayabilirsin.", href: "/admin/ayarlar?t=odeme", time: "5 dk" },
    { required: true, done: s.shipping.carriers.length > 0 && (s.shipping.pickupEnabled ? !!pickup : true), title: "Kargo ve teslimat", miss: missing.ship, desc: "Kargo firmaları, ücret kuralı, aynı gün kargo saati ve showroom teslim adresi.", href: "/admin/ayarlar?t=kargo", time: "2 dk" },
    { required: true, done: mailOk, title: "E-posta gönderimi (SMTP)", miss: missing.mail, desc: "Sipariş onayı, şifre sıfırlama, e-posta doğrulama, fatura ve iade bildirimleri bununla gider. Kurulmadan müşteri hiçbir e-posta almaz.", href: "/admin/ayarlar?t=entegrasyon", time: "5 dk" },
    { required: true, done: c.n > 0 && p.n > 0, title: "Kategori ve ilk ürünler", desc: `${c.n} kategori, ${p.n} yayında ürün. CSV ile toplu yükleyebilirsin.`, href: "/admin/urunler", time: "—" },
    { required: true, done: legalOk, title: "Sözleşmeler ve KVKK", miss: missing.legal, desc: "Metinler hazır; unvan, adres, IBAN gibi bilgiler ayarlardan otomatik dolar. Vergi no ve MERSİS'i Mağaza bilgilerine gir, metinleri bir hukukçuya kontrol ettir.", href: "/admin/sayfalar", time: "10 dk" },
    { required: false, done: u.n > 1, title: "Ekibini davet et (isteğe bağlı)", desc: "Satış, depo ve servis için hesap aç; her biri sadece kendi işini görür.", href: "/admin/ekip", time: "2 dk" },
    { required: false, done: !!(s.integrations.gaMeasurementId || s.integrations.notifyEmail), title: "Bildirim ve analitik (isteğe bağlı)", desc: "Yeni sipariş e-postası, Google Analytics ve Meta Pixel.", href: "/admin/ayarlar?t=entegrasyon", time: "3 dk" },
  ];
  const req = steps.filter((x) => x.required);
  const reqLeft = req.filter((x) => !x.done).length;
  const count = steps.filter((x) => x.done).length;
  return (
    <>
      <PageHeader title="Mağazanı yayına hazırla" description={`${count} / ${steps.length} adım tamam. İstediğin sırayla yapabilirsin; her adım ilgili ayar sayfasını açar.`} />
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand" style={{ width: `${(count / steps.length) * 100}%` }} /></div>
      <Card className="max-w-3xl">
        <ol className="divide-y divide-line">
          {steps.map((x, i) => (
            <li key={x.title}>
              <Link href={x.href} className="flex items-start gap-4 px-5 py-4 hover:bg-soft">
                {x.done ? <CheckCircle2 className="mt-0.5 shrink-0 text-ok" /> : <Circle className="mt-0.5 shrink-0 text-mute" />}
                <span className="flex-1">
                  <b className={x.done ? "text-mute line-through" : ""}>{i + 1}. {x.title}</b>
                  <span className="block text-sm text-mute">{x.desc}</span>
                  {!x.done && "miss" in x && x.miss?.length ? (
                    <span className="mt-1 block text-xs font-semibold text-warn" data-testid="setup-missing">Eksik: {x.miss.join(", ")}</span>
                  ) : null}
                </span>
                <span className="text-xs whitespace-nowrap text-mute">{x.time}</span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-3 border-t border-line p-5">
          <p className="text-sm text-mute">{reqLeft ? `Zorunlu ${req.length} adımdan ${reqLeft} tanesi eksik; tamamlanmadan satışa açman önerilmez.` : "Zorunlu adımlar tamam, hazırsın!"}</p>
          {s.setup.completed ? (
            <ActionButton variant="outline" run={completeSetup.bind(null, false)}>Listeyi yeniden aç</ActionButton>
          ) : (
            <ActionButton run={completeSetup.bind(null, true)} confirmText={reqLeft ? "Bazı önemli adımlar eksik. Yine de kurulumu bitir?" : undefined}>Kurulumu tamamla</ActionButton>
          )}
        </div>
      </Card>
    </>
  );
}
