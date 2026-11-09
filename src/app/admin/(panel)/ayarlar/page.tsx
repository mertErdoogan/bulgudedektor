import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Card, CardHeader, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { saveIntegrations, savePayment, saveSeo, saveShipping, saveStore, testIyzico } from "./actions";

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
              <Field label="Tahmini teslim süresi"><Input name="deliveryEstimate" defaultValue={s.shipping.deliveryEstimate} placeholder="1–3 iş günü" /></Field>
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
              <p className="mt-2 font-bold md:col-span-2">Diğer</p>
              <Field label="WhatsApp Business API token"><Input name="whatsappApiToken" defaultValue={mask(s.integrations.whatsappApiToken)} autoComplete="off" /></Field>
              <Field label="Kargo entegrasyonu API anahtarı"><Input name="cargoApiKey" defaultValue={mask(s.integrations.cargoApiKey)} autoComplete="off" /></Field>
              <Field label="e-Fatura / e-Arşiv sağlayıcı"><Input name="eInvoiceProvider" defaultValue={s.integrations.eInvoiceProvider} placeholder="Paraşüt, Logo, Uyumsoft…" /></Field>
              <Field label="e-Fatura API anahtarı"><Input name="eInvoiceApiKey" defaultValue={mask(s.integrations.eInvoiceApiKey)} autoComplete="off" /></Field>
              <SubmitButton className="md:col-span-2 md:justify-self-start">Kaydet</SubmitButton>
            </ActionForm>
          </Card>
        ) : null}
        {tab === "seo" ? (
          <Card>
            <CardHeader title="Arama motoru" description="Ana sayfa başlığı ve açıklaması. Ürün ve kategori SEO'su kendi sayfalarında." />
            <ActionForm action={saveSeo} className="flex flex-col gap-4 p-5">
              <Field label="Site başlığı"><Input name="title" defaultValue={s.seo.title} /></Field>
              <Field label="Site açıklaması"><Textarea name="description" defaultValue={s.seo.description} /></Field>
              <p className="text-sm text-mute">Site haritası: <a className="text-link" href="/sitemap.xml" target="_blank">/sitemap.xml</a> · robots: <a className="text-link" href="/robots.txt" target="_blank">/robots.txt</a></p>
              <SubmitButton className="self-start">Kaydet</SubmitButton>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </>
  );
}
