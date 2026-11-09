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
  const legalOk = legal.length >= 3 && legal.filter((x) => ["mesafeli-satis-sozlesmesi", "on-bilgilendirme-formu", "kvkk-aydinlatma-metni"].includes(x.slug)).every((x) => !x.content.includes("Bu metin örnektir"));
  const steps = [
    { done: !!(s.store.legalName && !s.store.legalName.startsWith("[") && s.store.phone && s.store.address && s.store.etbis), title: "Mağaza bilgileri", desc: "Unvan, adres, telefon, WhatsApp, vergi no, MERSİS ve ETBİS. Footer ve sözleşmelerde kullanılır.", href: "/admin/ayarlar?t=magaza", time: "3 dk" },
    { done: !!(s.payment.iyzicoApiKey && s.payment.iyzicoSecretKey), title: "Ödeme altyapısı (iyzico)", desc: "iyzico panelinden API ve gizli anahtarı yapıştır, 'Bağlantıyı test et' de. Havale için IBAN ekle.", href: "/admin/ayarlar?t=odeme", time: "5 dk" },
    { done: s.shipping.carriers.length > 0 && (s.shipping.pickupEnabled ? !!s.shipping.pickupAddress : true), title: "Kargo ve teslimat", desc: "Kargo firmaları, ücret kuralı, aynı gün kargo saati ve showroom teslim adresi.", href: "/admin/ayarlar?t=kargo", time: "2 dk" },
    { done: c.n > 0 && p.n > 0, title: "Kategori ve ilk ürünler", desc: `${c.n} kategori, ${p.n} yayında ürün. CSV ile toplu yükleyebilirsin.`, href: "/admin/urunler", time: "—" },
    { done: legalOk, title: "Sözleşmeler ve KVKK", desc: "Mesafeli satış, ön bilgilendirme ve KVKK metinlerini şirket bilgilerinle güncelle (hukukçuya kontrol ettir).", href: "/admin/sayfalar", time: "10 dk" },
    { done: u.n > 1, title: "Ekibini davet et", desc: "Satış, depo ve servis için hesap aç; her biri sadece kendi işini görür.", href: "/admin/ekip", time: "2 dk" },
    { done: !!(s.integrations.gaMeasurementId || s.integrations.notifyEmail), title: "Bildirim ve analitik (isteğe bağlı)", desc: "Yeni sipariş e-postası, Google Analytics ve Meta Pixel.", href: "/admin/ayarlar?t=entegrasyon", time: "3 dk" },
  ];
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
                </span>
                <span className="text-xs whitespace-nowrap text-mute">{x.time}</span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-3 border-t border-line p-5">
          <p className="text-sm text-mute">{count < 5 ? "İlk 5 adım tamamlanmadan satışa açman önerilmez." : "Hazırsın!"}</p>
          {s.setup.completed ? (
            <ActionButton variant="outline" run={completeSetup.bind(null, false)}>Listeyi yeniden aç</ActionButton>
          ) : (
            <ActionButton run={completeSetup.bind(null, true)} confirmText={count < 5 ? "Bazı önemli adımlar eksik. Yine de kurulumu bitir?" : undefined}>Kurulumu tamamla</ActionButton>
          )}
        </div>
      </Card>
    </>
  );
}
