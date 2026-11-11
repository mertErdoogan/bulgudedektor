import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { generateIndexNowKey, saveIntegrations, savePayment, saveSeo, saveShipping, saveStore, hepsiburadaSyncNow, testIyzico, testSms, trendyolSyncNow } from "./actions";

export const metadata = { title: "Ayarlar" };
const mask = (v: string) => (v ? `${v.slice(0, 4)}••••••••${v.slice(-3)}` : "");

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const staff = await requireStaff("settings.manage");
  const tab = (await searchParams).t ?? "magaza";
  const s = await getSettings();
  const tabs = [
    ["magaza", "Mağaza"],
    ["kargo", "Kargo ve teslimat"],
    ...(can(staff.permissions, "payments.manage") ? [["odeme", "Ödeme"]] : []),
    ["entegrasyon", "Entegrasyonlar"],
    ["seo", "SEO"],
  ];
  return (
    <>
      <PageHeader title="Ayarlar" />
      <div className="mb-5 flex flex-wrap gap-1">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/admin/ayarlar?t=${k}`} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === k ? "bg-deep text-white" : "bg-white hover:bg-tint"}`}>{l}</Link>
        ))}
      </div>
      <div className="max-w-3xl">
        {tab === "magaza" ? (
          <Card>
            <CardHeader title="Mağaza bilgileri" description="Footer, sözleşmeler, faturalar ve iletişim butonlarında kullanılır. ETBİS ve MERSİS numaraları yasal olarak sitede görünmelidir." />
            <ActionForm action={saveStore} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Mağaza adı"><Input name="name" defaultValue={s.store.name} required /></Field>
              <Field label="Şirket unvanı"><Input name="legalName" defaultValue={s.store.legalName} /></Field>
              <Field label="Telefon"><Input name="phone" defaultValue={s.store.phone} /></Field>
              <Field label="WhatsApp numarası" hint="Ülke koduyla: 905xxxxxxxxx"><Input name="whatsapp" defaultValue={s.store.whatsapp} /></Field>
              <Field label="E-posta"><Input name="email" type="email" defaultValue={s.store.email} /></Field>
              <Field label="Çalışma saatleri"><Input name="workingHours" defaultValue={s.store.workingHours} /></Field>
              <Field label="Showroom / şirket adresi" className="md:col-span-2"><Textarea name="address" defaultValue={s.store.address} className="min-h-[60px]" /></Field>
              <Field label="Vergi dairesi"><Input name="taxOffice" defaultValue={s.store.taxOffice} /></Field>
              <Field label="Vergi no"><Input name="taxNumber" defaultValue={s.store.taxNumber} /></Field>
              <Field label="MERSİS no"><Input name="mersis" defaultValue={s.store.mersis} /></Field>
              <Field label="ETBİS kayıt no"><Input name="etbis" defaultValue={s.store.etbis} /></Field>
              <Field label="Duyuru şeridi" className="md:col-span-2"><Input name="announcement" defaultValue={s.store.announcement} /></Field>
              <Checkbox name="socialProof" defaultChecked={s.store.socialProof !== false} label="Ürünlerde gerçek ilgi bilgisini göster (ör. '24 saatte 30 kişi inceledi', 'Son 24 saatte 5 kişi sepete ekledi')" className="md:col-span-2" />

              <div className="mt-3 md:col-span-2">
                <p className="font-bold">Konum ve işletme bilgisi (Google İşletme Profili ile birebir aynı olmalı)</p>
                <p className="text-sm text-mute">Ad, adres, telefon her yerde aynı yazılırsa Google Haritalar ve AI aramaları seni güvenilir yerel işletme olarak tanır.</p>
              </div>
              <Field label="İl"><Input name="city" defaultValue={s.store.city} /></Field>
              <Field label="İlçe"><Input name="district" defaultValue={s.store.district} /></Field>
              <Field label="Posta kodu"><Input name="postalCode" defaultValue={s.store.postalCode} /></Field>
              <Field label="Kuruluş yılı"><Input name="foundingYear" defaultValue={s.store.foundingYear} placeholder="2015" /></Field>
              <Field label="Enlem" hint="Google Haritalar'da konuma sağ tıkla → ilk sayı"><Input name="latitude" defaultValue={s.store.latitude} placeholder="41.0082" /></Field>
              <Field label="Boylam"><Input name="longitude" defaultValue={s.store.longitude} placeholder="28.9784" /></Field>
              <Field label="Açılış saatleri (şema biçimi)" hint="Mo-Fr 09:00-20:00, Sa 10:00-18:00"><Input name="openingHours" defaultValue={s.store.openingHours} /></Field>
              <Field label="Fiyat aralığı"><Input name="priceRange" defaultValue={s.store.priceRange} placeholder="₺₺₺" /></Field>

              <div className="mt-3 md:col-span-2">
                <p className="font-bold">Dijital ayak izi (sosyal kanıt)</p>
                <p className="text-sm text-mute">Bu profiller şemaya “sameAs” olarak eklenir; AI motorları markayı bu kaynaklarla doğrular. Sadece aktif kullandığın hesapları gir.</p>
              </div>
              <Field label="Google İşletme Profili (Haritalar) linki"><Input name="googleBusinessUrl" defaultValue={s.store.googleBusinessUrl} placeholder="https://maps.app.goo.gl/…" /></Field>
              <Field label="Google yorum bırakma linki" hint="Teslimattan sonra müşteriye e-postayla gönderilir"><Input name="googleReviewUrl" defaultValue={s.store.googleReviewUrl} placeholder="https://g.page/r/…/review" /></Field>
              <Field label="Instagram"><Input name="instagram" defaultValue={s.store.instagram} placeholder="https://instagram.com/…" /></Field>
              <Field label="YouTube"><Input name="youtube" defaultValue={s.store.youtube} placeholder="https://youtube.com/@…" /></Field>
              <Field label="TikTok"><Input name="tiktok" defaultValue={s.store.tiktok} /></Field>
              <Field label="Facebook"><Input name="facebook" defaultValue={s.store.facebook} /></Field>
              <Field label="X (Twitter)"><Input name="x" defaultValue={s.store.x} /></Field>
              <Field label="LinkedIn"><Input name="linkedin" defaultValue={s.store.linkedin} /></Field>
              <Field label="Şikayetvar marka sayfası" className="md:col-span-2"><Input name="sikayetvarUrl" defaultValue={s.store.sikayetvarUrl} /></Field>
              <SubmitButton className="md:col-span-2 md:justify-self-start">Kaydet</SubmitButton>
            </ActionForm>
          </Card>
        ) : null}
        {tab === "kargo" ? (
          <Card>
            <CardHeader title="Kargo ve teslimat" />
            <ActionForm action={saveShipping} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Sabit kargo ücreti (TL)" hint="0 = her zaman ücretsiz"><Input name="flatRate" inputMode="decimal" defaultValue={s.shipping.flatRate} /></Field>
              <Field label="Ücretsiz kargo alt limiti (TL)" hint="0 = limit yok"><Input name="freeThreshold" inputMode="decimal" defaultValue={s.shipping.freeThreshold} /></Field>
              <Field label="Aynı gün kargo kesim saati"><Input name="sameDayCutoff" defaultValue={s.shipping.sameDayCutoff} placeholder="15:00" /></Field>
              <Field label="Tahmini teslim süresi (metin)"><Input name="deliveryEstimate" defaultValue={s.shipping.deliveryEstimate} placeholder="1–3 iş günü" /></Field>
              <Field label="Kargoda geçen süre: en az (iş günü)" hint="Ürün kartındaki 'Çar–Per kapında' tarihini hesaplar"><Input name="transitMinDays" type="number" min={1} defaultValue={s.shipping.transitMinDays} /></Field>
              <Field label="Kargoda geçen süre: en çok (iş günü)"><Input name="transitMaxDays" type="number" min={1} defaultValue={s.shipping.transitMaxDays} /></Field>
              <Checkbox name="shipOnSaturday" defaultChecked={s.shipping.shipOnSaturday} label="Cumartesi de kargo çıkıyor" />
              <Field label="Kargo firmaları" hint="Her satıra bir firma"><Textarea name="carriers" defaultValue={s.shipping.carriers.join("\n")} /></Field>
              <Field label="Varsayılan firma"><Input name="defaultCarrier" defaultValue={s.shipping.defaultCarrier} /></Field>
              <Field label="Takip bağlantıları" hint="Firma | adres ({code} takip no yerine geçer)" className="md:col-span-2">
                <Textarea name="tracking" defaultValue={Object.entries(s.shipping.trackingUrlTemplate).map(([k, v]) => `${k} | ${v}`).join("\n")} className="font-mono text-[12px]" />
              </Field>
              <Checkbox name="pickupEnabled" defaultChecked={s.shipping.pickupEnabled} label="Showroom'dan teslim alma seçeneği" className="md:col-span-2" />
              <Field label="Teslim alma adresi" className="md:col-span-2"><Textarea name="pickupAddress" defaultValue={s.shipping.pickupAddress} className="min-h-[60px]" /></Field>
              <SubmitButton className="md:col-span-2 md:justify-self-start">Kaydet</SubmitButton>
            </ActionForm>
          </Card>
        ) : null}
        {tab === "odeme" && can(staff.permissions, "payments.manage") ? (
          <Card>
            <CardHeader
              title="Ödeme"
              description="Kart bilgisi sitenizde tutulmaz: ödeme iyzico'nun güvenli formunda alınır (3D Secure)."
              action={s.payment.iyzicoApiKey ? <Badge tone="ok">iyzico bağlı</Badge> : <Badge tone="warn">iyzico anahtarı yok</Badge>}
            />
            <ActionForm action={savePayment} className="grid gap-4 p-5 md:grid-cols-2">
              <Checkbox name="cardEnabled" defaultChecked={s.payment.cardEnabled} label="Kredi / banka kartı ile ödeme (iyzico)" className="md:col-span-2" />
              <Field label="iyzico API anahtarı"><Input name="iyzicoApiKey" defaultValue={mask(s.payment.iyzicoApiKey)} autoComplete="off" /></Field>
              <Field label="iyzico gizli anahtar"><Input name="iyzicoSecretKey" defaultValue={mask(s.payment.iyzicoSecretKey)} autoComplete="off" /></Field>
              <Checkbox name="iyzicoSandbox" defaultChecked={s.payment.iyzicoSandbox} label="Test modu (sandbox) — canlıya geçerken kapat" className="md:col-span-2" />
              <Field label="En fazla taksit"><Input name="maxInstallment" type="number" min={1} max={12} defaultValue={s.payment.maxInstallment} /></Field>
              <Field label="Vade farksız taksit sayısı" hint="Sitede '3 ay vade farksız' olarak gösterilir; iyzico panelinden de tanımlanmalı."><Input name="noInterestInstallments" type="number" min={1} max={12} defaultValue={s.payment.noInterestInstallments} /></Field>
              <Field label="Genel taksit farkları (%)" hint="iyzico'ya bağlanılamadığında ürün sayfasındaki tabloda kullanılır. Biçim: taksit:oran, örn. 4:7.34, 5:9.21, 6:11.08" className="md:col-span-2"><Input name="installmentRates" defaultValue={Object.entries(s.payment.installmentRates ?? {}).map(([n, r]) => `${n}:${r}`).join(", ")} /></Field>
              <Checkbox name="transferEnabled" defaultChecked={s.payment.transferEnabled} label="Havale / EFT ile ödeme" className="md:col-span-2" />
              <Field label="Havale indirimi %"><Input name="transferDiscountPct" inputMode="decimal" defaultValue={s.payment.transferDiscountPct} /></Field>
              <div />
              <Field label="Banka hesapları" hint="Her satıra: Banka | Hesap sahibi | IBAN" className="md:col-span-2">
                <Textarea name="bankAccounts" defaultValue={s.payment.bankAccounts.map((b) => `${b.bank} | ${b.holder} | ${b.iban}`).join("\n")} className="font-mono text-[12px]" />
              </Field>
              <div className="flex gap-2 md:col-span-2">
                <SubmitButton>Kaydet</SubmitButton>
                <ActionButton variant="outline" run={testIyzico}>Bağlantıyı test et</ActionButton>
              </div>
            </ActionForm>
          </Card>
        ) : null}
        {tab === "entegrasyon" ? (
          <Card>
            <CardHeader title="Entegrasyonlar" description="Anahtarlar sadece sunucuda saklanır. Boş bıraktığın servis devre dışı kalır." />
            <ActionForm action={saveIntegrations} className="grid gap-4 p-5 md:grid-cols-2">
              <p className="font-bold md:col-span-2">Analitik ve reklam</p>
              <Field label="Google Analytics 4 ölçüm kimliği"><Input name="gaMeasurementId" defaultValue={s.integrations.gaMeasurementId} placeholder="G-XXXXXXX" /></Field>
              <Field label="Meta Pixel ID"><Input name="metaPixelId" defaultValue={s.integrations.metaPixelId} /></Field>
              <p className="mt-2 font-bold md:col-span-2">Bildirim e-postası (SMTP)</p>
              <Field label="SMTP sunucusu"><Input name="smtpHost" defaultValue={s.integrations.smtpHost} placeholder="smtp.yandex.com:465" /></Field>
              <Field label="Gönderen adres"><Input name="smtpFrom" defaultValue={s.integrations.smtpFrom} /></Field>
              <Field label="Kullanıcı"><Input name="smtpUser" defaultValue={s.integrations.smtpUser} /></Field>
              <Field label="Şifre"><Input name="smtpPass" defaultValue={mask(s.integrations.smtpPass)} autoComplete="off" /></Field>
              <Field label="Yeni sipariş bildirimi gidecek adres" className="md:col-span-2"><Input name="notifyEmail" defaultValue={s.integrations.notifyEmail} /></Field>
              <p className="mt-2 font-bold md:col-span-2">SMS (Netgsm)</p>
              <Field label="SMS sağlayıcı">
                <Select name="smsProvider" defaultValue={s.integrations.smsProvider}>
                  <option value="">Kapalı</option>
                  <option value="netgsm">Netgsm</option>
                </Select>
              </Field>
              <Field label="Gönderici başlığı" hint="Netgsm'de onaylı başlık (örn. ARENADEDEKT)"><Input name="netgsmHeader" defaultValue={s.integrations.netgsmHeader} /></Field>
              <Field label="Kullanıcı kodu" hint="Netgsm → Ayarlar → Alt kullanıcı (API yetkili)"><Input name="netgsmUser" defaultValue={s.integrations.netgsmUser} placeholder="850XXXXXXX" /></Field>
              <Field label="API şifresi"><Input name="netgsmPass" defaultValue={mask(s.integrations.netgsmPass)} autoComplete="off" /></Field>
              <div className="flex flex-wrap gap-4 md:col-span-2">
                <Checkbox name="smsOnPlaced" defaultChecked={s.integrations.smsOnPlaced} label="Sipariş alındı" />
                <Checkbox name="smsOnShipped" defaultChecked={s.integrations.smsOnShipped} label="Kargoya verildi" />
                <Checkbox name="smsOnDelivered" defaultChecked={s.integrations.smsOnDelivered} label="Teslim edildi" />
              </div>
              <p className="mt-2 font-bold md:col-span-2">Trendyol pazaryeri</p>
              <Checkbox name="trendyolEnabled" defaultChecked={s.integrations.trendyolEnabled} label="Fiyat/stok senkronu ve sipariş aktarımı açık (her saat)" className="md:col-span-2" />
              <Field label="Satıcı ID (supplierId)"><Input name="trendyolSupplierId" defaultValue={s.integrations.trendyolSupplierId} /></Field>
              <Field label="Fiyat farkı %" hint="Komisyon için Trendyol fiyatı site fiyatından bu kadar yüksek gönderilir."><Input name="trendyolPriceMarkupPct" inputMode="decimal" defaultValue={s.integrations.trendyolPriceMarkupPct} /></Field>
              <Field label="API key"><Input name="trendyolApiKey" defaultValue={mask(s.integrations.trendyolApiKey)} autoComplete="off" /></Field>
              <Field label="API secret"><Input name="trendyolApiSecret" defaultValue={mask(s.integrations.trendyolApiSecret)} autoComplete="off" /></Field>
              <p className="mt-2 font-bold md:col-span-2">Hepsiburada pazaryeri</p>
              <Checkbox name="hbEnabled" defaultChecked={s.integrations.hbEnabled} label="Fiyat/stok senkronu ve sipariş aktarımı açık (15 dakikada bir)" className="md:col-span-2" />
              <Field label="Merchant ID" hint="Hepsiburada satıcı panelindeki mağaza kimliği (GUID)"><Input name="hbMerchantId" defaultValue={s.integrations.hbMerchantId} /></Field>
              <Field label="Fiyat farkı %"><Input name="hbPriceMarkupPct" inputMode="decimal" defaultValue={s.integrations.hbPriceMarkupPct} /></Field>
              <Field label="API kullanıcı adı"><Input name="hbUser" defaultValue={s.integrations.hbUser} autoComplete="off" /></Field>
              <Field label="API şifresi"><Input name="hbPass" defaultValue={mask(s.integrations.hbPass)} autoComplete="off" /></Field>
              <p className="mt-2 font-bold md:col-span-2">Diğer</p>
              <Field label="WhatsApp Business API token"><Input name="whatsappApiToken" defaultValue={mask(s.integrations.whatsappApiToken)} autoComplete="off" /></Field>
              <Field label="Kargo entegrasyonu API anahtarı"><Input name="cargoApiKey" defaultValue={mask(s.integrations.cargoApiKey)} autoComplete="off" /></Field>
              <Field label="e-Fatura / e-Arşiv sağlayıcı"><Input name="eInvoiceProvider" defaultValue={s.integrations.eInvoiceProvider} placeholder="Paraşüt, Logo, Uyumsoft…" /></Field>
              <Field label="e-Fatura API anahtarı"><Input name="eInvoiceApiKey" defaultValue={mask(s.integrations.eInvoiceApiKey)} autoComplete="off" /></Field>
              <SubmitButton className="md:col-span-2 md:justify-self-start">Kaydet</SubmitButton>
            </ActionForm>
            {s.integrations.smsProvider ? (
              <ActionForm action={testSms} className="flex flex-wrap items-end gap-2 border-t border-line p-5">
                <Field label="Test SMS'i gönder"><Input name="phone" placeholder="05XX XXX XX XX" /></Field>
                <SubmitButton variant="outline">Gönder</SubmitButton>
              </ActionForm>
            ) : null}
            {s.integrations.hbEnabled ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-line p-5 text-sm">
                <span className="flex-1 text-mute">Hepsiburada&apos;da ürünler <b>stok kodu (SKU)</b> ile eşleşir: Hepsiburada&apos;daki satıcı stok kodu sitedeki SKU ile aynı olmalı.</span>
                <ActionButton run={hepsiburadaSyncNow} variant="outline">Şimdi senkronla</ActionButton>
              </div>
            ) : null}
            {s.integrations.trendyolEnabled ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-line p-5 text-sm">
                <span className="flex-1 text-mute">Trendyol&apos;da ürünler <b>barkod</b> ile eşleşir; barkodu boş ürünler gönderilmez.</span>
                <ActionButton run={trendyolSyncNow} variant="outline">Şimdi senkronla</ActionButton>
              </div>
            ) : null}
          </Card>
        ) : null}
        {tab === "seo" ? (
          <Card>
            <CardHeader title="Arama motoru" description="Ana sayfa başlığı ve açıklaması. Ürün ve kategori SEO'su kendi sayfalarında." />
            <ActionForm action={saveSeo} className="flex flex-col gap-4 p-5">
              <Field label="Site başlığı" hint="50–60 karakter ideal"><Input name="title" defaultValue={s.seo.title} /></Field>
              <Field label="Site açıklaması" hint="140–160 karakter ideal"><Textarea name="description" defaultValue={s.seo.description} /></Field>
              <Field label="Mağaza tanımı (AI motorları için)" hint="ChatGPT, Perplexity, Claude ve Google AI'ın seni nasıl tanıtmasını istiyorsan 2–4 cümlede, somut bilgilerle yaz. Ana sayfada, llms.txt'de ve kurum şemasında kullanılır.">
                <Textarea name="aboutForAi" defaultValue={s.seo.aboutForAi} className="min-h-[110px]" />
              </Field>
              <Field label="Paylaşım görseli (Open Graph)" hint="1200×630 px. WhatsApp/sosyal medya paylaşımlarında görünür."><Input name="ogImage" defaultValue={s.seo.ogImage} placeholder="/media/… veya https://…" /></Field>
              <p className="mt-2 font-bold">Arama motoru doğrulama</p>
              <Field label="Google Search Console" hint="HTML etiketi yöntemi: <meta …> etiketini veya sadece content değerini yapıştır"><Input name="googleVerification" defaultValue={s.seo.googleVerification} /></Field>
              <Field label="Bing Webmaster Tools" hint="ChatGPT Search Bing dizinini kullanır — mutlaka ekle"><Input name="bingVerification" defaultValue={s.seo.bingVerification} /></Field>
              <Field label="Yandex Webmaster"><Input name="yandexVerification" defaultValue={s.seo.yandexVerification} /></Field>
              <Field label="IndexNow anahtarı" hint="Ürün/yazı yayınlanınca Bing ve Yandex'e anında bildirilir. Boşsa aşağıdan üret."><Input name="indexNowKey" defaultValue={s.seo.indexNowKey} /></Field>
              <div className="flex flex-wrap gap-2">
                <SubmitButton>Kaydet</SubmitButton>
                {!s.seo.indexNowKey ? <ActionButton variant="outline" run={generateIndexNowKey}>IndexNow anahtarı üret</ActionButton> : null}
              </div>
              <div className="rounded-xl bg-soft p-4 text-sm">
                <p className="font-bold">Otomatik üretilen dosyalar</p>
                <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                  {[["/sitemap.xml", "Site haritası"], ["/robots.txt", "Robots (AI botlarına izinli)"], ["/llms.txt", "llms.txt (AI özet)"], ["/llms-full.txt", "llms-full.txt (tam katalog)"], ["/feed/google.xml", "Google Merchant ürün feed'i"], ["/blog/rss.xml", "Blog RSS"]].map(([h, l]) => (
                    <li key={h}><a className="text-link" href={h} target="_blank">{l}</a> <span className="text-mute">{h}</span></li>
                  ))}
                </ul>
                <p className="mt-2"><Link href="/admin/seo" className="font-bold text-link">SEO sağlık kontrolü →</Link></p>
              </div>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </>
  );
}
